# Task 11 — DoubleFirePolicy
Status: done
Depends on: T07 (and benefits from T10's age signal)
Package: core

## Goal
Implement the residual/repeat-activation policy for case 6: after an activation collapses the UI, a
subsequent activation on a *different, newly-exposed* element at overlapping coordinates within a short
refractory window is untrusted. Keep it small; validate it's actually needed beyond Age+Continuity.

## Scope
- In: a per-root refractory window; combining recency (time since last committed activation near these
  coords) + novelty (young newly-exposed target); pointer-only.
- Out: general click debounce (explicitly a non-goal); DOM measurement (host).

## Deliverables
- `packages/core/src/policies/double-fire.ts` implementing `Policy` (`id:'doubleFire'`, pointer only).
- Engine support for the minimal state it needs: last-activation `{ time, identity, rect }` per root.
- `evaluate`: if `now - lastActivation.time <= refractoryMs` AND current target identity differs from the
  last AND coordinates overlap AND current target is young ⇒ blocked. Else allowed.
- `refractoryMs` configurable (default: reuse `cooldownMs` or a smaller dedicated value — pick during
  implementation, document it).

## Acceptance (unit, fake host)
- dialog closes on click; residual click on the button underneath (different identity, overlapping coords,
  within window) ⇒ **blocked**.
- rapid legitimate double-click on the **same** stable button ⇒ **allowed** (must not regress — required
  negative test).
- second activation after the refractory window ⇒ **allowed**.

## References
- `../../02-policies/double-fire.md` (normative, incl. non-goals)
- `../../01-architecture/decisions.md` D7

## Notes
- This deliberately overlaps Age/Continuity — it's the temporal-sequence framing. **If the demo/e2e repros
  are already fully covered by Age+Continuity, keep DoubleFire as a thin refractory guard** rather than
  adding complexity. Validate against a real double-fire repro before expanding.
- Never degrade into a debounce; legitimate rapid repeats on the same control must pass.
