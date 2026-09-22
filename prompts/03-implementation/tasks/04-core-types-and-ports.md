# Task 04 — Core types & ports
Status: done
Depends on: T03
Package: core

## Goal
Translate the normative contract in `core-contract.md` into real TypeScript. This is the public API other
frameworks build against — get the shapes right and stable.

## Scope
- In: all unions, `ActivationEvent`, `TargetHandle`, `Rect`, `Fingerprint`, `TargetSnapshot`, `Host`,
  `GuardOptions`, `Guard`, `Decision`, `Policy`, `Verdict`, `PolicyContext`. Barrel exports from
  `src/index.ts`.
- Out: engine behavior (T05), policy logic (T08+), any DOM.

## Deliverables
- `packages/core/src/types.ts` — the unions + data types.
- `packages/core/src/host.ts` — the `Host` port interface.
- `packages/core/src/policy.ts` — `Policy`, `Verdict`, `PolicyContext` interfaces.
- `packages/core/src/index.ts` — named re-exports of the public surface.
- Types compile with **no DOM lib** (the fence from T03 must stay green).

## Acceptance
- Every type in `core-contract.md` exists with matching shape; doc and code agree (update doc if you
  deviate, same change).
- `TargetHandle` is opaque/branded; engine code cannot inspect DOM through it.
- `pnpm typecheck` green; core still compiles without `"DOM"`.
- No default exports.

## References
- `../../01-architecture/core-contract.md` (normative)
- `../conventions.md` (style, no default exports, strict)

## Notes
- Keep `TargetSnapshot.identity` and `Decision.target.identity` as `unknown` — the host decides identity;
  the engine only compares for equality.
- `ageMs` unknown convention is `Infinity` (old / fail open) — document in the type's JSDoc.
- Mark `text` in `Fingerprint` as opt-in in JSDoc (the live-text caveat, D14).
