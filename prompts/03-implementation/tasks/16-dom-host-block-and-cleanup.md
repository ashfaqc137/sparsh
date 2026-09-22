# Task 16 — DOM host: block() + pointer cleanup + visibility re-arm
Status: done
Depends on: T15
Package: dom

## Goal
Complete the `Host`: implement `block()` at the event layer, wire `pointercancel`/`lostpointercapture` as
intent-clearing signals, and finalize visibility arming/disarming. After this, `createDomHost` is a full,
correct `Host`.

## Scope
- In: `block(e)` = capture-phase `preventDefault()` + `stopPropagation()` (never `pointer-events:none`);
  emit cancel/lostcapture as normalized clearing events; visibility (document `visibilitychange` +
  IntersectionObserver) arm/disarm; full `destroy()`.
- Out: vanilla `createGuard` wrapper (T17).

## Deliverables
- `block(e)`: retrieve the native event associated with the normalized event and call `preventDefault()` +
  `stopImmediatePropagation()`/`stopPropagation()` in capture phase so React synthetic + descendant
  handlers never see it. **Do not** touch `pointer-events` (D9).
- Listen for `pointercancel` and `lostpointercapture`; emit normalized events the engine treats as
  intent-clearing (per T05).
- Visibility: on `visibilitychange` hidden ⇒ disarm; on visible ⇒ re-arm. Combine with per-element
  IntersectionObserver re-arm from T15.
- `destroy()`: remove all listeners, disconnect both observers, clear maps. No leaks, no post-destroy
  events.

## Acceptance
- jsdom unit: after `block()`, the event's `defaultPrevented` is true and propagation is stopped; a
  descendant/bubble handler does not fire.
- `pointercancel` mid-press clears intent so the **next** legitimate press is evaluated fresh (allowed).
- `lostpointercapture` clears intent (drag handoff).
- `destroy()` leaves no active listeners/observers; subsequent input produces no decisions.
- (Playwright, T21) blocked activation does **not** fall through to an element underneath.

## References
- `../../02-policies/continuity.md` (cancel/lostcapture lifecycle)
- `../../01-architecture/decisions.md` D9, D10, D13
- Radix #1241 (why not pointer-events)

## Notes
- Blocking must swallow at the event layer only. The whole point of D9 is to avoid converting one
  accidental activation into a different one via transparency.
- Verify `stopImmediatePropagation` vs `stopPropagation` behavior against React 17+ root delegation in the
  demo (T20); pick the one that reliably prevents the synthetic handler.
- **Resolved (verified against real Chromium via Playwright while building the T17 throwaway
  demo, not jsdom):** canceling the `pointerup`/`keydown` event that carries an `activation`-phase
  `ActivationEvent` does **not** stop the browser's own follow-up `click` for real mouse or
  keyboard input — the Pointer Events spec's "cancel pointerdown to suppress compatibility mouse
  events" behavior only applies to non-hovering pointers (touch/pen); a mouse's `click` is its own
  primary event, not a synthesized compatibility one, so it fires regardless. The only reliable,
  cross-pointer-type way to stop the real activation is to cancel the `click` event itself. `block()`
  in `packages/dom/src/host.ts` therefore defers actual cancellation to `click` via a `pendingClick`
  mechanism (armed before emitting the pointerup/keydown activation so a synchronous `block()` call
  can mark it); virtual (`click`-native) activations are still canceled directly. See the doc
  comment on `pendingClick` in `host.ts` for the full explanation, and `host.test.ts` for the
  regression tests.
