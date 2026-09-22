# Progress

> **Source of truth for status.** Read this right after `README.md`. Update it as the **last step of every
> task** (README working agreement rule #10). If this file ever disagrees with the code, the code wins —
> then fix this file.

## Current focus
`@sparsh/core` (T01–T11) is implemented, tested, and builds clean. Next up: **T12 — DOM host: capture
listener + normalization** (the first task in Phase D, `@sparsh/dom`).

## Last decision
See `01-architecture/decisions.md`. Most recent settled items: D12 (Age applies to all input kinds),
D17 (native deferred), D18 (pnpm+turbo+changesets monorepo — task-runner portion superseded by D20),
D20 (turbo removed; plain `pnpm -r` + `tsc -b` instead). Name is **sparsh** (D1). `@sparsh` npm scope
was assumed available and used as-is (not independently re-verified against the npm registry during T01;
revisit before first publish in T22).

Engine-contract extensions made during T04–T11 (documented in `core-contract.md` in the same change):
`Host.onIntentClear` + `IntentClearSignal`, `GuardOptions.refractoryMs` (default 300ms) +
`semanticsTextCheck` (default false), and `PolicyContext.refractoryMs` / `compareText` /
`lastActivation`. These were necessary to make DoubleFire and the opt-in Semantics text check
implementable without hidden module state; see `policy.ts` JSDoc.

## Open blockers / to-confirm
- [ ] `@sparsh` npm scope availability — **not yet verified against the live npm registry**; fall back to
      unscoped `sparsh` / `sparsh-dom` / `sparsh-react` and record an ADR if taken. Do this before T22.
- [ ] `display: contents` provider-root behavior under flex/grid — verify in the demo (**T18/T20**).
- [x] `refractoryMs` value + whether DoubleFire reduces to a thin refractory guard — decided during T11:
      default 300ms, dedicated (smaller than `cooldownMs`). DoubleFire kept as a small, separate policy
      (not reduced to a thin guard) since it's cheap and the temporal-sequence framing is distinct from
      Age; revisit if e2e (T21) shows it's redundant with Age+Continuity in practice.

## Task status

Phases: A Foundation · B Core engine · C Policies · D DOM host · E React · F Proof · G Release.
(Full detail + dependencies in `03-implementation/milestones.md`.)

| ID | Task | Phase | Status |
|---|---|---|---|
| T01 | Monorepo skeleton | A | done |
| T02 | Build/test/release tooling | A | done |
| T03 | DOM-free lint fence | A | done |
| T04 | Core types & ports | B | done |
| T05 | Engine skeleton | B | done |
| T06 | Mode/decision plumbing + fail-open | B | done |
| T07 | Input classification & gating | C | done |
| T08 | ContinuityPolicy | C | done |
| T09 | SemanticsPolicy | C | done |
| T10 | AgePolicy | C | done |
| T11 | DoubleFirePolicy | C | done |
| T12 | DOM host: capture listener + normalization | D | not-started |
| T13 | DOM host: target resolution | D | not-started |
| T14 | DOM host: snapshot (rect + fingerprint) | D | not-started |
| T15 | DOM host: age tracking (perceivability) | D | not-started |
| T16 | DOM host: block() + cleanup + visibility | D | not-started |
| T17 | DOM vanilla entry: createGuard | D | not-started |
| T18 | React `<ActivationGuardProvider>` | E | not-started |
| T19 | React `useActivationGuard()` + wrapper | E | not-started |
| T20 | Demo app (repro per case + suspect log) | F | not-started |
| T21 | Playwright e2e (mouse+touch+keyboard) | F | not-started |
| T22 | Docs + changesets + first publish | G | not-started |

## Status legend
`not-started` · `in-progress` · `done` · `blocked`

## Changelog (append newest on top)
- **Turbo removed (D20).** With only `@sparsh/core` implemented (dom/react still placeholders), turbo's
  caching/orchestration wasn't paying for itself. Deleted `turbo.json`, dropped `turbo` from root
  devDependencies, root scripts now call `pnpm -r run build`/`pnpm -r run test`/`tsc -b tsconfig.json`
  directly (`pnpm -r` already runs in topological order; `tsc -b` already orders typecheck via project
  references). Added `tsup.config.ts` to `packages/{dom,react}` (previously missing, which only surfaced
  once `pnpm -r run build` was exercised directly) and `--passWithNoTests` to their `test` scripts (no
  test files yet). D18 annotated as partially superseded; D20 added. Re-ran `pnpm install` (lockfile no
  longer references turbo), full build/typecheck/lint/test suite verified green across all packages.
- **T01–T11 complete.** Monorepo (pnpm + turbo + changesets + tsup + vitest + biome) scaffolded;
  `packages/{core,dom,react}` created (dom/react are placeholders — real work starts at T12/T18).
  `@sparsh/core` fully implemented: types/ports (`types.ts`, `host.ts`, `policy.ts`, `decision.ts`),
  engine (`engine.ts` — intent lifecycle, mode resolution, fail-open, `onDecision`, `isGuarded`), and all
  four policies (`policies/{continuity,semantics,age,double-fire}.ts`). 37 vitest unit tests cover the
  full decision table from `04-verification/testing-strategy.md` (rows 1, 3–24) against a fake host
  (`test/fake-host.ts`). `pnpm exec tsc -b`, `pnpm run typecheck:core-fence`, `pnpm exec biome check .`,
  `pnpm --filter @sparsh/core exec vitest run`, and `pnpm --filter @sparsh/core build` all pass clean.
  Core builds ESM+CJS+d.ts via tsup (a separate non-composite `tsconfig.build.json` works around a
  tsup/rollup-plugin-dts incompatibility with `"composite": true`). Engine-contract extensions
  documented above and mirrored into `core-contract.md` in the same change.
- _(previous)_ — documentation scaffold created under `prompts/`; old `PLAN.md` removed.
