# sparsh — LLM working directory

> **sparsh** (स्पर्श) — Sanskrit/Hindi for *touch*.
> A framework-agnostic UX-safety primitive that prevents **accidental activation of unstable UI**:
> a user forms intent against a snapshot of the screen, the UI mutates before their tap/click/keypress
> lands, and the activation is stolen. sparsh detects that the target was not *perceivable long enough*
> or *changed identity/meaning* between intent and activation, and (optionally) blocks it.

This `prompts/` directory is the **single source of truth** for building sparsh. It is written so that
**any LLM can read it cold and understand the entire project** — the problem, the philosophy, the
architecture, the settled decisions, and the exact, ordered, actionable tasks to implement it.

---

## How to read this directory

Read in numeric order. Do not skip `00-context` — the *why* is what prevents wrong implementations.

| Order | Path | What it gives you |
|---|---|---|
| 1 | `00-context/` | The problem, the family of bugs, the philosophy, the prior art. Read first. |
| 2 | `01-architecture/` | Monorepo shape, package boundaries, the **core contract** (ports + engine API), and the **decision log**. |
| 3 | `02-policies/` | Exact specs for each policy (age, continuity, semantics, double-fire) + input classification / a11y carve-out. |
| 4 | `03-implementation/` | Tooling, conventions, milestones, and the ordered **`tasks/`** — the actionable work orders. |
| 5 | `04-verification/` | The testing strategy. In this project, **the tests are the product.** |
| — | `progress.md` | Current status. Read it right after this README to know where work stands. |

**When implementing:** find the current task in `progress.md`, open the matching file in
`03-implementation/tasks/`, and follow it. Each task file is self-contained and links back to the
governing spec docs.

---

## LLM working agreement (read before writing any code)

These are hard rules derived from the failure modes of every prior attempt at this category. Violating
them silently reintroduces the exact bugs sparsh exists to prevent.

1. **Report-only by default.** Nothing is ever blocked unless a policy is explicitly in `enforce` mode.
   The default mode does *nothing* but emit `onDecision`. This is both the safety property and the
   adoption wedge. Never change the default to `enforce`.

2. **Fail open, everywhere.** If sparsh cannot be *sure* an activation is untrustworthy, it allows it.
   An unseen/pre-existing element is treated as old. A missing signal never causes a block. A false
   positive (a real click ignored) is an existential bug; a false negative (a rare mistap slips through)
   is acceptable.

3. **Never block Escape, focus, or scroll — in any mode.** The user must always be able to dismiss and
   always be able to read. This is non-negotiable.

4. **Accessibility is load-bearing, not an afterthought.** Keyboard activation, screen-reader clicks, and
   `.click()` produce **no `pointerdown`**. ContinuityPolicy must never apply to them or you permanently
   break activation for AT users — app-wide. Classify inputs first (`02-policies/classification.md`).

5. **Touch is asserted independently, never inferred from mouse.** The single most-cited real-world bug
   in this space (crbug 40067456) was a guard that passed a mouse-only test suite while doing nothing on
   phones. Every integration scenario is proven through Playwright's real `touchscreen` API separately
   from `mouse`.

6. **Pointer Events only. No legacy `mouse*` / `touch*` paths.** Duplicating event paths invites the
   mouse/touch divergence above. Track state per `pointerId`; clean up on `pointercancel` and
   `lostpointercapture`.

7. **Never use `pointer-events: none` to block.** It makes the target transparent and the click falls
   *through* to whatever is underneath — converting one accidental activation into a different one.
   Swallow at the event layer (capture-phase `preventDefault` + `stopPropagation`).

8. **`@sparsh/core` must contain zero DOM.** The engine depends only on abstract host *ports*. All
   browser access lives in `@sparsh/dom`. A lint fence enforces this (`03-implementation/lint-fence`,
   part of tooling). If you need `document` in core, the design is wrong.

9. **A block must be legible, never silent.** Silently swallowing input reads as a broken app. Expose
   `isGuarded` / `onDecision` so consumers can render "this just changed — tap again to confirm."

10. **Update `progress.md` as the final step of every task.** If `progress.md` ever disagrees with the
    code, the code wins — then fix `progress.md`.

---

## The one-sentence predicate (memorize this)

> An activation is trustworthy **iff** the target was **perceivable long enough** to form intent, and its
> **identity and meaning are unchanged** from intent-formation through activation.

Everything in sparsh is an implementation of that sentence.

## Package graph (target)

```
@sparsh/core   — engine + policy pipeline + host PORT interfaces + types. ZERO DOM.
@sparsh/dom    — browser host implementing the ports; also the vanilla / no-framework entry point.
@sparsh/react  — <ActivationGuardProvider> + useActivationGuard; the first binding and the live proof.
```

`vue` / `svelte` / `angular` bindings slot in beside `react` later, each depending on `core` + `dom`.
Native (Android/iOS/RN) is **explicitly out of scope** for v1 but is not precluded by the port design.
