# Task 12 — DOM host: capture listener & event normalization
Status: not-started
Depends on: T06 (engine consumes the host)
Package: dom

## Goal
Begin `@sparsh/dom`'s `Host` implementation: a single capture-phase listener on the root that intercepts
Pointer Events + keydown, classifies `InputKind`, filters out esc/focus/scroll, and emits normalized
`ActivationEvent`s to the engine. This is where the a11y/touch/pointer correctness actually lives.

## Scope
- In: `createDomHost(root, opts)` returning a partial `Host` (`onActivationEvent`, `now`, plus stubs for
  `resolveTarget`/`snapshot`/`block` to be filled in T13–T16); one capture listener; classification
  heuristics; esc/focus/scroll filtering + `neverBlock`.
- Out: target resolution (T13), snapshots (T14), age (T15), blocking/cleanup (T16).

## Deliverables
- `packages/dom/src/host.ts` → `createDomHost`.
- **One** `addEventListener(..., { capture: true })` per event type on `root` (not `document`): `pointerdown`,
  `pointerup`, `click`, `keydown`.
- **No** `mouse*`/`touch*` listeners (D8).
- Classification (`classification.md`): `pointerType` → mouse/touch/pen; `click` with `detail===0` or no
  tracked pointerdown → virtual; Enter/Space keydown → key.
- Per-`pointerId` bookkeeping to later reconcile `click` with its `pointerdown` (real vs virtual).
- Normalize to `ActivationEvent` with correct `phase`/`kind`/`pointerId`/`timeStamp`; set `neverBlock`
  where appropriate; **filter esc/focus/scroll before emitting**.

## Acceptance
- Unit (jsdom): dispatching a `pointerdown` then `pointerup` yields two normalized events with correct
  `phase`/`kind`.
- A `click` with `detail===0` classifies as `virtual`.
- Enter keydown on a button classifies as `key`.
- Escape/scroll never produce a blockable event.
- Exactly one listener per type is attached to `root`.

## References
- `../../02-policies/classification.md`
- `../../01-architecture/decisions.md` D8, D9, D10, D11
- react-aria `usePress.ts` (classification), Radix #1241 (why root, not document)

## Notes
- Read react-aria's classification before writing the heuristics — don't re-derive.
- The engine's carve-out (T07) means even if classification is imperfect, AT users can't be permanently
  blocked — but still aim to classify correctly.
- Keep the listener body lean; it's on the interaction path (D19).
