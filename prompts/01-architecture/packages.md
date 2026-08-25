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

## Dependency direction (must never invert)

```
react  ──▶  dom  ──▶  core
   └───────────────▶  core   (react also imports core types directly)
```

- `core` depends on nothing.
- `dom` depends on `core` only.
- `react` depends on `core` + `dom` + react (peer).
- No package imports a sibling "upward". No framework-adapter package exists.

## Future packages (not built in v1)

`@sparsh/vue`, `@sparsh/svelte`, `@sparsh/angular` — each a thin binding over `core` + `dom`.
`@sparsh/native` (or separate) — a *different host*, shared philosophy only, not shared code. See
`decisions.md` for why native is deferred.
