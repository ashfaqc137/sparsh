# @sparshlabs/svelte

Svelte 5 provider, element-feedback hook, and scoped wrapper for Sparsh.

```sh
npm install @sparshlabs/svelte
```

```svelte
<script lang="ts">
  import { ActivationGuardProvider, type Decision } from '@sparshlabs/svelte'
  import YourApp from './YourApp.svelte'

  function onDecision(decision: Decision) {
    if (!decision.allowed) console.info('Suspicious activation', decision)
  }
</script>

<ActivationGuardProvider mode="report" {onDecision}>
  <YourApp />
</ActivationGuardProvider>
```

The provider creates a zero layout footprint root and removes the browser listeners when it is
destroyed. Set its `root` prop to an existing `Element` or `Document` for portal or app-wide use.
`mode` defaults to `enforce`; start with `report` to observe decisions before enabling blocking.
The guard is created in an effect, so server rendering (including SvelteKit) never creates one.

`useActivationGuard()` returns a `ref` attachment (`<button {@attach ref}>`) and an `isGuarded`
accessor (`isGuarded()`); call it in a component's `<script>`. `<ActivationGuard>` creates a
nested, independently configured guard for a subtree. Svelte 5.29 or newer is required (`svelte`
is a peer dependency); the package ships Svelte source and is compiled by your app's bundler.

See the [repository README](../../README.md) and [API source](src/index.ts).
