# @sparshlabs/solidjs

SolidJS provider, element-feedback hook, and scoped wrapper for Sparsh.

```sh
npm install @sparshlabs/solidjs
```

```tsx
import { ActivationGuardProvider, type Decision } from '@sparshlabs/solidjs'

function onDecision(decision: Decision) {
  if (!decision.allowed) console.info('Suspicious activation', decision)
}

export function App() {
  return (
    <ActivationGuardProvider mode="report" onDecision={onDecision}>
      <YourApp />
    </ActivationGuardProvider>
  )
}
```

The provider creates a zero layout footprint root and removes the browser listeners when it is
disposed. Set its `root` prop to an existing `Element` or `Document` for portal or app-wide use.
`mode` defaults to `enforce`; start with `report` to observe decisions before enabling blocking.
The guard is created in an effect, so server rendering (including SolidStart) never creates one.

`useActivationGuard()` returns a `ref` callback (`<button ref={ref}>`) and an `isGuarded` accessor
(`isGuarded()`). `<ActivationGuard>` creates a nested, independently configured guard for a
subtree. Solid 1.8 or newer is required (`solid-js` is a peer dependency).

See the [repository README](../../README.md) and [API source](src/index.ts).
