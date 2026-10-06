# apps/website

Consumer-facing site and the source for sparsh's official product and API documentation. The site
has five routes: `/` introduces the UX philosophy, `/how-it-works/` explains the policies and
accessibility model, `/demo/` hosts the interactive inbox reshuffle, `/playground/` lets visitors
try live React and Vue examples, and `/docs/` contains quick-start guidance, API examples, and current
limitations. Expand the docs as the packages approach their first release.

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
