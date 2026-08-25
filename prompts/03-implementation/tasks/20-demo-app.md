# Task 20 — Demo app (one repro per case + live suspect log)
Status: not-started
Depends on: T19
Package: apps/demo

## Goal
A Vite + React app with a toggleable, reproducible instance of **each of the six cases**, wrapped in
`<ActivationGuardProvider>`, with a live suspect log (streaming `onDecision`). It doubles as README proof
and the Playwright fixture (T21).

## Scope
- In: six reproductions, per-policy mode toggles, a suspect-log panel, `data-guard-key`/`data-guard="off"`
  examples, an `isGuarded` "tap again" affordance demo.
- Out: the Playwright specs themselves (T21).

## Deliverables
- `apps/demo/` Vite React app.
- One clearly-labeled, individually-toggleable repro per case:
  1. Interstitial (toast/dialog mounts over target)
  2. Layout shift (content loads above, displaces target)
  3. Late render (control materializes under the aim; down+up both land on it)
  4. Async settle (`disabled`→enabled; label flip)
  5. List reorder (realtime re-sort; rows with and without `data-guard-key`)
  6. Double-fire (UI collapses; residual/repeat event)
- Controls to set global + per-policy `mode` (report/enforce) and `cooldownMs`/threshold.
- Live **suspect log** panel rendering streamed decisions (allowed + blocked, which policy, reason).
- A component demonstrating `useActivationGuard().isGuarded` → "This just changed — tap again."
- Stable `data-testid`s / roles for Playwright.

## Acceptance
- Each case can be triggered deterministically (timers/buttons to arm the mutation), so tests aren't
  flaky.
- In report mode, actions still fire and the suspect log shows the flagged decision.
- In enforce mode (per policy), the accidental activation is prevented **without** falling through to
  something underneath.
- Verify `display:contents` provider root behaves under the demo's flex/grid layouts.

## References
- `../../00-context/problem.md` (the six cases — normative list)
- `../../04-verification/testing-strategy.md` (what the fixture must support)
- `../conventions.md`

## Notes
- Determinism is everything: give each repro an explicit "arm" trigger with known timing so Playwright can
  assert against the cooldown window precisely.
- Include at least one **negative** scenario per surface (a perfectly stable control) so the demo also
  shows zero-friction on correct input.
- This app is the primary living documentation — label cases with their numbers from `problem.md`.
