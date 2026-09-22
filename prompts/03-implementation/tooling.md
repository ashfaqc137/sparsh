# Tooling

Decision reference: D18 (monorepo), D20 (drop turbo, plain pnpm scripts), D19 (perf budget), D2/D8
(core is DOM-free).

## Stack

| Concern | Choice | Notes |
|---|---|---|
| Package manager | **pnpm** (workspaces) | strict, good hoisting control |
| Task runner | **plain `pnpm -r run <script>`** | pnpm runs recursive scripts in topological (dependency-graph) order natively; no caching layer yet — see D20. Revisit (turbo/nx) once the demo + Playwright graph makes uncached rebuilds slow. |
| Release / versioning | **changesets** | public semver for 3 packages; start at `0.x` |
| Bundler | **tsup** | ESM + CJS + `.d.ts`, per package |
| Unit tests | **vitest** | core in Node (fake host); dom in jsdom |
| E2E / real input | **Playwright** | real `mouse` + `touchscreen` + keyboard; touch asserted independently |
| Lint / format | **biome** (preferred) or eslint+prettier | plus the custom DOM-free fence below |
| TS build graph | **tsconfig project references** (`tsc -b`) | fast typed builds across packages; also gives us cross-package dependency ordering for typecheck without a task runner |

## Workspace layout

```
sparsh/                      (repo root; package name "sparsh" internal, not published)
  pnpm-workspace.yaml        # packages: ["packages/*", "apps/*", "e2e"]
  package.json               # root scripts, devDeps, changesets
  tsconfig.base.json         # shared compiler options
  tsconfig.json              # root project-references file for `tsc -b`
  .changeset/
  packages/
    core/
      package.json           # @sparsh/core, no deps, no "DOM" lib
      tsconfig.json          # extends base; lib WITHOUT "DOM"
      tsconfig.build.json     # non-composite view used only by tsup's dts bundler
      src/
      tsup.config.ts
    dom/
      package.json           # @sparsh/dom, dep: @sparsh/core
      src/
    react/
      package.json           # @sparsh/react, deps: core+dom, peer: react
      src/
  apps/
    demo/                    # Vite + React; repro per case; live suspect log; Playwright fixture
  e2e/                       # Playwright config + specs (or fold into apps/demo)
```

## The DOM-free lint fence for `@sparsh/core` (critical — D8)

Two layers, both required:

1. **tsconfig:** `packages/core/tsconfig.json` sets `"lib": ["ES2022"]` — **no `"DOM"`**. This makes
   `document`, `window`, `Element`, `HTMLElement`, etc. *type errors* in core. This alone catches most
   violations at build time.
2. **lint rule:** a `no-restricted-globals` / `no-restricted-imports` rule (biome or eslint) in `core`
   banning `document`, `window`, `navigator`, `self`, and any DOM lib import. Belt-and-suspenders for
   anything that slips past types (e.g., `globalThis` casts).

A CI check builds `core` in isolation to prove it compiles with no DOM lib. If core ever needs the DOM,
the design is wrong — move the concern behind a `Host` port.

## package.json exports (per package)

Each package ships dual ESM/CJS with types:

```jsonc
{
  "type": "module",
  "exports": {
    ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js", "require": "./dist/index.cjs" }
  },
  "sideEffects": false
}
```

## Scripts (root, plain pnpm — see D20)

```
pnpm build      # pnpm -r run build   (topological order: core → dom → react)
pnpm test       # pnpm -r run test    (vitest across packages)
pnpm e2e        # playwright test
pnpm lint       # biome check + the core fence
pnpm typecheck  # tsc -b  (project references honor the graph)
pnpm release    # changeset version && changeset publish
```

## CI gates (all must pass to release)

- typecheck (incl. core-compiles-without-DOM),
- unit (vitest) — the policy decision table,
- Playwright — **mouse AND touch AND keyboard**, per case,
- perf budget check (D19): < 1ms/interaction on the interaction path + measured observer background cost
  under a virtualized 10k-row fixture. Regression is a **release blocker**.

## npm scope

Target `@sparsh/{core,dom,react}`. **Verify scope availability during Task 01**; if taken, fall back to
unscoped `sparsh` / `sparsh-dom` / `sparsh-react` and record the choice in `decisions.md` + `progress.md`.
