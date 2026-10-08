# sparsh

sparsh is a small interaction safety layer for web apps. It checks whether an interactive target
is still the thing the user intended to activate after the interface changes, and can stop a
suspicious activation before it commits.

## Is it worth adding?

That depends on the cost and the value of preventing accidental activations in your app. sparsh is
designed to keep its work on the interaction path small, but we should use benchmark results—not
the word “lightweight”—to make the cost clear. The performance figures below are targets and
measurement plans, not measured results.

## Performance

### Measurement commands

Run correctness checks with `pnpm test` and `pnpm e2e`. Run the report-only performance fixture
and package size report with `pnpm bench`. The benchmark command builds the four packages, reports
their ESM entry size before and after gzip, then runs a Chromium fixture at `/performance/`.

The interaction fixture warms up and times batches of 100 equivalent pointerdown, pointerup, and
click dispatches against an unguarded target and a guarded target. It reports the per-dispatch
median and p95, plus the difference between those summaries. The observer fixture retains 30 live
rows from a 10,000-row virtualized data set and measures the DOM insertion plus MutationObserver
callback for 30-row replacement batches. Browser measurements are diagnostic and depend on the
machine and browser used; they are not a CI timing gate or an end-to-end app latency guarantee.

### Local benchmark results

Measured with `pnpm bench` on Chromium 153.0.8010.12 (Playwright browser; user agent reports
Windows 10), with 5,000 measured activations after 500 warmups:

| Measurement | Unguarded | Guarded | Added |
| --- | ---: | ---: | ---: |
| Interaction dispatch median | 0.007–0.011 ms | 0.043–0.045 ms | 0.032–0.038 ms |
| Interaction dispatch p95 | 0.015–0.019 ms | 0.064–0.071 ms | 0.045–0.056 ms |
| 30-row insertion + observer callback median | — | 0.100–0.200 ms | — |
| 30-row insertion + observer callback p95 | — | 0.200–0.800 ms | — |

Package ESM entry sizes from the same run:

| Package | Raw | Gzip |
| --- | ---: | ---: |
| `@sparsh/core` | 7,982 bytes | 2,308 bytes |
| `@sparsh/dom` | 12,646 bytes | 3,243 bytes |
| `@sparsh/react` | 3,752 bytes | 1,186 bytes |
| `@sparsh/vue` | 3,840 bytes | 1,308 bytes |

The browser fixture uses synthetic DOM event dispatch and reports the incremental synchronous
handling cost, not end-to-end input-to-paint latency. Package figures are individual ESM entry
files before application bundling or tree-shaking; they are not the total size of a consumer's
download.

### Metrics

| Area | Metric | Current target or fixture | Status |
| --- | --- | --- | --- |
| Interaction | Added dispatch time per activation | Less than 1 ms | Target; measured by `pnpm bench` |
| DOM observation | Insertion and observer callback time per 30-row batch | Virtualized 10,000-row data set, 30 mounted rows | Measured by `pnpm bench` |
| Download | ESM entry size before and after gzip | `@sparsh/core`, `@sparsh/dom`, `@sparsh/react`, `@sparsh/vue` | Measured by `pnpm bench` |

The latency target covers the work sparsh adds while an activation is evaluated. It does not mean
that every app will gain or lose a measurable millisecond in end-to-end response time; framework,
browser, device, and app work also affect that result. The observer fixture is intended to check
large and frequently updated interfaces. Bundle size should be reported separately because it
affects download and startup, not just interaction handling.

### Why the design should be light

- A guard uses shared listeners at its configured root instead of attaching a listener or
  registering every interactive element individually.
- Decision work happens when an activation occurs, so ordinary pages do not pay policy evaluation
  costs continuously or once per control.
- DOM age tracking stamps added or newly visible nodes as they are observed; it is designed to
  process added nodes rather than repeatedly walk the entire interface.
- The core decision engine has no DOM dependency, and the React and Vue bindings mainly handle
  lifecycle and configuration around the shared browser implementation.

These are design properties, not substitutes for measurements. Real results should include the
tested browser, device or runner, app fixture, enabled policies, and whether the reported number is
a median or a tail percentile. A useful comparison runs the same fixture with and without sparsh.

Keep benchmark results tied to their browser and runner. The under-1-ms figure remains a target
until repeatable measurements demonstrate it; do not present one machine's result as a guarantee
for every application.

## Packages

- `@sparsh/core` — framework-independent decision engine and policy pipeline.
- `@sparsh/dom` — browser event handling and vanilla DOM integration.
- `@sparsh/react` and `@sparsh/vue` — framework bindings.

See the [website](apps/website/README.md) for local development and site commands. The package APIs
and examples are documented in the website's `/docs/` pages.
