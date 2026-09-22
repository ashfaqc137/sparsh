/**
 * Age tracking — perceivability, per `prompts/02-policies/age.md` (D13) and
 * `prompts/03-implementation/tasks/15-dom-host-age-tracking.md`.
 *
 * `ageMs` is time since an element became PERCEIVABLE (visible to the user), not since DOM
 * insertion. Combines:
 *   - a `MutationObserver` that stamps `insertedAt` for newly-added elements (O(added nodes),
 *     never a full-tree walk), and
 *   - an `IntersectionObserver` that stamps `firstVisibleAt` the first time a tracked element
 *     intersects the viewport/root, and re-arms (clears `firstVisibleAt`) when the element leaves
 *     view again, so a later reveal recomputes age from that later moment.
 *
 * A pre-existing element that was never observed (present before the tracker started, and never
 * inserted/mutated since) has no stamp at all ⇒ `ageMs` is `Infinity` — fail open (D7), and
 * AgePolicy allows it. This is deliberate, not a gap: sparsh only needs to catch *newly
 * introduced* targets.
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

  const mutationObserver = new MutationObserver((records) => {
    const now = performance.now()
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (node instanceof Element) track(node, now)
      }
    }
  })
  mutationObserver.observe(rootNodeOf(root), { childList: true, subtree: true })

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
