# @sparshlabs/dom

Browser host and framework free API for Sparsh. It uses capture phase event listeners on the root
you provide and tears them down with `destroy()`.

```sh
npm install @sparshlabs/dom
```

```ts
import { createGuard } from '@sparshlabs/dom'

const guard = createGuard(document, {
  mode: 'report',
  onDecision(decision) {
    if (!decision.allowed) console.info('Suspicious activation', decision)
  },
})

// Call when the guarded app or region is disposed.
guard.destroy()
```

Use `mode: 'report'` to observe policy decisions without blocking. The default mode is `enforce`.
Pass an `Element` instead of `document` to guard a subtree. `data-guard="off"` opts out an
interactive element; `data-guard-key` supplies a stable identity for reordered list items.

See the [repository README](../../README.md) and [API source](src/index.ts).
