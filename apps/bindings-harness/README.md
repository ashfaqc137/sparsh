# apps/bindings-harness

Internal and never deployed. It renders the website playground's three scenarios (the inbox
reshuffle, the late render, the button that changes meaning) through every framework binding:
React, Vue, Solid, Svelte and Angular. `e2e/playground-bindings.spec.ts` runs the same checks against
each binding here and against the public playground.

The public playground (`apps/website`) is deliberately single-framework and never names one,
because sparsh behaves the same in every framework. The per-framework coverage lives here instead.

- `src/main.ts` is a plain-DOM shell: framework, mode, scenario and cooldown controls, with the same
  accessible names as the playground. Any change remounts the selected framework's scene.
- `src/<framework>/` holds one scene per binding plus a `mount.ts(x)` that mounts it and returns its
  teardown. Every scene renders the same test ids and text (`src/shared.ts`), so a difference in
  behaviour can only come from the binding.
- `vite.config.ts` scopes each compiler plugin to its own folder: React and Solid JSX never meet,
  and the Angular compiler (Analog, AOT) only sees `src/angular/` through `tsconfig.angular.json`.

```sh
pnpm --filter bindings-harness dev     # http://127.0.0.1:4323/
pnpm e2e                               # Playwright builds and serves it alongside the website
```

To cover a new binding, add `src/<framework>/` with a scene and `mount`, register it in
`src/main.ts`, and add it to the target list in `e2e/playground-bindings.spec.ts`.
