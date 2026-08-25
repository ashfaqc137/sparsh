# The problem

## The core failure

A user forms **intent** against a *snapshot* of the UI. Then the UI changes before their finger or
cursor lands. Tap motor planning is ~150–300ms and **ballistic** once launched — for the last stretch it
cannot be meaningfully aborted. Anything that mutates the activation target inside that window **steals
the activation**, and the user is blamed (or blames themselves) for a bug the app caused.

This is not one bug. It is a **family** of bugs with a shared shape.

## The family (the six canonical cases)

Every sparsh test, demo, and policy maps back to these. They are numbered; refer to them by number.

1. **Interstitial** — a dialog / toast / banner mounts over the target. The click lands on UI the user
   never perceived.
2. **Layout shift** — content loads *above* the target and displaces it downward; a different element now
   occupies the pixel the user aimed at.
3. **Late render** — a control materializes exactly where the user was already aiming (previously empty
   space, or a different control). *Both* `pointerdown` **and** `pointerup` land on it, so it looks like a
   completely normal press. **This is the hardest case** — it defeats any surface/interstitial-oriented
   guard.
4. **Async settle** — *same element, same pixels, changed meaning.* `disabled` → enabled after an API
   response; or the label flips "Add to cart" → "Remove from cart". A press begun against a no-op button
   commits a real action.
5. **List reorder** — a realtime feed re-sorts; row 3 is now a *different entity*. Deadly in mail, chat,
   moderation queues, trading. The pixels and the element may be identical; only the underlying data
   identity changed.
6. **Double-fire / ghost click** — the UI collapses after activation and a residual or repeat event hits
   whatever is now underneath.

**Why cases 3 and 4 forbid scoping this to interstitials:** they involve the *same location* and often
the *same element*. No surface-level "is a dialog open?" guard can see them. And they are the *most
common* cases in data-driven apps, where essentially everything renders after a fetch.

## Which policy covers which case

| Case | Primary policy | Notes |
|---|---|---|
| 1 Interstitial | Age (new overlay is young) + Continuity (mid-press identity change) | |
| 2 Layout shift | Continuity (rect moved / identity changed between down and up) | |
| 3 Late render | **Age only** — down & up both hit the new element, so Continuity sees no change | tuning-sensitive |
| 4 Async settle | Semantics (`disabled`→enabled, label/meaning change) | `disabled` check is highest-value, near-free |
| 5 List reorder | Semantics via **opt-in `data-guard-key`** | entity identity is invisible to the DOM |
| 6 Double-fire | DoubleFire (residual/repeat event after collapse) | |

## Why a library (and not a per-app fix)

- You **cannot predict** which control will be the one that renders late. Per-surface opt-in misses
  exactly the cases that motivate this. It must be installable globally, once.
- The correct implementation is subtle: pointer-id bookkeeping, `pointercancel`/`lostpointercapture`
  cleanup, virtual-vs-touch classification, capture-phase interception, visibility re-arm, a11y carve-out.
  This is precisely the kind of thing that should be written once, tested exhaustively, and reused.
- Research (2026-08-19) found **nothing on npm** for this category. See `prior-art.md`.

## Intended outcome

An app installs one provider, runs in **report mode**, observes which of *its own* interactions are
unsafe (via `onDecision`/`onSuspect`), then enables enforcement per policy. Accidental activations stop,
with **zero perceptible friction** on correct input.
