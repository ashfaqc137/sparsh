# Task 07 — Input classification & policy gating
Status: done
Depends on: T06
Package: core (gating) — classification *production* is the host's job (T12); this task defines the
contract + gating.

## Goal
Establish how `InputKind` gates which policies run, and implement `Policy.appliesTo(kind)` for each policy
id, so the a11y carve-out is enforced structurally. The **detection heuristics** live in the dom host
(T12); here we define the taxonomy and the routing the engine relies on.

## Scope
- In: `appliesTo` tables per policy; engine gating so Continuity/DoubleFire never evaluate for
  `key`/`virtual`; the `neverBlock` contract for esc/focus/scroll.
- Out: the DOM detection heuristics themselves (T12), individual policy logic (T08–T11).

## Deliverables
- Applicability matrix encoded (see `classification.md`):
  - Age: all kinds. Semantics: all kinds. Continuity: pointer only. DoubleFire: pointer only.
- Engine filters policies by `appliesTo(event.kind)` **before** evaluation.
- Documented contract that the host must set `kind` correctly and must set `neverBlock` for
  esc/focus/scroll (host filters those out entirely; engine defensively honors `neverBlock`).

## Acceptance (unit, fake host)
- A `key` activation never triggers Continuity/DoubleFire evaluation (assert they aren't called).
- A `virtual` activation with no stored intent is allowed and never blocked by Continuity.
- Age and Semantics *do* evaluate for `key`/`virtual`.
- `neverBlock` events bypass all policies.

## References
- `../../02-policies/classification.md` (the whole file)
- `../../01-architecture/decisions.md` D11, D12
- react-aria `usePress.ts` + react-spectrum #3945 (read before T12 detection)

## Notes
- This task is deliberately about **routing**, so the carve-out is guaranteed by construction, not by the
  host remembering to be careful. The host's detection can be wrong and still never break AT users,
  because Continuity structurally can't run without a pointerdown-derived intent.
- Age applying to keyboard (D12) is intentional; it's safe because Age defaults to report.
