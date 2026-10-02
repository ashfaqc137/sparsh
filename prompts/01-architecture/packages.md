# Packages & boundaries

Three published packages under the `@sparsh` scope. Each has a single, defensible reason to exist.

## `@sparsh/core`

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

## `@sparsh/dom`

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
- Depends on: `@sparsh/core`.
- Tested with jsdom (unit) + Playwright via the demo (real input).

## `@sparsh/react`

**Responsibility:** the first framework binding; the live proof; the ergonomic React surface.

- Exports:
  - `<ActivationGuardProvider mode onDecision cooldownMs ...>` — primary API, app-wide.
  - `useActivationGuard()` → `{ ref, isGuarded }` — per-element escape hatch / block explanation.
  - `<ActivationGuard>` — optional subtree wrapper.
- Provider obtains a root node (via ref on a `display: contents` element, or a `root` prop) and calls
  `createGuard` from `@sparsh/dom` in an effect; `destroy()` on cleanup.
- **Hook, not HOC.** The guard needs a real DOM node; an HOC wraps a *component*, forcing `forwardRef` +
  ref-merging that breaks on class components, `memo`, and ref-swallowing third-party components. A hook
  takes the ref directly.
- `data-guard="off"`, `data-guard-key={id}` are plain attributes — no JS needed, read by the dom host.
- Depends on: `@sparsh/core`, `@sparsh/dom`, `react` (peer).

## `@sparsh/vue`

**Responsibility:** the Vue 3 binding; mirrors `@sparsh/react`'s surface 1:1, Composition API only.

- Exports:
  - `ActivationGuardProvider` — primary API, app-wide. Same props as React's
    `<ActivationGuardProvider>` (`mode`, `onDecision`, `onSuspect`, `root`, plus the `DomGuardOptions`
    passthrough).
  - `useActivationGuard()` → `{ ref, isGuarded }` — per-element escape hatch / block explanation.
    `isGuarded` is a reactive `Ref<boolean>` (Vue's equivalent of React `useState`).
  - `ActivationGuard` — optional subtree wrapper, same "nested provider" framing as React's.
- Provider calls `createGuard` from `@sparsh/dom` in `onMounted`/`onBeforeUnmount`, on a root node
  obtained via a `display: contents` wrapper element or an explicit `root` prop — identical
  lifecycle shape to React's provider.
- Uses Vue's `provide`/`inject` (a typed `InjectionKey`, `GuardKey`) as the structural equivalent
  of React context. Unlike React, `provide()` doesn't need a dedicated wrapper component — it's
  called once in `setup()` and applies to the whole subtree, since `setup()` runs once per
  instance rather than once per render.
- **Composable, not mixin/directive.** Same reasoning as React's "hook not HOC" (D16): the guard
  needs a real DOM node, and a composable can take the ref directly.
- Depends on: `@sparsh/core`, `@sparsh/dom`, `vue` (peer, `>=3.3`).

**Composition API vs Options API (why only Composition API ships in v1):** the engine/host layer
(`@sparsh/core` + `@sparsh/dom`) has zero Vue dependency and is identical either way. The
`ActivationGuardProvider`/`ActivationGuard` *components* are also consumed identically by an
Options API app's templates — components don't care how the host app authors its own script
blocks. The one piece that *does* differ is the per-element hook equivalent: `useActivationGuard()`
is a composable and is only callable inside `setup()`/`<script setup>`. An Options API component
cannot call it directly — it would need a parallel surface (e.g. a component `inject: [...]`
option, or a mixin exposing `this.$activationGuard`). That surface is a deliberately deferred,
separate extension, not built in v1.

## Dependency direction (must never invert)

```
react  ──▶  dom  ──▶  core
vue    ──▶  dom  ──▶  core
   └───────────────▶  core   (react/vue also import core types directly)
```

- `core` depends on nothing.
- `dom` depends on `core` only.
- `react` depends on `core` + `dom` + react (peer).
- `vue` depends on `core` + `dom` + vue (peer).
- No package imports a sibling "upward". No framework-adapter package imports another framework's
  adapter.

## Future packages (not built in v1)

`@sparsh/svelte`, `@sparsh/angular` — each a thin binding over `core` + `dom`, same shape as
`@sparsh/react`/`@sparsh/vue`. An Options-API-compatible surface for `@sparsh/vue` (mixin/`inject`-
based, see above) is also deferred. `@sparsh/native` (or separate) — a *different host*, shared
philosophy only, not shared code. See `decisions.md` for why native is deferred.
