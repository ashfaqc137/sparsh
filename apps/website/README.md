# apps/website

Consumer-facing site and the source for sparsh's official product and API documentation. Product
routes include `/`, `/how-it-works/`, `/demo/`, and `/playground/`. Developer docs live under
`/docs/`: getting started, core concepts, React, Vue, and low-level DOM references. Framework
references are separate pages so future bindings can add focused API documentation.

Built with **Astro** + `@astrojs/react`: the informational pages are static Astro, and the interactive
demo (`src/components/HeroDemo.tsx`) and playground (`src/components/Playground.tsx`) are hydrated
React islands (`client:load`). The playground mounts its Vue example with the real `@sparsh/vue`
binding. Both use workspace packages rather than mocks. Shared navigation and footer live in
`src/layouts/BaseLayout.astro`.

## Scripts

- `pnpm --filter website dev` — local dev server
- `pnpm --filter website build` — `astro check` + production build
- `pnpm --filter website preview` — preview the production build
- `pnpm --filter website typecheck` — `astro check` only
- `pnpm build:website` (run from the repo root) — builds `@sparsh/core`, `@sparsh/dom`,
  `@sparsh/react`, and `@sparsh/vue` first (via `pnpm --filter=website... run build`, which
  resolves the whole workspace dependency graph in topological order), then this site. Use this
  one for a clean checkout / CI / hosting provider build step — `apps/website`'s own `build` script
  assumes the workspace packages are already built, since this site imports their published
  `dist` output (via each package's `exports` field), not their TypeScript source.

## Deployment (Cloudflare Pages)

This site is fully static (`astro.config.mjs` has no SSR adapter) and reads no environment
variables at build time, so it deploys as a plain static asset bundle — no Pages Functions/Workers
runtime needed.

Connect the GitHub repo in the Cloudflare dashboard (**Workers & Pages → Create → Pages → Connect
to Git**) and configure:

| Setting | Value |
| --- | --- |
| Framework preset | `None` |
| Root directory | `/` (repo root — required so pnpm can resolve the workspace) |
| Build command | `pnpm run build:website` |
| Build output directory | `apps/website/dist` |

Cloudflare Pages auto-detects `pnpm-lock.yaml` and respects the root `package.json`'s
`"packageManager"` field via Corepack, so no extra package-manager configuration is needed. Node
version is pinned by the repo root's `.nvmrc`; override it with a `NODE_VERSION` environment
variable in the Pages project settings if you need a different version. No build-time secrets or
environment variables are required.

Every push to the production branch triggers a new deployment; every pull request gets its own
preview URL automatically.
