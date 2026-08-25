# ContinuityPolicy — in-flight press stability

**Covers:** case 2 (layout shift — rect moves / identity changes between down and up), case 6's mid-press
variant, and the mid-press half of case 1 (interstitial appears between down and up).

**Applies to:** pointer input only (`mouse`/`touch`/`pen`). **Never `key`/`virtual`** — they have no
`pointerdown` (see `classification.md`). Applying it to AT input would permanently break activation.

**Default mode:** `report`, but this is the **lowest false-positive policy** and the safest to enforce
early. Teams can enforce Continuity while leaving Age in report.

## The rule

At `pointerdown`, record the intent snapshot `{ identity, rect }` keyed by `pointerId`. At
`pointerup`/`click`, block if **either**:

1. **identity differs** — `activation.identity !== intent.identity` (a *different element* is now the
   target), or
2. **the rect moved past threshold** — the target's bounding rect shifted by more than `rectThresholdPx`
   (default ~4px) between down and up (the *same element* was displaced).

```
allowed =
  intent === undefined            // no pointerdown recorded → not our case, allow (fail open)
  || (sameIdentity(intent, activation)
      && rectDelta(intent.rect, activation.rect) <= rectThresholdPx)
```

`rectDelta` = max of |Δx|, |Δy| of the rect origin (and optionally size delta). Keep it simple and cheap.

## Why this is exact where Age is an approximation

Continuity is not a timer. It blocks a hijack at 700ms exactly as well as at 50ms, and it **never
penalizes a fast user** — a quick, correct press has matching identity and a stationary rect, so it always
passes. This is why it's the safe-to-enforce policy.

**This rect-compare replaces any need for `PerformanceObserver` / `LayoutShift`.** Two reads per
interaction (one at down, one at up); no observer, no noise budget, no CLS plumbing.

## Intent lifecycle (engine responsibility)

- `pointerdown` → store `{ identity, rect, snapshot }` under `pointerId`.
- `pointercancel` → **clear** the stored intent for that `pointerId`. A scroll takeover or OS gesture
  fires `pointercancel`; if you don't clear, the *next* legitimate press can be wrongly evaluated.
- `lostpointercapture` → **clear** as well (drag libraries, `setPointerCapture` handoff).
- `pointerup`/`click` → evaluate, then clear.

The host is responsible for emitting `pointercancel`/`lostpointercapture` as intent-clearing signals; the
engine clears its per-`pointerId` map on them.

## What Continuity deliberately does NOT catch

- **Case 3 (late render)** — both down and up land on the *same* new element; identity and rect match, so
  Continuity passes. Age catches this one.
- **Case 4 (async settle)** — same element, same rect, only *meaning* changed. Semantics catches this.
- **Case 5 (list reorder)** — DOM identity/rect may be unchanged while the underlying entity changed.
  Semantics via `data-guard-key` catches this.

Continuity is one leg of a tripod; it is not meant to be complete alone.

## Edge cases to test (see 04-verification)

- down then up, same stable element, no movement → **allowed** (the dominant happy path; must never
  false-positive).
- down, element displaced > threshold before up → **blocked**.
- down on A, interstitial mounts, up on B (different identity) → **blocked**.
- up without a preceding down (virtual/synthetic) → **allowed** (no intent → fail open); but note such
  events are classified `virtual` and Continuity shouldn't even run.
- `pointercancel` mid-press, then a fresh legitimate press → the fresh press is **allowed** (map cleared).
- drag-then-release-off-target (`lostpointercapture`) → **allowed** as unguarded (map cleared).
- rapid-but-legitimate repeat clicks on a stable control → all **allowed**.
