# Progress

> **Source of truth for status.** Read this right after `README.md`. Update it as the **last step of every
> task** (README working agreement rule #10). If this file ever disagrees with the code, the code wins —
> then fix this file.

## Current focus
`@sparsh/dom` (T12–T17) is implemented, tested, builds clean, and has been validated end-to-end
against a real browser (not just jsdom). Next up: **T18 — React `<ActivationGuardProvider>`**
(Phase E). A throwaway (non-T20) vanilla demo exists at `apps/scratch-vanilla-demo` as a lightweight
integration smoke test for `core`+`dom` ahead of the official React-based T20 demo.

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
- [ ] **T21 (Playwright e2e) environment note:** this sandbox is openSUSE Tumbleweed without root/sudo.
      `zypper install` needs root, but `zypper download <pkg>` does not — it fetches rpms into
      `~/.cache/zypp/packages` without installing. Chromium (downloaded via `playwright install
      chromium`) needed ~30 shared libs not present on this box (nspr/nss incl. `libfreeblpriv3.so`,
      atk/atk-bridge, cairo, pango, drm/gbm, the individual `libxcb-*` extension libs, fontconfig +
      an actual font package (`dejavu-fonts`) with a custom `fonts.conf`, etc.) — resolved one at a
      time via `zypper download` + `rpm2cpio | cpio -idm` into a scratch dir, then
      `LD_LIBRARY_PATH=<dir>/usr/lib64 FONTCONFIG_PATH=<dir>/fc chromium ...`. This is host-specific,
      not a repo concern — T21 should not assume it; CI/other dev machines likely won't need it.

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
| T12 | DOM host: capture listener + normalization | D | done |
| T13 | DOM host: target resolution | D | done |
| T14 | DOM host: snapshot (rect + fingerprint) | D | done |
| T15 | DOM host: age tracking (perceivability) | D | done |
| T16 | DOM host: block() + cleanup + visibility | D | done |
| T17 | DOM vanilla entry: createGuard | D | done |
| T18 | React `<ActivationGuardProvider>` | E | not-started |
| T19 | React `useActivationGuard()` + wrapper | E | not-started |
| T20 | Demo app (repro per case + suspect log) | F | not-started |
| T21 | Playwright e2e (mouse+touch+keyboard) | F | not-started |
| T22 | Docs + changesets + first publish | G | not-started |

## Status legend
`not-started` · `in-progress` · `done` · `blocked`

## Changelog (append newest on top)
- **T12–T17 complete: `@sparsh/dom` (the browser host).** Implemented `resolve.ts` (T13: interactive
  target resolution incl. bare-`Text`-node fallback, `data-sparsh-off`/`data-guard-key` helpers),
  `age.ts` (T15: `MutationObserver` + `IntersectionObserver`-based perceivability tracking with a
  graceful no-`IntersectionObserver` fallback, `document.visibilitychange` re-arm), `snapshot.ts`
  (T14: fingerprint + rect), and `host.ts` (T12+T16: one capture-phase listener per event type on
  `root`, pointer-type classification, `block()`, cleanup). `index.ts` (T17) exposes vanilla
  `createGuard(root, opts)` wiring `createDomHost` + `core.createGuard`. 46 new jsdom-based vitest
  tests (`packages/dom/test/*`); full monorepo `typecheck`/`typecheck:core-fence`/`lint`/`test`/`build`
  all green (37 core + 46 dom tests).
  **Critical fix found via real-browser (Playwright/Chromium) verification, not reasoning:** the
  original `block()` implementation canceled the native `pointerup`/`keydown` event carrying an
  `activation`-phase `ActivationEvent`, on the assumption this would suppress the browser's
  following `click`. Verified against real Chromium that this is **false** for real mouse input —
  canceling `pointerdown`/`pointerup`/`mousedown` does not stop `click`; the Pointer Events spec's
  compatibility-event suppression only applies to touch/pen, not mouse (whose `click` is its own
  primary event). Fixed by deferring actual cancellation to the `click` event itself via a
  `pendingClick` mechanism in `host.ts` (armed before emitting, so a synchronous `block()` call
  during the engine's `onActivationEvent` callback can mark it; the real `preventDefault`/
  `stopImmediatePropagation` happens in `onClick`). Re-verified end-to-end against the actual built
  `@sparsh/dom` package with a real Chromium mouse press+release: blocked activations now correctly
  suppress the real click handler (`clicks: 0`); allowed activations still pass through untouched
  (`clicks: 1`). See the `pendingClick` doc comment in `host.ts`, the updated Notes section in
  `03-implementation/tasks/16-dom-host-block-and-cleanup.md`, and the new regression tests in
  `host.test.ts`. A throwaway (explicitly not T20) vanilla demo, `apps/scratch-vanilla-demo`, was
  added as a workspace member — a lightweight integration smoke test exercising `core`+`dom`
  together (interstitial + async-settle cases, report/enforce toggle, live decision log) ahead of
  the official React-based T20 demo. Note: `apps/scratch-vanilla-demo` uses `aria-disabled` rather
  than the native `disabled` attribute for its async-settle case, since a genuinely `disabled`
  element is inert and dispatches no pointer events at all — real apps building this pattern must do
  the same if they want sparsh to be able to intercept a press that started while visually disabled.
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
