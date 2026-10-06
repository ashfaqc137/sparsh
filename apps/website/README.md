# apps/website

Consumer-facing site for sparsh. For now this is **demo-only**: an eye-catching, interactive
React page that conveys the problem sparsh solves (accidental UI activation on
moved/changed/stale targets). Official docs (MDX/content collections) land here later, once the
first release ships — Astro was chosen now specifically so that addition is a natural extension
rather than a framework migration.

Built with **Astro** + `@astrojs/react`: the page itself is static Astro, and the interactive
demo (`src/components/HeroDemo.tsx`) is a single hydrated React island (`client:load`). It
consumes `@sparsh/react` (which wraps `@sparsh/dom`/`@sparsh/core`) as workspace dependencies, so
the demo is always in sync with the real library — never a mock.

## Scripts

- `pnpm --filter website dev` — local dev server
- `pnpm --filter website build` — `astro check` + production build
- `pnpm --filter website preview` — preview the production build
- `pnpm --filter website typecheck` — `astro check` only
