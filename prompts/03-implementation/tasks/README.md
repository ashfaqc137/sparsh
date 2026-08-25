# tasks/ — how to use these work orders

Each `TNN-*.md` is a **self-contained work order**. Pick the next `not-started` task whose dependencies are
`done` (see `progress.md` and `../milestones.md`), and follow it top to bottom.

## Task file format

```
# Task NN — <title>
Status: not-started | in-progress | done      (mirror in progress.md)
Depends on: <task ids>
Package: <which package/app this lands in>

## Goal            one paragraph — what & why
## Scope           in / explicitly out
## Deliverables    files, exports, artifacts
## Acceptance      testable checklist = definition of done
## References      links to governing docs (00–04)
## Notes           gotchas / traps to avoid
```

## Rules

- **Do not start a task whose dependencies are not `done`.** The order encodes real coupling.
- **Update `Status` here AND in `progress.md`** when you change state.
- If a task reveals a needed decision, add an ADR entry to `../../01-architecture/decisions.md` before
  proceeding — don't silently choose.
- Honor `../conventions.md` and the README working agreement in every task.
- When a task is finer than needed, complete it anyway; when it's coarser than needed, split it into
  `TNNa`, `TNNb` and record that in `progress.md`.
