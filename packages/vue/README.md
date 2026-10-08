# @sparshlabs/vue

Vue 3 Composition API provider, composable, and scoped wrapper for Sparsh.

```sh
npm install @sparshlabs/vue
```

```vue
<script setup lang="ts">
import { ActivationGuardProvider } from '@sparshlabs/vue'

function onDecision(decision) {
  if (!decision.allowed) console.info('Suspicious activation', decision)
}
</script>

<template>
  <ActivationGuardProvider mode="report" :on-decision="onDecision">
    <YourApp />
  </ActivationGuardProvider>
</template>
```

The provider creates a zero layout footprint root and removes the browser listeners when it
unmounts. Set its `root` prop to an existing `Element` or `Document` for portal or app-wide use.
`mode` defaults to `enforce`; start with `report` to observe decisions before enabling blocking.

`useActivationGuard()` is a Composition API composable for use in `setup()` or `<script setup>`;
it returns a `ref` callback and a reactive `isGuarded` value. `<ActivationGuard>` creates a nested,
independently configured guard for a subtree. Vue 3.3 or newer is required.

See the [repository README](../../README.md) and [API source](src/index.ts).
