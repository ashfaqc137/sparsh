# Packages & boundaries

Three published packages under the `@sparsh` scope. Each has a single, defensible reason to exist.

## `@sparshlabs/core`

**Responsibility:** the decision engine, the policy pipeline, the `Host` port interface, and all shared
types. **Contains zero DOM** (enforced by lint fence).

- Exports: everything in `core-contract.md` — `createGuard`, `Guard`, `Host`, `ActivationEvent`,
  `TargetSnapshot`, `Decision`, `Policy`, all unions.
- Ships the four policies as pure functions/objects.
- Depends on: nothing (no runtime deps).
- Testable entirely in Node with a **fake host** — no jsdom needed for engine logic.
- Bundles to ESM + CJS + `.d.ts`.

**Must never:** import `document`, `window`, `navigator`, `Element`, any DOM lib type, or any framework.
The `tsconfig` for core omits the `"DOM"` lib; the lint fence bans DOM globals. If you reach for the DOM
here, the design is wrong — move it behind a port.

## `@sparshlabs/dom`

**Responsibility:** the browser **host** implementing `core`'s ports, plus the vanilla entry point.

- Exports:
  - `createDomHost(root: Element | Document, opts?): Host` — the port implementation.
  - `createGuard(root, opts?): Guard` — convenience that wires `createDomHost` + `core.createGuard`. This
    is the **no-framework / vanilla** API and the reference binding.
- Owns all the genuinely hard DOM logic:
  - one **capture-phase** listener on `root` (not `document`),
  - **target resolution** (`event.target` → interactive element),
  - **rect + fingerprint** reads,
  - **age tracking** (`MutationObserver` insertion stamp + `IntersectionObserver` first-visible),
  - **input classification** production (`InputKind`) — using `event.detail`, `pointerType`, etc.,
  - `pointercancel` / `lostpointercapture` → intent-clearing events,
  - `block()` = `preventDefault()` + `stopPropagation()`,
  - visibility re-arm.
- Depends on: `@sparshlabs/core`.
- Tested with jsdom (unit) + Playwright via the demo (real input).

## `@sparshlabs/react`

**Responsibility:** the first framework binding; the live proof; the ergonomic React surface.

- Exports:
  - `<ActivationGuardProvider mode onDecision cooldownMs ...>` — primary API, app-wide.
  - `useActivationGuard()` → `{ ref, isGuarded }` — per-element escape hatch / block explanation.
  - `<ActivationGuard>` — optional subtree wrapper.
- Provider obtains a root node (via ref on a `display: contents` element, or a `root` prop) and calls
  `createGuard` from `@sparshlabs/dom` in an effect; `destroy()` on cleanup.
- **Hook, not HOC.** The guard needs a real DOM node; an HOC wraps a *component*, forcing `forwardRef` +
  ref-merging that breaks on class components, `memo`, and ref-swallowing third-party components. A hook
  takes the ref directly.
- `data-guard="off"`, `data-guard-key={id}` are plain attributes — no JS needed, read by the dom host.
- Depends on: `@sparshlabs/core`, `@sparshlabs/dom`, `react` (peer).

## `@sparshlabs/vue`

**Responsibility:** the Vue 3 binding; mirrors `@sparshlabs/react`'s surface 1:1, Composition API only.

- Exports:
  - `ActivationGuardProvider` — primary API, app-wide. Same props as React's
    `<ActivationGuardProvider>` (`mode`, `onDecision`, `onSuspect`, `root`, plus the `DomGuardOptions`
    passthrough).
  - `useActivationGuard()` → `{ ref, isGuarded }` — per-element escape hatch / block explanation.
    `isGuarded` is a reactive `Ref<boolean>` (Vue's equivalent of React `useState`).
  - `ActivationGuard` — optional subtree wrapper, same "nested provider" framing as React's.
- Provider calls `createGuard` from `@sparshlabs/dom` in `onMounted`/`onBeforeUnmount`, on a root node
  obtained via a `display: contents` wrapper element or an explicit `root` prop — identical
  lifecycle shape to React's provider.
- Uses Vue's `provide`/`inject` (a typed `InjectionKey`, `GuardKey`) as the structural equivalent
  of React context. Unlike React, `provide()` doesn't need a dedicated wrapper component — it's
  called once in `setup()` and applies to the whole subtree, since `setup()` runs once per
  instance rather than once per render.
- **Composable, not mixin/directive.** Same reasoning as React's "hook not HOC" (D16): the guard
  needs a real DOM node, and a composable can take the ref directly.
- Depends on: `@sparshlabs/core`, `@sparshlabs/dom`, `vue` (peer, `>=3.3`).

**Composition API vs Options API (why only Composition API ships in v1):** the engine/host layer
(`@sparshlabs/core` + `@sparshlabs/dom`) has zero Vue dependency and is identical either way. The
`ActivationGuardProvider`/`ActivationGuard` *components* are also consumed identically by an
Options API app's templates — components don't care how the host app authors its own script
blocks. The one piece that *does* differ is the per-element hook equivalent: `useActivationGuard()`
is a composable and is only callable inside `setup()`/`<script setup>`. An Options API component
cannot call it directly — it would need a parallel surface (e.g. a component `inject: [...]`
option, or a mixin exposing `this.$activationGuard`). That surface is a deliberately deferred,
separate extension, not built in v1.

## `@sparshlabs/angular`

**Responsibility:** the Angular binding; covers the same surface as `@sparshlabs/react`/`@sparshlabs/vue`,
expressed in Angular idiom (directives + DI instead of components + context). Angular 22+.

- Exports:
  - `ActivationGuardDirective` (`[sparshGuard]`) — primary API. The directive's host element *is*
    the guard root, so there's no `display: contents` wrapper and no `root` input. Signal inputs
    mirror the `DomGuardOptions` passthrough (`mode`, `cooldownMs`, …, `onBlocked`); decisions
    surface as outputs, `(decision)` and `(suspect)`. A nested `[sparshGuard]` is the scoped
    override — React/Vue's `<ActivationGuard>`, same "nested provider" framing (D10).
  - `provideActivationGuard(config)` — app-wide guard from an environment injector
    (`app.config.ts`, a lazy route), on `document` or a `root` factory. Options are static for the
    injector's lifetime; runtime-changing options use the directive.
  - `ActivationGuardTarget` (`[sparshGuardTarget]`) — `useActivationGuard()`'s counterpart; exposes
    an `isGuarded()` signal via `exportAs`. A directive gets its host DOM node for free, so there is
    no ref callback (the reason React/Vue need a hook/composable, D16).
  - `GUARD_CONTEXT` (an `InjectionToken`) — the DI equivalent of React context / Vue's `GuardKey`.
    DI's nearest-provider lookup resolves the closest `[sparshGuard]`, else the app-wide guard, else
    a never-throwing default.
- Both entry points share an internal `GuardHost` (create / recreate-on-meaningful-change /
  destroy) and start the guard in `afterNextRender` — after the initial children exist, matching
  React's `useEffect` / Vue's `onMounted` — and never on the server (Angular doesn't run
  after-render hooks during a server render; a `PLATFORM_ID` check is defense in depth).
  `test/ssr.test.ts` renders all three APIs with `@angular/platform-server` in a DOM-less Node
  environment to prove it.
- **Built with ng-packagr, not tsup.** Published Angular libraries must be partially compiled by
  the Angular compiler (Angular Package Format) so any consumer's linker can finish compiling them;
  esbuild can't emit that. It's built against Angular 22.2 (the supported floor) so the output links
  in 22 and every later major. ng-packagr writes `dist/package.json`, and the package publishes
  from `dist` (`publishConfig.directory`); `pnpm publish` resolves `workspace:*` there as usual.
  Tests compile AOT under Vitest with `@analogjs/vite-plugin-angular`, and
  `test/angular-version.test.ts` fails if the run resolves a different Angular major.
- **Its own toolchain.** Angular 22's compiler needs TypeScript 6.0 and its test stack Vitest 4,
  while the rest of the workspace is on TypeScript 5.7 / Vitest 2. So this package pins TypeScript
  6.0 and Vitest 4 in its own devDependencies and is left out of the root `tsc -b` graph; its
  `typecheck` script runs on its local TypeScript instead.
- Depends on: `@sparshlabs/core`, `@sparshlabs/dom`, `@angular/core` + `@angular/common` (peers, `>=22`).

## `@sparshlabs/solidjs`

**Responsibility:** the SolidJS binding; same surface as `@sparshlabs/react`/`@sparshlabs/vue`.
Solid 1.8+.

- Exports:
  - `ActivationGuardProvider` — primary API, app-wide. Same props as React's
    `<ActivationGuardProvider>` (`mode`, `onDecision`, `onSuspect`, `root`, plus the `DomGuardOptions`
    passthrough).
  - `useActivationGuard()` → `{ ref, isGuarded }` — per-element escape hatch / block explanation.
    `isGuarded` is an `Accessor<boolean>` (a signal getter); `ref` is a ref callback
    (`<button ref={ref}>`). A ref rather than a `use:` directive — same reasoning as React's "hook
    not HOC" (D16), and it needs no JSX namespace augmentation.
  - `ActivationGuard` — optional subtree wrapper, same "nested provider" framing as React's.
  - `GuardContext` — the `createContext` value (Vue's `GuardKey`, React's `GuardContext`).
- Provider calls `createGuard` from `@sparshlabs/dom` in a `createEffect` with `onCleanup`, on a
  `display: contents` wrapper (rendered through `Dynamic`) or an explicit `root` prop. The effect
  tracks only the serialized option set and `root`; callbacks are read from props when they fire,
  since Solid props are live getters (no "latest ref" needed). Effects never run on the server, so
  SSR creates no guard; `test/ssr.test.ts` renders with Solid's server build in a DOM-less Node
  environment to prove it.
- **No JSX in `src/`.** Components are written with `createComponent`/`Dynamic`, which is what
  Solid's compiler emits. tsup then ships plain JS with no Babel step, and the consumer's bundler
  resolves `solid-js`/`solid-js/web` (kept external) to the browser or server build, so one output
  serves client rendering, SSR and hydration. Tests use JSX via `vite-plugin-solid`.
- Named `solidjs` (the framework's own npm package is `solid-js`).
- Depends on: `@sparshlabs/core`, `@sparshlabs/dom`, `solid-js` (peer, `^1.8`). Solid 2.0 changes
  effect and lifecycle semantics; support is deferred until it is stable.

## `@sparshlabs/svelte`

**Responsibility:** the Svelte binding; same surface as `@sparshlabs/react`/`@sparshlabs/solidjs`.
Svelte 5.29+ (runes). Svelte 4 is not supported: its component model is too different to share
source with.

- Exports:
  - `ActivationGuardProvider` — primary API, app-wide. Same props as React's
    `<ActivationGuardProvider>` (`mode`, `onDecision`, `onSuspect`, `root`, plus the `DomGuardOptions`
    passthrough); content arrives as the `children` snippet.
  - `useActivationGuard()` → `{ ref, isGuarded }` — per-element escape hatch / block explanation.
    `ref` is a Svelte attachment (`<button {@attach ref}>`), Svelte 5's ref-callback equivalent (node
    in, cleanup out), which is why 5.29 is the floor. `isGuarded` is an accessor (`isGuarded()`), as
    in Solid, so destructuring the result keeps it reactive (a getter on a returned object would
    not). Like `getContext`, it must be called during component initialisation.
  - `ActivationGuard` — optional subtree wrapper, same "nested provider" framing as React's.
  - `GuardKey` — the `setContext`/`getContext` key (Vue's `GuardKey`, React's/Solid's
    `GuardContext`).
- Provider calls `createGuard` from `@sparshlabs/dom` in a `$effect` (cleanup destroys it), on a
  `display: contents` wrapper (`bind:this`) or an explicit `root` prop. The effect tracks only a
  `$derived` serialized option set, `root` and the wrapper element; callbacks are read from the
  destructured props when they fire, since those stay live. `$effect` and attachments never run on
  the server, so SSR creates no guard; `test/ssr.test.ts` renders with `svelte/server` in a
  DOM-less Node environment to prove it.
- **Built with `svelte-package`, not tsup.** Svelte libraries ship uncompiled `.svelte` (and
  rune-using `.svelte.js`) files for the consumer's compiler, so the package is ESM-only with a
  `svelte` export condition and no CJS build. `svelte.config.js` strips TypeScript from the shipped
  components. The context key, props type and `serializeOptions` live in `src/context.ts` rather
  than in the provider, because a `.svelte` file can't cleanly export them.
- Not in the root `tsc -b` graph (tsc can't read `.svelte`); `svelte-check` typechecks it from the
  root `typecheck` script, as Angular's own typecheck is. Tests use `@sveltejs/vite-plugin-svelte`
  4 (the Vite 5 line vitest 2 runs on) and `.svelte.test.ts` files so they can drive props through
  `$state`.
- Biome 1.9 only partly understands `.svelte`: `biome.json` turns off its formatter for them
  (it can't indent the `<script>` block) and `useConst` (it can't see `bind:this` assignments).
  The rest of the lint rules still apply.
- Depends on: `@sparshlabs/core`, `@sparshlabs/dom`, `svelte` (peer, `^5.29`).

## Dependency direction (must never invert)

```
react    ──▶  dom  ──▶  core
vue      ──▶  dom  ──▶  core
angular  ──▶  dom  ──▶  core
solidjs  ──▶  dom  ──▶  core
svelte   ──▶  dom  ──▶  core
   └─────────────────▶  core   (the adapters also import core types directly)
```

- `core` depends on nothing.
- `dom` depends on `core` only.
- `react` depends on `core` + `dom` + react (peer).
- `vue` depends on `core` + `dom` + vue (peer).
- `angular` depends on `core` + `dom` + `@angular/core`/`@angular/common` (peers).
- `solidjs` depends on `core` + `dom` + solid-js (peer).
- `svelte` depends on `core` + `dom` + svelte (peer).
- No package imports a sibling "upward". No framework-adapter package imports another framework's
  adapter.

## Future packages (not built in v1)

An Options-API-compatible surface for `@sparshlabs/vue` (mixin/`inject`-based, see above) is
deferred. `@sparshlabs/native` (or separate) — a *different host*, shared
philosophy only, not shared code. See `decisions.md` for why native is deferred.
