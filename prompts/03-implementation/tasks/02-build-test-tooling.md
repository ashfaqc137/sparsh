# Task 02 — Build / test / release tooling
Status: done
Depends on: T01
Package: repo root + all packages

## Goal
Wire the task runner, bundler, test runners, and release tooling so every package can build, typecheck,
unit-test, and (eventually) publish through a single, cached pipeline.

## Scope
- In: turbo, changesets, tsup (per package), vitest, Playwright bootstrap, biome (or eslint+prettier),
  root scripts.
- Out: the DOM-free lint fence (T03), actual tests/source, demo app internals.

## Deliverables
- `turbo.json` with `build`, `test`, `lint`, `typecheck` pipelines honoring the package graph
  (`dependsOn: ["^build"]`).
- `.changeset/` initialized; changesets config for public access on `@sparsh/*`.
- `tsup.config.ts` per package: ESM + CJS + `.d.ts`, `sideEffects:false`, external peer deps.
- `vitest` config: `core` runs in Node env; `dom` runs in jsdom env.
- Playwright installed with a minimal config (browsers: chromium at least; webkit for touch realism).
- biome config (or eslint+prettier) at root.
- Root scripts: `build`, `test`, `e2e`, `lint`, `typecheck`, `release` (see `../tooling.md`).

## Acceptance
- `pnpm build` produces `dist/` (ESM+CJS+d.ts) for each package.
- `pnpm test` runs vitest across packages (0 tests is fine, exits clean).
- `pnpm typecheck` (`tsc -b`) passes.
- `pnpm lint` runs clean.
- `pnpm changeset` works (can create a changeset).
- turbo cache hits on a second `pnpm build` with no changes.

## References
- `../tooling.md` (full stack + scripts + CI gates)
- `../../01-architecture/decisions.md` D18, D19

## Notes
- Keep `core` build env DOM-free-friendly (env is Node for its vitest).
- Playwright config should be structured to run **mouse, touch, and keyboard** projects separately later
  (T21). Webkit is valuable because touch behavior differs.
- Don't add the perf-budget CI check yet — stub a script placeholder; real measurement lands with T21.
- **Post-implementation update (D20):** turbo was removed shortly after this task was completed — at
  3-package scale (one implemented, two placeholders) its caching/orchestration wasn't paying for
  itself. Replaced with plain `pnpm -r run <script>` (already topological) + `tsc -b` (already ordered
  via project references). See `01-architecture/decisions.md` D20 and `../tooling.md`. The scope/
  deliverables above are kept as-written for history; don't treat the `turbo.json` deliverable as current.
