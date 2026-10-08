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

### What we intend to measure

| Area | Metric | Current target or fixture | Status |
| --- | --- | --- | --- |
| Interaction | Added decision-path latency per interaction | Less than 1 ms | Target; benchmark results not published yet |
| DOM observation | Cost of tracking newly added and visible content | Virtualized 10,000-row interface | Fixture planned; results not published yet |
| Download | Compressed JavaScript added by the selected Sparsh packages | Report package and gzip sizes | Not yet measured |

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

### What would make the answer convincing

Publish before-and-after interaction timings, observer measurements on the virtualized fixture,
and compressed bundle sizes for the packages a consumer installs. Keep the under-1-ms figure
identified as a target until repeatable measurements demonstrate it, and avoid presenting one
machine's result as a guarantee for every application.

## Packages

- `@sparsh/core` — framework-independent decision engine and policy pipeline.
- `@sparsh/dom` — browser event handling and vanilla DOM integration.
- `@sparsh/react` and `@sparsh/vue` — framework bindings.

See the [website](apps/website/README.md) for local development and site commands. The package APIs
and examples are documented in the website's `/docs/` pages.
