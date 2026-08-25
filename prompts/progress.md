# Progress

> **Source of truth for status.** Read this right after `README.md`. Update it as the **last step of every
> task** (README working agreement rule #10). If this file ever disagrees with the code, the code wins —
> then fix this file.

## Current focus
Project not started. Documentation/specs complete in `prompts/`. Next up: **T01 — Monorepo skeleton**.

## Last decision
See `01-architecture/decisions.md`. Most recent settled items: D12 (Age applies to all input kinds),
D17 (native deferred), D18 (pnpm+turbo+changesets monorepo). Name is **sparsh** (D1).

## Open blockers / to-confirm
- [ ] `@sparsh` npm scope availability — verify in **T01**; fall back to unscoped `sparsh` / `sparsh-dom` /
      `sparsh-react` and record an ADR if taken.
- [ ] `display: contents` provider-root behavior under flex/grid — verify in the demo (**T18/T20**).
- [ ] `refractoryMs` value + whether DoubleFire reduces to a thin refractory guard — decide during **T11**
      against a real repro.

## Task status

Phases: A Foundation · B Core engine · C Policies · D DOM host · E React · F Proof · G Release.
(Full detail + dependencies in `03-implementation/milestones.md`.)

| ID | Task | Phase | Status |
|---|---|---|---|
| T01 | Monorepo skeleton | A | not-started |
| T02 | Build/test/release tooling | A | not-started |
| T03 | DOM-free lint fence | A | not-started |
| T04 | Core types & ports | B | not-started |
| T05 | Engine skeleton | B | not-started |
| T06 | Mode/decision plumbing + fail-open | B | not-started |
| T07 | Input classification & gating | C | not-started |
| T08 | ContinuityPolicy | C | not-started |
| T09 | SemanticsPolicy | C | not-started |
| T10 | AgePolicy | C | not-started |
| T11 | DoubleFirePolicy | C | not-started |
| T12 | DOM host: capture listener + normalization | D | not-started |
| T13 | DOM host: target resolution | D | not-started |
| T14 | DOM host: snapshot (rect + fingerprint) | D | not-started |
| T15 | DOM host: age tracking (perceivability) | D | not-started |
| T16 | DOM host: block() + cleanup + visibility | D | not-started |
| T17 | DOM vanilla entry: createGuard | D | not-started |
| T18 | React `<ActivationGuardProvider>` | E | not-started |
| T19 | React `useActivationGuard()` + wrapper | E | not-started |
| T20 | Demo app (repro per case + suspect log) | F | not-started |
| T21 | Playwright e2e (mouse+touch+keyboard) | F | not-started |
| T22 | Docs + changesets + first publish | G | not-started |

## Status legend
`not-started` · `in-progress` · `done` · `blocked`

## Changelog (append newest on top)
- _(none yet)_ — documentation scaffold created under `prompts/`; old `PLAN.md` removed.
