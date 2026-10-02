/**
 * Age tracking — perceivability, per `prompts/02-policies/age.md` (D13) and
 * `prompts/03-implementation/tasks/15-dom-host-age-tracking.md`.
 *
 * `ageMs` is time since an element became PERCEIVABLE (visible to the user), not since DOM
 * insertion. Combines:
 *   - a `MutationObserver` that stamps `insertedAt` for newly-added elements AND any descendants
 *     already attached to them at insertion time (O(nodes actually inserted this batch), not a
 *     walk of the whole document — see `trackSubtree` below for why this recursion is required),
 *     and
 *   - an `IntersectionObserver` that stamps `firstVisibleAt` the first time a tracked element
 *     intersects the viewport/root, and re-arms (clears `firstVisibleAt`) when the element leaves
 *     view again, so a later reveal recomputes age from that later moment, and
 *   - a `disabled`/`aria-disabled` attribute watch (same `MutationObserver`, `attributeFilter`) that
 *     re-arms the clock when an element transitions disabled → enabled. A disabled control cannot be
 *     the realistic target of an accidental activation (it fires no activation events), so the
 *     moment it actually matters is the moment it *becomes* enabled — that's treated as "newly
 *     perceivable now", exactly like a fresh insertion. This also starts tracking a previously
 *     untracked (e.g. pre-existing, page-load-disabled) element the first time it is seen
 *     transitioning to enabled, since that is the first moment it is an eligible target at all.
 *
 * A pre-existing element that was never observed (present before the tracker started, and never
 * inserted/mutated/enabled since) has no stamp at all ⇒ `ageMs` is `Infinity` — fail open (D7),
 * and AgePolicy allows it. This is deliberate, not a gap: sparsh only needs to catch *newly
 * introduced* (or newly-eligible) targets.
 *
 * jsdom does not implement `IntersectionObserver`. When it's unavailable, elements are treated as
 * immediately visible at insertion time (SSR/test-safe fallback) — this makes unit tests
 * deterministic but does NOT prove real perceivability behavior; that's Playwright's job (T21).
 * Known blind spots (documented, not chased): `opacity:0`, elements occluded by another element
 * while still geometrically "intersecting". No per-frame polling is added to close these — would
 * violate the perf budget (D19).
 */

interface AgeRecord {
  insertedAt?: number
  firstVisibleAt?: number
}

export interface AgeTracker {
  /** ms since `el` became perceivable, relative to `now`. `Infinity` if never tracked/seen. */
  ageMs(el: Element, now: number): number
  destroy(): void
}

function rootNodeOf(root: Element | Document): Node {
  return root instanceof Document ? (root.documentElement ?? root) : root
}

export function createAgeTracker(root: Element | Document): AgeTracker {
  const stamps = new WeakMap<Element, AgeRecord>()
  // Iterable companion to the WeakMap — bounded by tracked (added) elements, not the whole tree —
  // needed to re-arm on document visibility restore (T16) since WeakMap can't be iterated.
  const tracked = new Set<Element>()

  const hasIntersectionObserver = typeof IntersectionObserver !== 'undefined'

  const intersectionObserver = hasIntersectionObserver
    ? new IntersectionObserver(
        (entries) => {
          const now = performance.now()
          for (const entry of entries) {
            const rec = stamps.get(entry.target as Element)
            if (rec === undefined) continue
            if (entry.isIntersecting) {
              if (rec.firstVisibleAt === undefined) rec.firstVisibleAt = now
            } else {
              // Re-arm: hidden again resets perceivable time so a later reveal recomputes age.
              rec.firstVisibleAt = undefined
            }
          }
        },
        { root: root instanceof Document ? null : root },
      )
    : undefined

  function track(el: Element, now: number): void {
    if (stamps.has(el)) return
    const rec: AgeRecord = { insertedAt: now }
    stamps.set(el, rec)
    tracked.add(el)
    if (intersectionObserver !== undefined) {
      intersectionObserver.observe(el)
    } else {
      // No IntersectionObserver available — fall back to "visible at insertion".
      rec.firstVisibleAt = now
    }
  }

  // --- disabled → enabled re-arm --------------------------------------------------------------
  // A disabled control fires no activation events, so it can never be the target of an
  // accidental activation while disabled — the moment that actually matters is the moment it
  // *becomes* enabled. Re-arming here (not just watching insertion/visibility) catches the
  // realistic case: a button disabled at mount/page-load, enabled moments before an in-flight
  // press lands.
  function isDisabledAttr(el: Element): boolean {
    return el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true'
  }

  // Only one of the two attributes changes per MutationRecord — reconstruct the combined
  // disabled-ness *before* that single change using the record's `oldValue` for the changed
  // attribute and the element's *current* value for the other (unchanged) attribute.
  function wasDisabledBefore(el: Element, record: MutationRecord): boolean {
    if (record.attributeName === 'disabled') {
      return record.oldValue !== null || el.getAttribute('aria-disabled') === 'true'
    }
    // attributeName === 'aria-disabled'
    return el.hasAttribute('disabled') || record.oldValue === 'true'
  }

  function rearmAsNewlyPerceivable(el: Element, now: number): void {
    const rec = stamps.get(el)
    if (rec === undefined) {
      // Previously untracked (e.g. pre-existing, page-load-disabled) — this enable is the first
      // moment it's an eligible target at all, so start tracking it fresh, same as an insertion.
      track(el, now)
      return
    }
    rec.insertedAt = now
    // If currently intersecting (firstVisibleAt already stamped), reset that stamp to now too —
    // the enable is the new "became perceivable" moment. If not currently intersecting, leave
    // undefined; the next IntersectionObserver entry will stamp it when it actually comes into
    // view.
    if (rec.firstVisibleAt !== undefined) rec.firstVisibleAt = now
  }

  // A `MutationObserver` only reports a node as "added" at the point it joins an observed tree —
  // it does NOT re-report descendants that were already attached to that node beforehand (the
  // extremely common "build the whole subtree off-document, then append once" pattern, e.g. a
  // toast built with its own button before a single `container.appendChild(toast)`). Without
  // walking the newly-added node's existing subtree here, every interactive descendant built this
  // way would never get an `insertedAt` stamp and would silently read back as `ageMs: Infinity`
  // (fail-open), defeating AgePolicy for exactly the insertion shape it exists to catch. Bounded
  // by the size of the subtree actually inserted this batch, not the whole document tree.
  function trackSubtree(el: Element, now: number): void {
    track(el, now)
    for (const descendant of el.querySelectorAll('*')) {
      track(descendant, now)
    }
  }

  const mutationObserver = new MutationObserver((records) => {
    const now = performance.now()
    for (const record of records) {
      if (record.type === 'attributes') {
        const el = record.target
        if (!(el instanceof Element)) continue
        const wasDisabled = wasDisabledBefore(el, record)
        const isDisabled = isDisabledAttr(el)
        if (wasDisabled && !isDisabled) rearmAsNewlyPerceivable(el, now)
        continue
      }
      for (const node of record.addedNodes) {
        if (node instanceof Element) trackSubtree(node, now)
      }
    }
  })
  mutationObserver.observe(rootNodeOf(root), {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['disabled', 'aria-disabled'],
    attributeOldValue: true,
  })

  function onVisibilityChange(): void {
    if (document.hidden) return
    // Tab restored to foreground: any element currently intersecting re-arms from now, so
    // background time isn't counted as "perceived" time.
    const now = performance.now()
    for (const el of tracked) {
      const rec = stamps.get(el)
      if (rec !== undefined && rec.firstVisibleAt !== undefined) {
        rec.firstVisibleAt = now
      }
    }
  }
  document.addEventListener('visibilitychange', onVisibilityChange)

  return {
    ageMs(el: Element, now: number): number {
      const rec = stamps.get(el)
      if (rec === undefined) return Number.POSITIVE_INFINITY
      const perceivableAt =
        rec.firstVisibleAt !== undefined
          ? Math.max(rec.firstVisibleAt, rec.insertedAt ?? rec.firstVisibleAt)
          : rec.insertedAt
      if (perceivableAt === undefined) return Number.POSITIVE_INFINITY
      return now - perceivableAt
    },
    destroy(): void {
      mutationObserver.disconnect()
      intersectionObserver?.disconnect()
      document.removeEventListener('visibilitychange', onVisibilityChange)
      tracked.clear()
    },
  }
}
