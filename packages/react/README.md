# @sparshlabs/react

React provider, hook, and scoped wrapper for Sparsh.

```sh
npm install @sparshlabs/react
```

```tsx
import { ActivationGuardProvider } from '@sparshlabs/react'

export function App() {
  return (
    <ActivationGuardProvider
      mode="report"
      onDecision={(decision) => {
        if (!decision.allowed) console.info('Suspicious activation', decision)
      }}
    >
      <YourApp />
    </ActivationGuardProvider>
  )
}
```

The provider owns a zero layout footprint root by default and cleans up the browser listeners when
it unmounts. Set `root` to an existing `Element` or `Document` when the provider cannot own a DOM
node, such as when guarding a portal target. `mode` defaults to `enforce`; start with `report` to
observe decisions before enabling blocking.

`useActivationGuard()` returns a `ref` callback and an `isGuarded` boolean for per-element feedback.
`<ActivationGuard>` creates a nested, independently configured guard for a subtree. React 18 or
newer is required.

See the [repository README](../../README.md) and [API source](src/index.ts).
