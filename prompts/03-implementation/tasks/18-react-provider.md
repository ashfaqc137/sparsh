# Task 18 — React `<ActivationGuardProvider>`
Status: not-started
Depends on: T17
Package: react

## Goal
The primary React API: an app-wide provider that installs one guard on its root subtree, in an effect,
with SSR safety and clean teardown. Global is the point — you can't predict which control renders late.

## Scope
- In: `<ActivationGuardProvider>`, root acquisition, effect lifecycle, context for `isGuarded`, props
  passthrough (`mode`, `onDecision`/`onSuspect`, `cooldownMs`, `rectThresholdPx`, `policies`, `root`).
- Out: `useActivationGuard` hook + subtree wrapper (T19).

## Deliverables
- `packages/react/src/ActivationGuardProvider.tsx`:
  - Renders **no DOM wrapper**; attaches to a node via ref on a `display: contents` element, or a `root`
    prop. **Verify `display:contents` under flex/grid parents** (note it in the demo).
  - In `useEffect`/`useLayoutEffect`, call `createGuard(rootNode, opts)`; return `destroy` in cleanup.
  - SSR-safe: no DOM access during render.
  - Provide a context carrying the `Guard` (for `isGuarded`) + config.
  - `onSuspect` convenience = `onDecision` filtered to `allowed===false`.

## Acceptance
- Mounting the provider around an app installs exactly one guard; unmount tears it down (no leaks across
  remounts).
- Report mode: `onDecision`/`onSuspect` fire; nothing blocked; actions still run.
- SSR render (no `document`) does not throw.
- Re-render of children does not re-create the guard (stable across renders; recreate only on relevant
  option changes).

## References
- `../../01-architecture/packages.md` (react responsibilities)
- `../../01-architecture/decisions.md` D10, D16
- `../conventions.md` (SSR, display:contents caveat, lifecycle)

## Notes
- Guard recreation policy: memoize on the option set; avoid tearing down on every render (perf + missed
  in-flight state). Prefer updating options on the existing guard if the API allows, else recreate only on
  meaningful change.
- Keep the provider dependency-light; it's just lifecycle + context.
