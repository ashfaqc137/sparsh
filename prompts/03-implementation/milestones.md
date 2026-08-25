# Milestones & task ordering

This is the **source of truth for scope and order**. The finer-grained work orders live in `tasks/`.
`progress.md` tracks status against these IDs.

## Phases

- **Phase A — Foundation** (T01–T03): monorepo, tooling, the DOM-free fence.
- **Phase B — Core engine** (T04–T06): types/ports, engine, wiring. Pure, no DOM.
- **Phase C — Policies** (T07–T11): classification + the four policies, unit-tested against a fake host.
- **Phase D — DOM host** (T12–T17): the real browser host + vanilla entry.
- **Phase E — React binding** (T18–T19): provider + hook.
- **Phase F — Proof** (T20–T21): demo app + Playwright real-input suite.
- **Phase G — Release** (T22): docs, changesets, first publish.

## Dependency graph

```
T01 ─▶ T02 ─▶ T03
                │
                ▼
T04 ─▶ T05 ─▶ T06
                │
                ▼
T07 ─▶ (T08, T09, T10, T11)        # classification first, then policies (parallelizable)
                │
                ▼
T12 ─▶ T13 ─▶ T14 ─▶ T15 ─▶ T16 ─▶ T17
                │
                ▼
T18 ─▶ T19
                │
                ▼
T20 ─▶ T21
                │
                ▼
T22
```

## Task index (finer-grained)

| ID | Title | Phase | Depends on |
|---|---|---|---|
| T01 | Monorepo skeleton (pnpm workspaces, base tsconfig) | A | — |
| T02 | Build/test tooling (turbo, changesets, tsup, vitest, playwright, biome) | A | T01 |
| T03 | DOM-free lint fence for `@sparsh/core` | A | T02 |
| T04 | Core types & ports (`core-contract.md` → `.ts`) | B | T03 |
| T05 | Engine skeleton (`createGuard`, per-pointerId state, pipeline) | B | T04 |
| T06 | Mode/decision plumbing + `onDecision` + fail-open wrapping | B | T05 |
| T07 | Input classification (`InputKind`, a11y carve-out gating) | C | T06 |
| T08 | ContinuityPolicy | C | T07 |
| T09 | SemanticsPolicy (`disabled` flagship + fingerprint + `data-guard-key`) | C | T07 |
| T10 | AgePolicy (engine-side rule; host supplies `ageMs`) | C | T07 |
| T11 | DoubleFirePolicy | C | T07 |
| T12 | DOM host: capture-phase listener + event normalization | D | T06 |
| T13 | DOM host: target resolution (`event.target` → interactive element) | D | T12 |
| T14 | DOM host: snapshot — rect + fingerprint reads | D | T13 |
| T15 | DOM host: age tracking (MutationObserver + IntersectionObserver) | D | T14 |
| T16 | DOM host: `block()` + pointercancel/lostpointercapture + visibility re-arm | D | T15 |
| T17 | DOM vanilla entry: `createGuard(root, opts)` | D | T16 |
| T18 | React `<ActivationGuardProvider>` | E | T17 |
| T19 | React `useActivationGuard()` (`ref`, `isGuarded`) + `<ActivationGuard>` | E | T18 |
| T20 | Demo app: one repro per case + live suspect log | F | T19 |
| T21 | Playwright e2e: real mouse + touch + keyboard, per case + negatives | F | T20 |
| T22 | Docs + changesets + first `0.x` publish | G | T21 |

## Notes on parallelism & early value

- **T08 (Continuity) + T09 (Semantics `disabled`) are the near-bulletproof core.** They deliver most of
  the value at near-zero false-positive risk. Prioritize them; they can be enforced early while Age stays
  in report.
- T08–T11 are unit-testable against a **fake host** (no browser) as soon as T07 lands — do this before the
  DOM host exists. The engine's correctness must be provable in Node.
- The demo app (T20) doubles as the Playwright fixture (T21) and README proof — build it to be
  case-toggleable with a live suspect log.
