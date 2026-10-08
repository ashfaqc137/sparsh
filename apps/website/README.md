# apps/website

Consumer-facing site and the source for sparsh's official product and API documentation. Product
routes include `/`, `/how-it-works/`, `/demo/`, and `/playground/`. Developer docs live under
`/docs/`: getting started, core concepts, React, Vue, and low-level DOM references. Framework
references are separate pages so future bindings can add focused API documentation.

Built with **Astro** + `@astrojs/react`: the informational pages are static Astro, and the interactive
demo (`src/components/HeroDemo.tsx`) and playground (`src/components/Playground.tsx`) are hydrated
React islands (`client:load`). The playground mounts its Vue example with the real `@sparshlabs/vue`
binding. Both use workspace packages rather than mocks. Shared navigation and footer live in
`src/layouts/BaseLayout.astro`.

## Scripts

- `pnpm --filter website dev` — local dev server
- `pnpm --filter website build` — `astro check` + production build
- `pnpm --filter website preview` — preview the production build
- `pnpm --filter website typecheck` — `astro check` only
- `pnpm build:website` (run from the repo root) — builds `@sparshlabs/core`, `@sparshlabs/dom`,
  `@sparshlabs/react`, and `@sparshlabs/vue` first (via `pnpm --filter=website... run build`, which
  resolves the whole workspace dependency graph in topological order), then this site. Use this
  one for a clean checkout / CI / hosting provider build step — `apps/website`'s own `build` script
  assumes the workspace packages are already built, since this site imports their published
  `dist` output (via each package's `exports` field), not their TypeScript source.

## Deployment (Cloudflare Workers)

This site is fully static (`astro.config.mjs` has no SSR adapter) and reads no environment
variables at build time, so it deploys as plain static assets — no Worker runtime code needed.
`wrangler.jsonc` declares this via `assets.directory` and has no `main` field.

Connect the GitHub repo in the Cloudflare dashboard (**Workers & Pages → Create → Import a
repository**) and configure:

| Setting | Value |
| --- | --- |
| Root directory | `apps/website` (must point at this app, not the monorepo root — Wrangler's automatic project configuration refuses to run at a workspace root and errors with "detection logic has been run in the root of a workspace") |
| Build command | `cd ../.. && pnpm run build:website` |
| Deploy command | `npx wrangler deploy` (default — reads `assets.directory` from the committed `wrangler.jsonc`) |

Since `wrangler.jsonc` is already committed, Wrangler's automatic project configuration (which
would otherwise try to auto-detect the framework and open a PR adding this file) is skipped
entirely — it only triggers when no Wrangler config file exists.

`wrangler` is pinned as a devDependency in this package's `package.json`; Workers Builds uses that
version rather than whatever `npx` would otherwise resolve. The pinned `wrangler` version requires
Node ≥22, which is why the repo root's `.nvmrc` is set to `22` — override it with a `NODE_VERSION`
environment variable in the project settings only if you also bump the pinned `wrangler` version
accordingly. No build-time secrets or environment variables are required.

Every push to the production branch triggers a new deployment; every pull request gets its own
preview URL automatically.
