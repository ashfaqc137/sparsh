# Progress

> **Source of truth for status.** Read this right after `README.md`. Update it as the **last step of every
> task** (README working agreement rule #10). If this file ever disagrees with the code, the code wins —
> then fix this file.

## Current focus
`@sparsh/react` (T18–T19) is implemented, tested (vitest + jsdom, 7 tests), builds clean, and typechecks.
`<ActivationGuardProvider>` installs one `createGuard` (from `@sparsh/dom`) per mount via a `display:
contents` wrapper or an explicit `root` prop, in an effect, with SSR-safe rendering (no DOM access during
render) and a "latest ref" pattern so re-renders with stable options never recreate the guard — only a
change to the serialized option set does. `useActivationGuard()` returns `{ ref, isGuarded }`, reactive via
an internal decision pub/sub exposed through context (event-driven, not polling); works standalone without
a provider (no-op, doesn't throw). `<ActivationGuard>` is a thin nested-provider subtree wrapper. All three
component/hook files carry a `'use client'` directive for Next.js App Router/RSC compatibility. The
package's test suite runs against both React 18 (default `test` script, real devDependency) and React 19
(`test:react19` script) — the latter via an isolated `npm install` into `packages/react/.react19/`
(gitignored), set up by `scripts/setup-react19.mjs`; a pnpm-aliased-devDependency approach was tried first
and abandoned because pnpm's workspace-wide peer-dependency hoisting paired `react-dom@19` with the real
`react@18`, crashing at runtime — see that script's doc comment for the full story. Next up: **T20 — Demo
app** (Vite + React, one repro per canonical case, depends on T18/T19) and **T21 — Playwright e2e**.
`apps/storybook-vanilla` (the vanilla/framework-free visual gallery, built ahead of T20) remains as a
framework-free verification tool and will seed the eventual T21 Playwright fixtures; it is not superseded
by the upcoming React demo.

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
| T18 | React `<ActivationGuardProvider>` | E | done |
| T19 | React `useActivationGuard()` + wrapper | E | done |
| T20 | Demo app (repro per case + suspect log) | F | not-started |
| T21 | Playwright e2e (mouse+touch+keyboard) | F | not-started |
| T22 | Docs + changesets + first publish | G | not-started |

## Status legend
`not-started` · `in-progress` · `done` · `blocked`

## Changelog (append newest on top)
- **T18 + T19 done: `@sparsh/react` implemented.** `src/ActivationGuardProvider.tsx` (context +
  effect-mounted `createGuard`, `display: contents` wrapper or explicit `root` prop, "latest ref" pattern
  so stable re-renders don't recreate the guard, SSR-safe), `src/useActivationGuard.ts` (`{ ref, isGuarded
  }`, event-driven via decision pub/sub, no-ops without a provider), `src/ActivationGuard.tsx` (subtree
  wrapper = nested provider), `src/index.ts` barrel. Flat `src/` layout (no separate `context.ts`),
  matching core/dom convention; single shared implementation for React 18 and 19 (no version fork) since
  only the common stable API subset is used. `'use client'` directive added to all three
  component/hook files for RSC/Next.js App Router compatibility. Added `tsconfig.build.json` +
  `tsup.config.ts` fix (tsup's dts bundler needs `composite: false`, same workaround already used by
  core/dom). Test suite (7 tests, vitest + jsdom) runs against React 18 (`test`) and React 19
  (`test:react19`, isolated `npm install` into gitignored `.react19/`, see `scripts/setup-react19.mjs`
  for why pnpm-aliased devDependencies were tried and abandoned). Repo-wide typecheck/lint/build/test all
  clean. No `@sparsh/core`/`@sparsh/dom` changes were needed — T17's `createGuard`/`isGuarded`/`destroy`
  API was already sufficient.
- **Added `LIMITATIONS.md` (repo root).** A user-facing writeup of what sparsh does and does not detect
  today, prompted by an audit of CSS-driven UI changes. Confirms Continuity is transition-mechanism-
  agnostic (it reads live geometry at two instants, so any CSS `transition`/`animation` that displaces or
  swaps the pressed target is caught identically to an instant style change). Documents that Age's
  perceivability clock (`MutationObserver` + `IntersectionObserver`) cannot see paint-only CSS reveals on
  an already-inserted, already-intersecting element — `opacity`, `visibility`, `filter`, `clip-path`,
  `backdrop-filter` — nor occlusion by another element painted on top, since IO is purely geometric and no
  policy reasons about z-order. These were already individually noted in `age.md`'s "known blind spots";
  `age.md` now cross-links to the new doc for the fuller picture (and the previously-undocumented
  `visibility`/`filter`/`clip-path` variants of the same root cause). No code changes — docs only; no
  fix scoped yet for these gaps.
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
  the official React-based T20 demo. Note: the async-settle case uses `aria-disabled` rather than
  the native `disabled` attribute, since a genuinely `disabled` element is inert and dispatches no
  pointer events at all — real apps building this pattern must do the same if they want sparsh to
  be able to intercept a press that started while visually disabled.
- **`apps/scratch-vanilla-demo` removed, replaced by `apps/storybook-vanilla`.** The throwaway demo
  only exercised 2 of 6 canonical cases, and mislabeled its "Case 1" story (it was actually Case 2
  mechanics — a toast pushing the target down via `marginTop`/normal flow reflow, not a true
  occlusion). `apps/storybook-vanilla` is a from-scratch, custom (no `@storybook/*` dependency)
  gallery app: sidebar nav, one section per case with its own deterministic "Arm" trigger, stable
  `data-testid`s on every interactive element for future T21 reuse, global + per-policy mode
  toggles, live `cooldownMs`/`rectThresholdPx` controls (guard is destroyed/recreated on change —
  its options are constructor-time only), and a shared suspect-log panel. Case 1 was split into its
  two real sub-mechanisms per `age.md`/`continuity.md`: **1a** true occlusion (toast absolutely
  positioned over an existing, unmoved button; caught by `AgePolicy`) and **1b** mid-press identity
  swap (toast mounts mid-press at the same coordinates with no reflow; caught by
  `ContinuityPolicy`). Case 3 (late render) materializes a control into a previously-empty slot
  after which the whole press lands on it. Case 5 (list reorder) swaps the underlying `entity` on
  two static DOM rows (one with `data-guard-key`, one without) with **zero DOM mutation**,
  demonstrating both the catch and the documented no-guard-key gap from `semantics.test.ts` rows
  11/12. Case 6 (double-fire) dispatches a synthetic residual pointer+click sequence on the
  newly-exposed element immediately after the real control collapses. **Verification caveat:** this
  sandbox cannot launch a real browser (Playwright's Chromium fails with a missing system library,
  `libnspr4.so`, no root to install — same class of constraint as the existing T21 environment
  note below) — verified via `tsc --noEmit`, `vite build`, `biome check`, and manual cross-checking
  of every DOM id referenced in `src/main.ts` against `index.html` (static + dynamically-created),
  but not yet via actual pointer interaction in a live browser. Re-verify interactively (or via
  Playwright on an unconstrained machine) before relying on this as the T21 fixture.
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
- **D21 applied: enforce mode is now the default.** Core mode resolution defaults omitted and
  unspecified per-policy modes to `enforce`; the vanilla Storybook opens in enforce mode; the website
  playground and its docs describe and select enforce by default. Report remains available explicitly.
  Updated core coverage and the normative contract/decision/policy docs. `git diff --check` passed;
  tests were not run in this task.
- **Playground polish.** The changing-meaning scenario now shows a compact animated spinner beside
  “Please wait…” and uses a standard cursor. Decision reasons format millisecond values as seconds to
  two decimal places, and the React result message uses plain spacing instead of displaying the literal
  `&nbsp;` entity. `git diff --check` passed; tests were not run.
- **Playground code colors.** Added client-side token coloring for the generated JSX and Vue snippets;
  tag names, attributes, strings, keywords, numbers, and punctuation have distinct colors. The snippet
  remains selectable text and updates with the framework/settings. `git diff --check` passed; tests were
  not run.
- **Playground order.** Moved “THE SETUP” above the interactive workbench so the live code example is
  presented before the scenario. `git diff --check` passed; tests were not run.
- **Custom blocked feedback.** Added `onBlocked(element)` to DOM host options and surfaced it through
  React/Vue providers. It replaces the default shake and runs only after an enforced activation is
  canceled; callback errors are ignored. Added DOM timing/error tests and provider callback-forwarding
  tests, and documented the option. DOM, React, and Vue tests passed; package typechecks and Biome
  checks passed.
- **Developer documentation expanded.** `/docs/` is now Getting Started, with separate Core Concepts,
  React API, Vue API, and DOM/vanilla reference pages in a shared navigation shell that can accept
  future framework references. Added policy/mode behavior, callback and type references, lifecycle,
  accessibility and limitations, and Shiki syntax-highlighted code samples. Updated the site README
  and fixed the existing known-limits link. `pnpm --filter website build` passed (Astro check: 0 errors,
  warnings, or hints; all nine routes generated).
