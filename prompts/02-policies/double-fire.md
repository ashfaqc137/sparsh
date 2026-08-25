# DoubleFirePolicy — residual / repeat activation

**Covers:** case 6 (double-fire / ghost click) — the UI collapses right after an activation and a residual
or repeat event lands on whatever is now underneath.

**Applies to:** pointer input (`mouse`/`touch`/`pen`). Not `key`/`virtual`.

**Default mode:** `report`.

> This policy was under-specified in earlier drafts (a file existed with no spec). It has its own,
> narrow spec here so it doesn't silently do nothing.

## The two sub-cases

1. **Repeat/ghost click** — a second `click` fires shortly after a first that already caused the UI to
   change/collapse, hitting a *newly exposed* element at the same coordinates. Classic mobile
   "300ms ghost click" lineage and rapid-collapse dialogs.
2. **Residual event after collapse** — a `pointerup`/`click` arrives for an element/surface that was
   dismissed between `pointerdown` and the event, landing on the element revealed underneath.

## The rule

Maintain a short **post-activation refractory window** per root (default: the same `cooldownMs`, or a
smaller dedicated value — decide during implementation, keep configurable):

```
After sparsh observes an activation that changed the target region (collapse/unmount detected via
the age/registry signal that a NEW element now occupies the coordinates), a subsequent activation
within `refractoryMs` whose target is a DIFFERENT identity than the just-activated one, at
overlapping coordinates, is untrusted.
```

Concretely, combine two cheap signals already available:

- **Recency** — time since the last committed activation at (or near) these coordinates.
- **Novelty** — the current target is *young* (the underlying element was revealed by the collapse). This
  reuses the Age signal, so DoubleFire is largely Age applied at "the element that appeared *because of*
  the previous activation".

If both hold (recent prior activation + young newly-exposed target at overlapping coords) → untrusted.

## Relationship to the other policies

DoubleFire overlaps Age and Continuity deliberately — it is the *temporal-sequence* framing of the same
signals, specialized to the "collapse then residual event" pattern that neither single-interaction policy
frames well:

- Age alone would also flag the newly-exposed young element — but only if it's within cooldown of *its
  own* appearance, which may differ from the refractory window after the *previous* activation.
- Continuity doesn't fire because the second event has its *own* matching down/up on the new element.

Keep the implementation small; if in practice Age + Continuity already cover the observed cases in the
demo/e2e suite, DoubleFire may reduce to a thin refractory guard. **Validate against real double-fire
repros before adding complexity.**

## Non-goals

- Do **not** turn this into a general click-debounce. "Debounce a button" is a solved, different problem
  (`react-native-button-wrapper` et al.). DoubleFire is specifically about a *different element underneath*
  after a collapse — legitimate rapid repeat clicks on the *same stable* control must still pass (that's a
  required negative test).

## Edge cases to test (see 04-verification)

- dialog closes on click; a residual `click` lands on the button now underneath → **blocked**.
- rapid legitimate double-click on the *same* stable button → **allowed** (must not regress).
- collapse reveals a different actionable element at the same coords within the refractory window →
  **blocked**.
