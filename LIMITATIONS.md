# sparsh — Known Limitations

> sparsh blocks activations on **untrustworthy** UI — a target that was not *perceivable long enough* to
> form intent, or whose *identity/meaning* changed between intent and activation. This document is the
> honest list of what today's implementation (`@sparsh/core` + `@sparsh/dom`) does and does **not** catch.
> Nothing here is a bug — these are either explicit design trade-offs (fail-open, perf budget) or gaps not
> yet scoped as work. If this file and the code ever disagree, the code wins; file an issue.

For the full policy specs this summarizes, see `prompts/02-policies/*.md` and
`prompts/01-architecture/decisions.md` (D13, D14, D15, D19).

---

## The four policies, in one line each

| Policy | Catches | How |
|---|---|---|
| **Continuity** | Target moved or was swapped mid-press | Live `getBoundingClientRect()` + identity compare at press-down vs. press-up |
| **Age** | Target is too new to have been perceived | Time since the target became *perceivable* (DOM insertion + viewport intersection + `disabled`→enabled transition) |
| **Semantics** | Target's meaning changed (e.g. `disabled`→enabled, `aria-label`, `data-guard-key`) | Fingerprint compare at intent vs. activation |
| **DoubleFire** | A second, residual activation lands on a freshly-exposed element right after the first collapsed | Temporal sequence + rect overlap against the last committed activation |

---

## CSS-based changes: what's covered vs. not

This is the most common way real apps introduce the bugs sparsh exists to catch — toasts, skeletons, and
interstitials almost always animate in via CSS. Coverage differs sharply by **which policy** would need to
catch it.

### ✅ Covered — any CSS change that moves/replaces the pressed target

**Continuity** reads live, computed geometry at two discrete instants (press-down, press-up). It does not
know or care *why* the rect changed — a CSS `transition`/`animation` on `transform`, `left`/`top`,
`margin`, `width`/`height`, or an instant inline-style/layout change all produce identical results, because
what's compared is simply "where is this element right now." Covered:

- A button sliding away from under the pointer via a CSS `transition: transform` or `left`/`top` animation.
- A sibling's CSS-animated height/margin pushing the target down mid-press (classic toast-pushes-content
  layout shift).
- A CSS `transition`/`animation` that swaps which element occupies a position (different `identity`).

**Age** correctly handles one specific CSS-driven case: `display: none → block/flex/...` (an element
hidden at mount, later revealed). Insertion time and first-intersection time are tracked independently and
the *later* of the two is used, so "mounted long ago but shown just now" is measured from the reveal, not
the mount. This is by design (see `age.md`, D13).

### ❌ Not covered — purely visual/paint reveals of an already-present, already-laid-out element

The root cause: `@sparsh/dom`'s age tracker (`packages/dom/src/age.ts`) stamps "became perceivable" from
exactly two signals — `MutationObserver` (node **inserted**) and `IntersectionObserver` (geometric
**intersection** with the viewport/root changes). `IntersectionObserver` is a *layout-geometry* API — it
does not know about paint-only CSS properties or stacking/z-order. So:

1. **Opacity reveal** — `opacity: 0 → 1` via `transition`/`animation` on an element already in the DOM and
   already occupying its final layout box. The element has been "intersecting" (geometrically) the whole
   time, so no new timestamp is produced — Age never flags it, even though the user could not have
   perceived it before the fade began.
2. **Visibility reveal** — `visibility: hidden → visible`. Same root cause: `IntersectionObserver` ignores
   `visibility`, so a `hidden` element is still reported as geometrically intersecting.
3. **Other paint-only reveals** that don't change layout geometry or DOM presence: `filter`
   (`blur() → none`), `clip-path`/`mask` revealing previously-clipped content, `backdrop-filter`,
   color/background transitions (e.g. text color matching-then-contrasting with its background).
4. **CSS-animated occlusion** — an overlay that fades/slides in *on top of* a stable, unmoved target.
   Age (and every other policy) only reasons about the **pressed target itself** — its own rect, identity,
   and age — never about what else is painted above it. Whether the occluding element appeared instantly
   or via a CSS transition is irrelevant: this is an architectural gap (no occlusion/z-order detection
   exists), not a transition-specific one. (If the occluding element is itself a freshly-inserted new DOM
   node and *it* is what receives the press — the common toast-over-button case — that **is** caught,
   because the toast's own insertion is tracked normally. The gap is specifically for occlusion that
   doesn't change what DOM node is under the pointer.)
5. **Timing nuance, not a total miss:** for elements that genuinely are newly inserted, Age's clock starts
   at **DOM insertion**, not at **animation/transition completion**. A long CSS entrance animation (e.g. a
   2-second fade) is timed from the moment the node is appended to the DOM, so with a short `cooldownMs`
   and a long animation, the cooldown can elapse before the animation visually finishes. This is consistent
   with the engine's contract (it promises time-since-*present-and-intersecting*, not time-since-
   *animation-complete*) but can surprise teams with slow entrance animations.

### Why these aren't fixed today

- Chasing opacity/visibility would require either per-element computed-style polling (violates the perf
  budget, D19 — "never O(tree), never per-frame") or wiring `transitionend`/`animationend` listeners on
  every tracked element speculatively, which adds cost and complexity for a documented-but-narrower class
  of real-world bugs than the six canonical cases this library targets.
- Occlusion detection in general (not just CSS-driven) would require `elementFromPoint`-style checks or a
  second geometric pass per activation — explicitly out of scope per the Age blind-spots note in
  `age.md` ("acceptable given fail-open... do not add expensive per-frame visibility polling").
- All of the above fail **open** (allow), never closed — consistent with sparsh's core safety property: a
  missed detection is acceptable, a false block is not (see `prompts/README.md` rule #2).

---

## Other known limitations (non-CSS)

For completeness — these are pre-existing, already-documented gaps independent of CSS:

- **List reorder without `data-guard-key` (Semantics, D15).** If the same DOM node is reused for a
  different underlying entity (virtualized/keyed list reorder) with no other observable change, sparsh has
  no signal to detect it unless the app opts in via `data-guard-key`. This is an intentional "honest
  layering" decision, not an oversight — DOM fingerprinting alone cannot see entity identity.
- **`text` fingerprint comparison is opt-in (`semanticsTextCheck`, D14).** Off by default to avoid false
  positives on controls with live text (counters, relative timestamps like "2m ago").
- **Native platforms (Android/iOS/React Native) are out of scope for v1 (D17).** The host-port design
  keeps this possible later without touching `@sparsh/core`.
- **Keyboard/virtual activation only goes through Age + Semantics, never Continuity (D11).** This is
  required for accessibility (keyboard/AT activation has no `pointerdown`), not a gap.

---

## Summary table

| Change | Mechanism | Detected? | Policy |
|---|---|---|---|
| Element moves/resizes mid-press | CSS transition/animation or instant style change | ✅ | Continuity |
| Element swapped for a different one, same position | CSS transition or instant | ✅ | Continuity |
| `display:none` → shown | any | ✅ | Age |
| New element inserted (e.g. toast) and pressed | any | ✅ | Age |
| `disabled`/`aria-disabled` → enabled, same element/position (incl. pre-existing/page-load-disabled) | any | ✅ | Age |
| `opacity: 0→1` reveal, same element, same position | CSS only | ❌ | — (documented gap) |
| `visibility: hidden→visible` reveal | CSS only | ❌ | — (documented gap) |
| `filter`/`clip-path`/`backdrop-filter` reveal | CSS only | ❌ | — (documented gap) |
| Overlay animates on top of a stable, unmoved target (target itself unchanged) | CSS or instant | ❌ | — (architectural: no occlusion detection) |
| List row's underlying entity swapped, no `data-guard-key`, no other change | any | ❌ (by design) | — (opt-in via `data-guard-key`) |

---

*Last updated alongside the `@sparsh/core` + `@sparsh/dom` implementation (T01–T17). If you implement a fix
for any of the ❌ rows above, update this table and the corresponding policy doc in `prompts/02-policies/`
in the same change.*
