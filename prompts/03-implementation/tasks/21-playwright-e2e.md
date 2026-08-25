# Task 21 — Playwright e2e: real input, per case + negatives
Status: not-started
Depends on: T20
Package: e2e (+ apps/demo fixture)

## Goal
Prove sparsh works with **genuine input**, driven through Playwright's real `mouse`, `touchscreen`, and
keyboard APIs against the demo. This is the non-negotiable deliverable — a guard that silently stops
working is worse than none. **Touch is asserted independently for every scenario, never inferred from
mouse** (the crbug 40067456 trap).

## Scope
- In: one positive scenario per case (1–6) × {mouse, touch, keyboard where applicable}; the full negative
  suite; report-mode assertions; the perf-budget measurement.
- Out: unit tests (those live with each policy task).

## Deliverables
- Playwright projects for **mouse**, **touch** (real `touchscreen`, webkit + chromium), and **keyboard**.
- Per case (1–6): assert the accidental activation is **blocked in enforce mode** and **reported but
  executed in report mode**.
  - **Touch asserted separately** for every case via `page.touchscreen` — not derived from the mouse test.
- Keyboard: `Tab` + `Enter` into a freshly-rendered control ⇒ governed by Age/Semantics only, flagged in
  report; and **works normally after the window** — never permanently blocked.
- **Negative suite (weighted equal to positives):**
  - unhurried deliberate presses on stable controls ⇒ allowed,
  - rapid-but-legitimate repeat clicks ⇒ allowed,
  - drag-then-release-off-target ⇒ behaves as unguarded,
  - scroll-cancels-press ⇒ behaves as unguarded,
  - pre-existing (static) elements ⇒ never blocked.
- Report-mode assertion: `onDecision`/suspect-log fires **and** the action still executes.
- Screen-reader smoke test: documented manual checklist (NVDA/VoiceOver) — one virtual-click activation
  inside a guarded tree works.
- **Perf budget check (D19):** measure added latency/interaction (< 1ms target) and observer background
  cost under a virtualized 10k-row fixture; wire as a CI gate that blocks on regression.

## Acceptance
- All positive + negative scenarios green on **mouse AND touch AND keyboard** projects.
- No scenario relies on mouse to infer touch behavior.
- Perf gate runs and reports numbers; regression fails CI.
- Report-mode tests confirm zero blocking + instrumentation firing.

## References
- `../../04-verification/testing-strategy.md` (the authoritative test plan)
- `../../00-context/prior-art.md` (why touch independence)
- `../../01-architecture/decisions.md` D19

## Notes
- Flakiness is the enemy: use the demo's deterministic "arm" triggers; assert against explicit timing
  relative to `cooldownMs`.
- Webkit's touch behavior differs from chromium — run touch on both if feasible.
- The negative suite is what stops a false-positive regression from shipping; treat failures there as
  severe.
