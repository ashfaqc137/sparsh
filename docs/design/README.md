# sparsh — design docs

> **sparsh** (स्पर्श) — Sanskrit/Hindi for *touch*.
> A framework-agnostic UX-safety primitive that prevents **accidental activation of unstable UI**:
> a user forms intent against a snapshot of the screen, the UI mutates before their tap/click/keypress
> lands, and the activation is stolen. sparsh detects that the target was not *perceivable long enough*
> or *changed identity/meaning* between intent and activation, and blocks suspicious activations by default.

This directory is the design record: the problem, the architecture, the settled decisions, and the
exact policy specs. User-facing docs live on the website (`apps/website`); known gaps are in
[`LIMITATIONS.md`](../../LIMITATIONS.md).

| Path | What it gives you |
|---|---|
| `context/` | The problem, the family of bugs, the philosophy, the prior art. Read first. |
| `architecture/` | Package boundaries, the **core contract** (ports + engine API), and the **decision log** (`D<n>` IDs cited in code). |
| `policies/` | Exact specs for each policy (age, continuity, semantics, double-fire) + input classification / a11y carve-out. |
| `conventions.md` | Cross-cutting invariants, code style, SSR/lifecycle, and performance budgets. |
| `testing-strategy.md` | The test plan. In this project, **the tests are the product.** |

---

## The one-sentence predicate

> An activation is trustworthy **iff** the target was **perceivable long enough** to form intent, and its
> **identity and meaning are unchanged** from intent-formation through activation.

Everything in sparsh is an implementation of that sentence.

## Hard rules

These are derived from the failure modes of every prior attempt at this category. Violating them
silently reintroduces the exact bugs sparsh exists to prevent.

1. **Enforce by default.** Suspicious activations are blocked unless a policy is explicitly in `report`
   mode. `onDecision` reports every decision in both modes; teams can use report mode to tune policies.

2. **Fail open, everywhere.** If sparsh cannot be *sure* an activation is untrustworthy, it allows it.
   An unseen/pre-existing element is treated as old. A missing signal never causes a block. A false
   positive (a real click ignored) is an existential bug; a false negative (a rare mistap slips through)
   is acceptable.

3. **Never block Escape, focus, or scroll — in any mode.** The user must always be able to dismiss and
   always be able to read. This is non-negotiable.

4. **Accessibility is load-bearing, not an afterthought.** Keyboard activation, screen-reader clicks, and
   `.click()` produce **no `pointerdown`**. ContinuityPolicy must never apply to them or you permanently
   break activation for AT users — app-wide. Classify inputs first (`policies/classification.md`).

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

8. **`@sparshlabs/core` must contain zero DOM.** The engine depends only on abstract host *ports*. All
   browser access lives in `@sparshlabs/dom`. A lint fence (`pnpm run typecheck:core-fence`) enforces
   this. If you need `document` in core, the design is wrong.

9. **A block must be legible, never silent.** Silently swallowing input reads as a broken app. Expose
   `isGuarded` / `onDecision` so consumers can render "this just changed — tap again to confirm."
