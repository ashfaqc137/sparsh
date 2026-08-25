# Task 17 — DOM vanilla entry: createGuard(root, opts)
Status: not-started
Depends on: T16
Package: dom

## Goal
Expose the framework-free public API: `createGuard(root, opts)` that wires `createDomHost` +
`core.createGuard` and returns a `Guard`. This is the reference binding, the no-framework entry point, and
the basis every framework binding mirrors.

## Scope
- In: the convenience wrapper, its options passthrough, `destroy()`, `isGuarded`, barrel export.
- Out: React specifics (T18).

## Deliverables
- `packages/dom/src/index.ts` exports:
  - `createDomHost(root, opts): Host`
  - `createGuard(root: Element | Document, opts?: GuardOptions & DomHostOptions): Guard`
  - relevant types re-exported from core for convenience.
- `createGuard` builds the host, calls `core.createGuard(host, opts)`, returns the `Guard` and ties
  `destroy()` to also tear down the host.

## Acceptance
- Vanilla usage in a jsdom/Playwright page: `const g = createGuard(document.body, { mode:'report',
  onDecision })` — `onDecision` fires on interactions; `g.destroy()` cleans everything.
- With a policy in `enforce`, an untrusted synthetic interaction is blocked; in `report`, it isn't.
- No React dependency anywhere in `@sparsh/dom`.

## References
- `../../01-architecture/packages.md` (dom = host + vanilla entry)
- `../../01-architecture/core-contract.md` (`createGuard`, `Guard`)

## Notes
- Keep options ergonomic: one object merging `GuardOptions` (core) + host options (root visibility config,
  thresholds).
- This is what the demo could use directly to sanity-check before the React provider exists.
