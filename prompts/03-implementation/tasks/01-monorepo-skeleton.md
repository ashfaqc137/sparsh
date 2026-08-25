# Task 01 — Monorepo skeleton
Status: not-started
Depends on: —
Package: repo root

## Goal
Stand up the pnpm workspaces monorepo so all later packages have a home, a shared TypeScript baseline, and
a working dependency graph. This is pure scaffolding — no sparsh logic yet.

## Scope
- In: `pnpm-workspace.yaml`, root `package.json`, `tsconfig.base.json`, empty `packages/{core,dom,react}`
  with minimal `package.json` + `tsconfig.json`, `apps/` and `e2e/` placeholders, `.gitignore`, `.npmrc`.
- Out: turbo/changesets/tsup config (T02), lint fence (T03), any source logic.

## Deliverables
- `pnpm-workspace.yaml` with `packages: ["packages/*", "apps/*", "e2e"]`.
- Root `package.json` (private, `"packageManager": "pnpm@..."`, workspace scripts placeholders).
- `tsconfig.base.json` with strict options (`strict`, `noUncheckedIndexedAccess`, `moduleResolution:
  "bundler"`, `target: ES2022`).
- `packages/core/package.json` → name `@sparsh/core` (verify scope availability now; see Notes).
- `packages/dom/package.json` → `@sparsh/dom`, dependency `@sparsh/core: "workspace:*"`.
- `packages/react/package.json` → `@sparsh/react`, deps `@sparsh/core` + `@sparsh/dom` (workspace),
  peerDep `react`.
- Each package: `tsconfig.json` extending base; `src/index.ts` exporting nothing yet (placeholder).
- Project references wired (`tsconfig.base` → per-package references).

## Acceptance
- `pnpm install` succeeds; workspace links resolve (`@sparsh/dom` sees `@sparsh/core`).
- `pnpm -r exec tsc --noEmit` (or `tsc -b`) passes on empty packages.
- Dependency direction is correct: `react → dom → core`, no cycles.

## References
- `../../01-architecture/packages.md` (boundaries, dependency direction)
- `../tooling.md` (stack, layout, exports)
- `../../01-architecture/decisions.md` D1, D3, D18

## Notes
- **Verify `@sparsh` npm scope availability now.** If taken, use unscoped `sparsh` / `sparsh-dom` /
  `sparsh-react` and record it in `decisions.md` (new ADR) + `progress.md`.
- `core/tsconfig.json` will drop the `"DOM"` lib in T03 — leave a TODO marker so it isn't forgotten.
- No default exports anywhere (see `../conventions.md`).
