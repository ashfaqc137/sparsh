# @sparshlabs/core

Framework independent decision engine for Sparsh. It has no DOM dependency; hosts provide the
normalized activation events and target snapshots through the `Host` interface.

```sh
npm install @sparshlabs/core
```

Most browser apps should use `@sparshlabs/dom` or a framework binding. Use `@sparshlabs/core` to implement
a custom host or binding. Create a guard with `createGuard(host, options)`, forward intent and
activation events to its host callbacks, and call `destroy()` when the host is disposed.

The guard runs the age, continuity, semantics, and double-fire policies by default. `mode: 'report'`
reports suspicious activations without blocking them; the default is `enforce`. Subscribe to
decisions with `onDecision` and release all host subscriptions with `destroy()`.

See the [repository README](../../README.md) and [public contract](../../prompts/01-architecture/core-contract.md).
