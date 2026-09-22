# Task 05 — Engine skeleton
Status: done
Depends on: T04
Package: core

## Goal
Implement `createGuard(host, opts)` — the orchestration that subscribes to host events, tracks per-pointer
intent state, runs the policy pipeline at activation, and returns a `Guard` with `destroy()` /
`isGuarded()`. Policies can be stubbed (always-allow) at this stage; the *wiring* is the deliverable.

## Scope
- In: subscription, per-`pointerId` intent map, intent capture on `pointerdown`, clearing on
  cancel/lostcapture, pipeline invocation on activation, `destroy()`.
- Out: real policy logic (T08+), classification gating detail (T07), decision/mode plumbing detail (T06),
  DOM (host is injected).

## Deliverables
- `packages/core/src/engine.ts` — `createGuard`.
- Per-`pointerId` `Map<number, { snapshot: TargetSnapshot; handle: TargetHandle }>` for intent.
- Intent lifecycle: store on intent-phase pointer event; clear on `pointercancel`/`lostpointercapture`
  (host signals these — represent them in the normalized event stream) and after activation.
- Pipeline runner: resolve applicable policies, evaluate in order, first `allowed:false` wins.
- `Guard.destroy()` unsubscribes and clears maps; `Guard.isGuarded(handle)` returns last block state.

## Acceptance
- With stub always-allow policies, every activation is allowed and `onDecision` fires (T06 finalizes
  decision shape, but the call site exists).
- Intent map is populated on down and cleared on up/cancel/lostcapture — unit-tested with a **fake host**.
- `destroy()` removes the subscription; no further decisions fire after destroy.
- No memory growth across many down/up cycles (map cleared each time).

## References
- `../../01-architecture/core-contract.md` (engine responsibilities + invariants)
- `../../02-policies/continuity.md` (intent lifecycle expectations)
- `../conventions.md`

## Notes
- Build a **fake `Host`** test helper now (emits synthesized `ActivationEvent`s, returns scripted
  snapshots). Every policy test (T08–T11) reuses it. This is the backbone of proving correctness in Node.
- Represent `pointercancel`/`lostpointercapture` as normalized events (e.g. a `phase`/`kind` variant or a
  dedicated signal) so the engine stays DOM-free.
