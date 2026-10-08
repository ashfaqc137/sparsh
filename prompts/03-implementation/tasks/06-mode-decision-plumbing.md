# Task 06 — Mode / decision plumbing + fail-open
Status: done
Depends on: T05
Package: core

## Goal
Finish the engine's decision layer: per-policy mode resolution, `Decision` construction, the `onDecision`
callback (fires for allow AND block, in report AND enforce), `enforced` computation, and the fail-open
error boundary.

## Scope
- In: mode resolution (`Mode | Partial<Record<PolicyId,Mode>>`), `enforced` logic, `Decision` assembly,
  `neverBlock`/`guardOff` short-circuits, try/catch fail-open.
- Out: policy internals, DOM.

## Deliverables
- Mode resolver: `modeFor(policyId): Mode`, defaulting **all policies to `enforce`** (D21).
- On a policy verdict `allowed:false`: `enforced = modeFor(policy) === 'enforce'`; call `host.block(e)`
  only if `enforced`.
- `onDecision` invoked **every** activation with a fully-populated `Decision` (allowed cases too).
- Short-circuit: `event.neverBlock` or `snapshot.guardOff` ⇒ allowed, no block (may still emit a decision
  with `enforced:false`).
- Fail-open boundary: any throw in snapshot/policy ⇒ treated as `allowed:true`, no block, optional
  decision with a diagnostic reason.

## Acceptance (unit, fake host)
- Default config enforces suspicious policy verdicts; `onDecision` fires for every activation.
- Set one policy to `report`: that policy's untrusted verdicts do not call `host.block`; other policies
  remain enforced.
- `neverBlock` event and `guardOff` target are never blocked, in any mode.
- A policy that throws does not block and does not crash the pipeline (fail open).
- `isGuarded(handle)` reflects the most recent enforced block for that handle.

## References
- `../../01-architecture/core-contract.md` (Decision, invariants)
- `../../01-architecture/decisions.md` D7, D11, D21
- `../conventions.md` (fail open, enforce default)

## Notes
- `onSuspect` is just `onDecision` filtered to `allowed===false`; bindings may add that sugar (not core's
  job).
- Keep the block decision path allocation-light — it's on the interaction path (D19).
