# Task 22 — Docs, changesets & first publish
Status: not-started
Depends on: T21
Package: repo root + all packages

## Goal
Ship `0.x` to npm with credible docs. Anchor the README on the report-mode adoption wedge and the
security (tapjacking) framing — the likelier door-opener than UX polish.

## Scope
- In: root README + per-package READMEs, API docs from the core contract, changesets for initial release,
  publish config, LICENSE.
- Out: marketing site, additional framework bindings.

## Deliverables
- Root `README.md`: the problem (six cases), the predicate, quick start (`<ActivationGuardProvider
  mode="report">`), report→enforce adoption path, the security framing (tapjacking, CVE-2023-6206),
  link to the demo.
- Per-package READMEs: `@sparsh/core` (the contract + how to write a host/binding), `@sparsh/dom`
  (`createGuard` vanilla), `@sparsh/react` (provider + hook + `data-guard*`).
- API reference generated or hand-written from `01-architecture/core-contract.md` (keep them in sync).
- MIT LICENSE.
- Changesets for the initial `0.x` of all three packages; `changeset version` + `changeset publish` dry-run
  verified.
- Confirm final package names (scope decision from T01) across all manifests.

## Acceptance
- `pnpm release` dry-run publishes all three packages with correct deps, exports, and types.
- README quick start actually works when followed against a fresh app.
- Demo is linked and runnable.
- Security framing + report-mode wedge are front-and-center (per philosophy doc).

## References
- `../../00-context/philosophy.md` (positioning, wedge)
- `../../00-context/prior-art.md` (credibility anchors, CVEs)
- `../../01-architecture/core-contract.md` (API reference source of truth)

## Notes
- Keep the "invisible infrastructure is hard to sell" answer explicit in the README: *measure it in report
  mode first.*
- Start at `0.x`; the core contract may still shift. Communicate stability expectations per package (core
  = the contract, treat breaking changes seriously).
