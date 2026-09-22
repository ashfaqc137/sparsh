# Task 13 — DOM host: target resolution
Status: done
Depends on: T12
Package: dom

## Goal
Resolve a raw event target (often a text node or nested `<span>`) to the **interactive element** the user
meant to activate, and produce a stable `TargetHandle` + identity for it. Every policy's correctness
depends on resolving to the *same* element at intent and activation.

## Scope
- In: `resolveTarget(raw)` → `TargetHandle | null`; the interactive-element selector strategy; identity
  derivation; `data-guard="off"` / `data-guard-key` discovery via `closest`.
- Out: rect/fingerprint reads (T14), age (T15).

## Deliverables
- `packages/dom/src/resolve.ts`:
  - Given `event.target`, walk up (`closest`) to the nearest activatable element: `button`, `a[href]`,
    `input`, `select`, `textarea`, `[role="button"]`, `[role="link"]`, `[tabindex]`, `[onclick]`-ish, and
    elements with `data-guard-key`. Define the selector set explicitly.
  - Return `null` when nothing activatable is found (engine treats as nothing to guard).
  - `TargetHandle` wraps the resolved `Element` (opaque to core).
  - Identity: the resolved `Element` reference itself is the identity for DOM (stable across time while the
    node lives). Detached/replaced node ⇒ different identity.
  - Discover `data-guard="off"` and `data-guard-key` via `closest` from the resolved element.

## Acceptance (jsdom unit)
- Clicking a `<span>` inside a `<button>` resolves to the `<button>`.
- Clicking bare text inside an `<a href>` resolves to the anchor.
- Clicking non-interactive whitespace resolves to `null`.
- `data-guard="off"` on an ancestor is discovered from a deep child target.
- Two events on the same button resolve to the **same identity**; after React replaces the node, identity
  differs.

## References
- `../../01-architecture/core-contract.md` (`resolveTarget`, `TargetHandle`, identity semantics)
- `../../02-policies/continuity.md` (identity comparison depends on this), `semantics.md` (guardKey/off)

## Notes
- Resolution must be **consistent** between intent and activation, or Continuity will false-positive. Use
  the same selector logic both times.
- Keep the `closest` selector list in one exported constant so tests and future frameworks share it.
- This is the single most correctness-sensitive host function after classification.
