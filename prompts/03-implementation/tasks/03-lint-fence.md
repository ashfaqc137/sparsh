# Task 03 — DOM-free lint fence for `@sparsh/core`
Status: not-started
Depends on: T02
Package: core (+ root lint/CI)

## Goal
Make it **structurally impossible** for `@sparsh/core` to depend on the DOM. This guarantees the core
contract stays framework- and platform-agnostic (D2, D8) and provable-without-a-browser.

## Scope
- In: tsconfig lib restriction, lint rule, and a CI check that compiles core in isolation.
- Out: any core source logic (T04+).

## Deliverables
- `packages/core/tsconfig.json`: `"lib": ["ES2022"]` — **no `"DOM"`**. Remove the T01 TODO marker.
- Lint rule in `core` scope banning DOM globals/imports: `document`, `window`, `navigator`, `self`,
  `HTMLElement`, `Element`, DOM lib type imports (`no-restricted-globals` / `no-restricted-imports`, or
  biome equivalent).
- CI job / script: `tsc -p packages/core --noEmit` proving core compiles with no DOM lib.
- A deliberately-failing example in a comment or a `// @ts-expect-error` test confirming the fence bites
  (then removed/kept as a guard test).

## Acceptance
- Referencing `document` anywhere in `packages/core/src` is a **type error** AND a **lint error**.
- The isolated core compile passes in CI.
- `dom` and `react` are unaffected (they keep the `"DOM"` lib).

## References
- `../tooling.md` (the fence, two layers)
- `../../01-architecture/decisions.md` D8

## Notes
- Belt-and-suspenders is intentional: types catch most, lint catches `globalThis`/`any` casts.
- If future core code legitimately needs an environment capability, add it to the **`Host` port**, never
  to core directly.
