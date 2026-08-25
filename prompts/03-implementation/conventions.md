# Conventions & invariants

Cross-cutting rules every task must honor. These encode the failure modes from `00-context/prior-art.md`
and the decisions in `01-architecture/decisions.md`. Violating them silently reintroduces the bugs sparsh
exists to prevent.

## Correctness invariants (non-negotiable)

- **Report by default.** Default `mode` is `'report'` for all policies. Blocking only when a policy is
  explicitly `'enforce'`. (D6)
- **Fail open.** Any uncertainty, missing signal, or thrown error ⇒ `allowed: true`, no block. Wrap policy
  evaluation and host snapshots in try/catch that defaults to allow. (D7)
- **Never block Escape / focus / scroll**, in any mode. Filtered at the host boundary + defensively via
  `neverBlock`. (D11)
- **Continuity/DoubleFire never run for `key`/`virtual`.** Gate by `appliesTo(kind)` before evaluation.
  (D11)
- **No `pointer-events: none`.** Block only via capture-phase `preventDefault()` + `stopPropagation()`.
  (D9)
- **One listener on the provider root**, never `document`. (D10)
- **Pointer Events only.** No `mouse*`/`touch*` listeners. Track per `pointerId`; clear on
  `pointercancel`/`lostpointercapture`. (D8)
- **`@sparsh/core` imports zero DOM.** Enforced by tsconfig (no `"DOM"` lib) + lint fence. (D8)

## Code style

- TypeScript strict everywhere (`strict: true`, `noUncheckedIndexedAccess: true`).
- No default exports in library packages — named exports only (better tree-shaking, refactors, and
  re-exports).
- Pure functions for policies; no hidden module state. Engine state lives in the `Guard` closure/instance.
- No runtime dependencies in `core`. `dom` depends only on `core`. `react` peer-deps `react`.
- `sideEffects: false` in every package.
- Prefer `WeakMap` for element-keyed state so GC reclaims detached nodes automatically (age registry).

## SSR & lifecycle

- **No DOM access during render.** Hosts attach in effects / explicit `createGuard`. (SSR-safe)
- **Arm on visibility, not mount.** Hidden-then-revealed surfaces must re-arm. (D13)
- Provider renders **no DOM wrapper**; it attaches to a node via ref on a `display: contents` element, or
  accepts a `root` prop. **Verify `display: contents` against flex/grid parents in the demo** — it has
  historically had layout quirks.
- Every `createGuard` returns a `destroy()` that removes listeners, disconnects observers, and clears
  maps. React cleanup calls it. No leaks across remounts.

## Performance (D19 — release blocker)

- Interaction path budget: **< 1ms added latency per interaction**. The capture listener + rect reads are
  on this path. Measure it; treat regression as blocking.
- Background budget: `MutationObserver`/`IntersectionObserver` cost measured **under a virtualized 10k-row
  fixture**, not just a static page. Stamp only *added* nodes; never walk the tree; observe fingerprint
  attributes only for elements already tracked.
- Age/registry work is per-interaction and per-added-node, never per-existing-element. A page with 300
  interactive elements must cost the same as one with 3 at activation time.

## Legibility

- A block is always observable via `onDecision` and (in React) `isGuarded`. Never swallow input silently.
  (Product requirement — `00-context/philosophy.md`.)

## Naming & attributes (public surface)

- `data-guard="off"` — opt out an element/subtree.
- `data-guard-key={id}` — supply entity identity for list-reorder (case 5).
- React: `<ActivationGuardProvider>`, `useActivationGuard()`, `<ActivationGuard>`.
- Vanilla: `createGuard(root, opts)` from `@sparsh/dom`.

## Docs discipline

- The types in `01-architecture/core-contract.md` are normative. If code diverges, update the doc in the
  **same** change.
- Every settled tradeoff goes in `decisions.md` as a new ADR entry; don't silently reverse an existing
  one.
- Update `progress.md` as the **last step of every task**.
