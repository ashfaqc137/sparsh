# Task 14 — DOM host: snapshot (rect + fingerprint)
Status: done
Depends on: T13
Package: dom

## Goal
Implement `snapshot(handle)` — read the resolved element's `rect` and `fingerprint` cheaply, so Continuity
(rect + identity) and Semantics (fingerprint) can evaluate. `ageMs` is added in T15; this task returns a
placeholder `ageMs` (e.g. `Infinity`) until then.

## Scope
- In: rect read; fingerprint construction (default fields); `guardOff` read; wiring into `TargetSnapshot`.
- Out: `ageMs` computation (T15), blocking (T16).

## Deliverables
- `packages/dom/src/snapshot.ts`:
  - `rect`: from `getBoundingClientRect()` → `{x,y,w,h}`.
  - `fingerprint`:
    - `disabled`: `el.disabled` or `aria-disabled==='true'` or `[disabled]` presence — **always**.
    - `ariaLabel`: `aria-label` (or `aria-labelledby` resolved text if cheap).
    - `role`: computed/explicit role or tagName.
    - `hrefOrValue`: `href` for anchors, `value` for inputs/buttons.
    - `guardKey`: `data-guard-key` from the resolved element (via closest, from T13).
    - `text`: trimmed `textContent` — **populated but marked opt-in**; Semantics only compares it when the
      opt-in flag is set (T09). Consider scoping to a label child to reduce cost/noise.
  - `guardOff`: `data-guard="off"` presence (from T13).
  - `ageMs`: `Infinity` placeholder (real value in T15).

## Acceptance (jsdom unit)
- Rect reflects the element's box; changes when the element is displaced.
- `disabled` true when `disabled`/`aria-disabled` set, false otherwise.
- `guardKey`/`guardOff` reflect the attributes.
- `text` present but Semantics default config ignores it (cross-check with T09).
- Snapshotting is side-effect free and cheap (no layout thrash beyond the single rect read).

## References
- `../../01-architecture/core-contract.md` (`TargetSnapshot`, `Fingerprint`)
- `../../02-policies/semantics.md` (which fields matter, text caveat)
- `../conventions.md` (perf budget)

## Notes
- `getBoundingClientRect` forces layout; call it **once** per snapshot, avoid interleaving reads/writes.
- Keep `text` extraction lazy/scoped — full-subtree `textContent` on large nodes is a perf and noise risk.
