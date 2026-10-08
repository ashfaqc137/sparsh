# AgePolicy — perception

**Covers:** case 1 (interstitial — the overlay is young), case 3 (late render — the only policy that
catches it, since down & up both land on the new element).

**Applies to:** all input kinds, including `key`/`virtual` (decision D12).

**Default mode:** `enforce` (D21). Configure `report` explicitly while tuning the cooldown if needed.

## The rule

> An activation on a target **younger than `cooldownMs`** (default 500) is untrusted.

```
verdict.allowed = activation.ageMs >= cooldownMs
reason (when blocked): `target perceivable for ${ageMs}ms < ${cooldownMs}ms cooldown`
```

That's the entire engine-side logic. **All the difficulty is in how the host computes `ageMs`** — and
that lives in `@sparsh/dom`, behind the port, so it can be refined without touching core.

## `ageMs` must measure PERCEIVABILITY, not DOM insertion (D13)

The predicate is about *perception*. A naive `MutationObserver`-insertion timestamp is wrong for:

- elements inserted hidden then revealed (`display:none` → shown, tab panels),
- elements present but not yet visible (`opacity:0`, off-screen, occluded).

### The host's age heuristic (target design)

Combine two observers, take the **later** of the two moments as "became perceivable":

1. **`MutationObserver`** (`childList`, `subtree`) on the root — stamps *insertion time* into a `WeakMap`
   as nodes are added. Never walk the whole tree; only stamp added nodes.
2. **`IntersectionObserver`** — stamps *first-visible time* when an element first intersects the viewport
   with non-zero ratio. This is the perceivability signal that fixes hidden-then-revealed.

```
becamePerceivableAt = max(firstVisibleAt ?? insertionAt, insertionAt)   // whichever indicates later visibility
ageMs = now - becamePerceivableAt
```

- **Unseen / pre-existing element** (never observed being added or made visible): `ageMs = Infinity` →
  treated as **old** → allowed. This is fail-open (D7): a static page blocks nothing.
- **Re-arm on visibility** (Chromium `VisibilityChanged()` semantics): a surface hidden then re-shown must
  reset its perceivable time. Tie this to IntersectionObserver transitions.
- **Re-arm on `disabled` → enabled**: a disabled control fires no activation events, so it can never be
  the realistic target of an accidental activation while disabled — the moment that matters is the moment
  it *becomes* enabled. The host watches the `disabled`/`aria-disabled` attributes (same `MutationObserver`,
  via `attributeFilter`) and treats an enable transition as "newly perceivable now", including for a
  previously-untracked (e.g. pre-existing, page-load-disabled) element — that's the first moment it's an
  eligible target at all. See `packages/dom/src/age.ts`.

### Known blind spots (document, don't pretend to solve)

- `opacity: 0` with layout present — IntersectionObserver still reports it as intersecting. Not caught.
- Occlusion by another element at the same coordinates — not caught by IO.
- These are acceptable given fail-open; they can be improved *inside the host* later. Do **not** add
  expensive per-frame visibility polling to chase them — that violates the perf budget (D19).
- See `../../LIMITATIONS.md` for the full, user-facing writeup of these (and other) gaps, including the
  broader class of CSS-only paint reveals (`visibility`, `filter`, `clip-path`, `backdrop-filter`) that
  share this same root cause.

## Interaction with intent snapshots

For pointer input, the "intent" anchor for Age is naturally the moment of `pointerdown`, but Age actually
only needs the **activation-time** `ageMs` (how old is the element *now*). It does not require a stored
intent snapshot. For `key`/`virtual`, same: evaluate `ageMs` at activation.

## Why 500ms

Matches Chromium's double-click interval and the CLS `hadRecentInput` window. The motor-planning window is
150–300ms; 500ms is deliberately generous to protect against false positives. Configurable via
`cooldownMs`. See `00-context/prior-art.md`.

## Edge cases to test (see 04-verification)

- Late-mounted target under a stationary pointer, activated within cooldown → blocked (enforce) / reported
  (report).
- Same target activated *after* cooldown → allowed.
- Pre-existing (unseen) element → always allowed (Infinity age).
- Hidden-then-revealed surface → age counts from reveal, not from mount.
- Disabled-then-enabled control (including a pre-existing, page-load-disabled one) → age counts from the
  enable moment, not from mount/page-load.
- Keyboard activation of a fresh control within cooldown → blocked in enforce mode; configure Age as
  report if this is too sensitive. It **works normally after the window** (never permanently blocked).
