# Playwright E2E

`playground-bindings.spec.ts` drives the real `/playground/` page and its live examples. It covers
the inbox reshuffle, late render, and changing button scenarios against both `@sparsh/react` and
`@sparsh/vue`, in report and enforce modes. Each binding also gets a stable-target negative case in
both modes. Start/replay and reset behavior are checked too, including timer cancellation and
restoring the inbox after Leo arrives.

The suite uses real browser pointer input, including a held press for the changing-button case.
It asserts both the instrumentation result and whether the action actually ran, so report mode
must observe without blocking and enforce mode must prevent suspicious activation.

Run it from the repository root with `pnpm e2e`. Playwright builds the website and starts a
production preview on `127.0.0.1:4322`. To run the same suite against Astro's dev server, use
`SPARSH_E2E_DEV=1 pnpm e2e`. Install Chromium first with `pnpm exec playwright install chromium` if
it is not already available.
