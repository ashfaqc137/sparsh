# sparsh

**sparsh helps prevent a tap from activating the wrong thing when an interface changes under the
user.** A page can shift, a new item can appear, or a control can change while someone is pressing
it. sparsh checks whether the target still matches what the person first interacted with, and can
stop a suspicious activation before it commits.

## What sparsh checks

The browser guard evaluates an activation using four policies:

- **Age:** did the target only recently appear or become available?
- **Continuity:** did the target move or get replaced during the press?
- **Semantics:** did the target’s meaning or enabled state change?
- **Double fire:** did the previous activation reveal a different target beneath a quick follow-up?

Sparsh runs in `enforce` mode by default. Use `report` mode to observe suspicious activations
without stopping them, such as while tuning a policy. Every decision can be observed through the
`onDecision` callback. Keyboard and assistive-technology activations are handled separately, and
Sparsh does not block Escape, focus changes, or scrolling.

## Packages

- `@sparshlabs/core` contains the framework-independent decision engine.
- `@sparshlabs/dom` connects the engine to browser events and also provides a vanilla DOM API.
- `@sparshlabs/react` and `@sparshlabs/vue` provide framework bindings.

Install the integration for your app with npm:

```sh
# Vanilla DOM
npm install @sparshlabs/dom

# React (React is a peer dependency)
npm install @sparshlabs/react

# Vue (Vue is a peer dependency)
npm install @sparshlabs/vue
```

`@sparshlabs/dom` is also the browser integration used by the framework packages and is installed
automatically as a dependency. For a custom host or framework binding, install the engine directly
with `npm install @sparshlabs/core`. Each package is versioned independently; releases use SemVer,
with `0.x` versions while the public APIs settle. Start in `report` mode to observe decisions, then
switch to `enforce` after reviewing the behavior in your app. See the
[website documentation](apps/website/README.md) for APIs, examples, and local development
instructions.

## How it stays lightweight

Sparsh uses shared event listeners at the guard root instead of registering every control. It
evaluates policies when an activation happens, and its DOM age tracking handles newly added or
visible nodes rather than repeatedly walking the entire interface. The framework bindings manage
lifecycle and configuration around the shared browser implementation.

## Performance

Run `pnpm bench` to build the packages, print raw and gzip sizes for each package’s ESM entry, and
run the Chromium performance fixture. Run correctness checks with `pnpm test` and `pnpm e2e`.

### Current measurements

Measured in two benchmark runs on Chromium 153.0.8010.12 (Playwright browser; user agent reports
Windows 10), each with 5,000 measured activations after 500 warmups. The ranges show variation
between the runs on this runner.

| Measurement | Unguarded | Guarded | Added |
| --- | ---: | ---: | ---: |
| Interaction dispatch median | 0.007–0.011 ms | 0.043–0.045 ms | 0.032–0.038 ms |
| Interaction dispatch p95 | 0.015–0.019 ms | 0.064–0.071 ms | 0.045–0.056 ms |
| 30-row insertion + observer callback median | — | 0.100–0.200 ms | — |
| 30-row insertion + observer callback p95 | — | 0.200–0.800 ms | — |

The observer fixture uses a virtualized 10,000-row data set with 30 mounted rows and measures 30-row
replacement batches. The interaction fixture times equivalent synthetic pointerdown, pointerup,
and click dispatches on guarded and unguarded targets. These timings show synchronous handling in
this fixture; they are not end-to-end input-to-paint latency or a guarantee for every app or device.

Package ESM entry sizes from the same runs:

| Package | Raw | Gzip |
| --- | ---: | ---: |
| `@sparshlabs/core` | 7,982 bytes | 2,308 bytes |
| `@sparshlabs/dom` | 12,646 bytes | 3,243 bytes |
| `@sparshlabs/react` | 3,752 bytes | 1,186 bytes |
| `@sparshlabs/vue` | 3,840 bytes | 1,308 bytes |

These are individual package entry files before app bundling or tree-shaking, not the total
download size for a consumer. The project’s performance target is less than 1 ms of added work per
interaction; the fixture results above are diagnostic measurements, not a cross-device benchmark
guarantee.

## Website

`apps/website` is the consumer-facing site and official docs, deployed to Cloudflare Workers. See
[`apps/website/README.md`](./apps/website/README.md) for the build command and deployment settings.

## License

[MIT](./LICENSE)
