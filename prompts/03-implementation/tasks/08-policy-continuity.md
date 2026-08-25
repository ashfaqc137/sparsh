# Task 08 — ContinuityPolicy
Status: not-started
Depends on: T07
Package: core

## Goal
Implement the in-flight press stability policy: block when the target's identity or position changed
between `pointerdown` and activation. This is the **lowest-false-positive** policy and the first candidate
for enforcement.

## Scope
- In: identity comparison + rect-delta comparison against `rectThresholdPx`; pointer-only applicability;
  fail-open when no intent snapshot.
- Out: DOM reads (host supplies snapshots), Age/Semantics.

## Deliverables
- `packages/core/src/policies/continuity.ts` implementing `Policy` (`id:'continuity'`,
  `appliesTo`=pointer only).
- `evaluate(intent, activation, ctx)`:
  - `intent === undefined` ⇒ allowed (fail open).
  - `activation.identity !== intent.identity` ⇒ blocked (reason: identity change).
  - `rectDelta > ctx.rectThresholdPx` ⇒ blocked (reason: displacement, include px).
  - else allowed.
- `rectDelta` helper (max of |Δx|,|Δy| of origin; optionally size delta).

## Acceptance (unit, fake host — see 04-verification for the full table)
- down→up, same identity, no movement ⇒ **allowed** (happy path, must never false-positive).
- displaced past threshold ⇒ **blocked**.
- identity differs (interstitial swap) ⇒ **blocked**.
- no preceding down ⇒ **allowed**.
- rapid legitimate repeat presses on a stable control ⇒ all **allowed**.
- movement within threshold (sub-pixel jitter) ⇒ **allowed**.

## References
- `../../02-policies/continuity.md` (normative)
- `../../01-architecture/decisions.md` D6 (safe to enforce early), D7

## Notes
- Keep it allocation-free on the hot path.
- Default `rectThresholdPx` small (~4). Expose via `ctx` from `GuardOptions`.
- Do not attempt to catch case 3/4/5 here — those are Age/Semantics. Continuity is one leg of the tripod.
