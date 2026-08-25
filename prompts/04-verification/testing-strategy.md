# Testing strategy

In sparsh, **the tests are the product.** Correctness is entirely about input timing and identity; a guard
that silently stops working is worse than none. This file is the authoritative test plan; tasks T08–T11
(unit) and T21 (e2e) implement it.

## Layer 1 — Unit (Vitest), engine + policies against a fake host

The **decision table is the product.** Cover it exhaustively. Each policy is tested in isolation against
synthesized `ActivationEvent` sequences and scripted `TargetSnapshot`s via the fake host (built in T05).
No browser needed — this proves core correctness in Node.

### The decision table (must all be covered)

| # | Scenario | Expected verdict | Policy |
|---|---|---|---|
| 1 | down then up, same stable element, no move | allow | Continuity |
| 2 | up without down (virtual) | allow (Continuity doesn't run) | Continuity/classify |
| 3 | late-mounted target under stationary pointer, within cooldown | block | Age |
| 4 | same target after cooldown | allow | Age |
| 5 | pre-existing (unseen) element, `ageMs=Infinity` | allow | Age |
| 6 | hidden-then-revealed, age from reveal | block if within cooldown of reveal | Age |
| 7 | `disabled`→enabled between down and up | block | Semantics |
| 8 | rect displaced > threshold between down and up | block | Continuity |
| 9 | identity differs (interstitial swap) between down and up | block | Continuity |
| 10 | `aria-label` meaning change | block | Semantics |
| 11 | `data-guard-key` change (reorder) | block | Semantics |
| 12 | reorder without `data-guard-key`, no other change | allow (documented gap) | Semantics |
| 13 | stable control with live "2m ago" text, default config | allow (no false positive) | Semantics |
| 14 | virtual click (detail=0) | Age+Semantics only; Continuity/DoubleFire skipped | classify |
| 15 | keydown Enter on fresh control within cooldown | Age flags (report); works after window | Age/classify |
| 16 | `pointercancel` mid-press, then fresh legitimate press | fresh press allowed | Continuity lifecycle |
| 17 | `lostpointercapture` (drag handoff) | intent cleared, next press allowed | Continuity lifecycle |
| 18 | residual click on element underneath after collapse | block | DoubleFire |
| 19 | rapid legitimate double-click on same stable button | allow | DoubleFire (non-regression) |
| 20 | `data-guard="off"` target | never blocked, any mode | engine |
| 21 | `neverBlock` (esc/focus/scroll) | never blocked, any mode | engine |
| 22 | policy throws | fail open (allow), no crash | engine |
| 23 | default mode | nothing enforced; `onDecision` fires for all | engine |
| 24 | one policy `enforce`, others `report` | only that policy blocks | engine |

## Layer 2 — Real-input integration (Playwright) — non-negotiable

One scenario **per numbered case** in `00-context/problem.md`, driven through Playwright's genuine `mouse`
and `touchscreen` APIs against the demo app (T20/T21).

- **Touch asserted independently for every scenario, never inferred from mouse.** This is precisely what
  Chromium got wrong (crbug 40067456). Separate Playwright projects for mouse, touch (webkit + chromium),
  keyboard.
- **Keyboard:** `Tab` + `Enter` into a freshly rendered control ⇒ governed by Age/Semantics only, flagged
  in report, and **works normally after the window** — never permanently blocked.
- **Report mode:** assert `onDecision`/suspect-log fires **and** the action still executes.

### Negative tests — as important as positive ones

These stop a false-positive regression (the existential bug) from shipping. Treat failures as severe.

- deliberate unhurried presses on stable controls ⇒ behave exactly as unguarded,
- rapid-but-legitimate repeat clicks ⇒ allowed,
- drag-then-release-off-target ⇒ as unguarded,
- scroll-cancels-press ⇒ as unguarded,
- pre-existing/static elements ⇒ never blocked.

## Layer 3 — Accessibility smoke test (manual, once)

NVDA or VoiceOver activating a control inside a guarded tree. Automation will not catch a broken
virtual-click path. Document as a checklist in T21. Confirm: AT activation is never permanently blocked;
Escape/focus/scroll always work.

## Layer 4 — Performance (D19, release blocker)

- Interaction-path latency: **< 1ms added per interaction**; measure in Playwright, fail CI on regression.
- Background observer cost: measured under a **virtualized 10k-row fixture**; stamping is O(added nodes),
  never O(tree).

## Fixture: the demo app

`apps/demo` (T20) is the single fixture for Layers 2–4 and doubles as README proof. Each of the six cases
is individually toggleable with a **deterministic "arm" trigger** (explicit timing) so tests assert
precisely against the cooldown window and never flake.

## Definition of "verified"

A case is verified only when: its unit rows pass **and** its Playwright scenario passes on **mouse AND
touch AND keyboard** (where applicable) **and** the relevant negative tests pass **and** the perf gate is
green.
