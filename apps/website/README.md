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
