# Task 15 — DOM host: age tracking (perceivability)
Status: not-started
Depends on: T14
Package: dom

## Goal
Compute `ageMs` as **time since the element became perceivable**, not since DOM insertion (D13). This is
the refinement that makes AgePolicy meaningful. Combine a `MutationObserver` (insertion stamp) with an
`IntersectionObserver` (first-visible), take the later signal, and fail open for unseen elements.

## Scope
- In: `MutationObserver` (childList, subtree) stamping added nodes; `IntersectionObserver` stamping
  first-visible; `becamePerceivableAt` derivation; `ageMs` in `snapshot`; visibility re-arm.
- Out: DoubleFire policy (T11, core), blocking (T16).

## Deliverables
- `packages/dom/src/age.ts`:
  - `WeakMap<Element, { insertedAt?: number; firstVisibleAt?: number }>`.
  - `MutationObserver` on root: for each **added** node (and relevant added subtree roots), stamp
    `insertedAt`. **Never walk the whole tree**; only added nodes.
  - `IntersectionObserver`: observe tracked elements; on first non-zero intersection, stamp
    `firstVisibleAt`; on transition hidden→visible again, **re-arm** (reset perceivable time) per Chromium
    `VisibilityChanged()` semantics.
  - `ageMs(el) = now - max(firstVisibleAt ?? insertedAt, insertedAt)`; if neither known ⇒ `Infinity`.
  - Attribute observation limited to fingerprint attributes, and only for already-tracked elements.
- Wire real `ageMs` into `snapshot()` (replacing the T14 placeholder).

## Acceptance (jsdom + Playwright later)
- A freshly inserted, visible element reports small `ageMs`; after 600ms reports ≥ 600.
- A pre-existing (never-observed) element reports `Infinity` ⇒ AgePolicy allows it.
- An element inserted hidden then revealed reports age from **reveal**, not insertion.
- No full-tree walks occur (assert observer usage / perf).
- Detached elements are GC-eligible (WeakMap), no leak across churn.

## Acceptance (perf — feeds T21/D19)
- Under a virtualized 10k-row fixture, mutation/intersection handling stays within the background budget;
  stamping is O(added nodes), not O(tree).

## References
- `../../02-policies/age.md` (perceivability heuristic + blind spots)
- `../../01-architecture/decisions.md` D13, D19

## Notes
- jsdom does **not** implement `IntersectionObserver` layout — polyfill/mocked in unit; the *real*
  perceivability behavior is proven in Playwright (T21). Do not claim age correctness from jsdom alone.
- Document the known blind spots (`opacity:0`, occlusion). Do **not** add per-frame visibility polling to
  chase them — violates the perf budget.
