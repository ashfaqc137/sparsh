# Task 19 — React `useActivationGuard()` + `<ActivationGuard>`
Status: not-started
Depends on: T18
Package: react

## Goal
The per-element escape hatch and legibility surface: a hook returning `{ ref, isGuarded }` so consumers
can *explain* a block ("This just changed — tap again to confirm"), plus an optional subtree wrapper. Hook,
not HOC (D16).

## Scope
- In: `useActivationGuard()` → `{ ref, isGuarded }`; optional `<ActivationGuard>` subtree component;
  reading block state from context.
- Out: new policy logic.

## Deliverables
- `packages/react/src/useActivationGuard.ts`:
  - Returns a `ref` to attach to the element the consumer wants to observe, and `isGuarded` (boolean,
    reactive) reflecting whether that element's most recent activation was blocked.
  - Uses the provider's `Guard.isGuarded(handle)` keyed by the resolved element.
- `packages/react/src/ActivationGuard.tsx` (optional): a subtree wrapper for scoping/overriding options
  within a region (still one underlying listener at the provider; this adjusts config/opt-in for the
  subtree, or documents that nested providers are the mechanism — pick and document).
- Barrel `packages/react/src/index.ts` exporting provider, hook, wrapper, and re-exported core types.

## Acceptance
- A component using the hook can render a "changed — tap again" affordance when `isGuarded` is true, which
  clears on a subsequent trustworthy activation.
- Works with class components / `memo` / ref-swallowing children *because* it's a hook taking the ref
  directly (no forwardRef gymnastics).
- No default exports; tree-shakeable.

## References
- `../../01-architecture/decisions.md` D16 (hook not HOC)
- `../../00-context/philosophy.md` ("a block must be legible")
- `../../01-architecture/packages.md`

## Notes
- `isGuarded` is the legibility contract from the philosophy doc — silently swallowing input reads as a
  broken app. This hook is how apps make blocks legible.
- Keep reactivity cheap: update `isGuarded` via subscription/state on decision events for that element,
  not by polling.
