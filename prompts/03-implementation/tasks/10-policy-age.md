# Task 10 — AgePolicy
Status: not-started
Depends on: T07
Package: core (engine-side rule; `ageMs` is host-supplied)

## Goal
Implement the perception policy: block activations on targets younger than `cooldownMs`. The engine-side
logic is trivial; the value depends on the host computing `ageMs` as *perceivability* (T15). Age applies to
**all** input kinds (D12) and defaults to **report** mode.

## Scope
- In: the `ageMs >= cooldownMs` rule; applies-to-all; report-by-default reliance.
- Out: how `ageMs` is measured (that's the dom host, T15); DoubleFire's use of the same signal (T11).

## Deliverables
- `packages/core/src/policies/age.ts` implementing `Policy` (`id:'age'`, applies to all kinds).
- `evaluate(_intent, activation, ctx)`:
  - `activation.ageMs >= ctx.cooldownMs` ⇒ allowed.
  - else ⇒ blocked, reason `perceivable ${ageMs}ms < ${cooldownMs}ms`.
- `ageMs === Infinity` (unseen/pre-existing) ⇒ always allowed (fail open).

## Acceptance (unit, fake host)
- age 120ms, cooldown 500 ⇒ **blocked** (verdict); with default report mode, `enforced:false`.
- age 600ms ⇒ **allowed**.
- age `Infinity` (pre-existing element) ⇒ **allowed**.
- `key`/`virtual` activation with young age ⇒ verdict **blocked** but report-mode ⇒ not enforced.
- After cooldown, the same key/virtual activation ⇒ **allowed** (never permanently blocked).

## References
- `../../02-policies/age.md` (normative, incl. perceivability heuristic the host implements)
- `../../01-architecture/decisions.md` D12, D13, D6, D7

## Notes
- Do not bake the perceivability logic into core — core only reads `ageMs`. Keeping it host-side lets the
  heuristic improve without touching the contract.
- The keyboard-within-cooldown flag is intentional and safe *only because* Age defaults to report. Never
  flip Age's default to enforce.
