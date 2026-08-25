# SemanticsPolicy — meaning

**Covers:** case 4 (async settle — `disabled`→enabled, "Add"→"Remove"), case 5 (list reorder — via opt-in
`data-guard-key`).

**Applies to:** all input kinds. For pointer input the intent anchor is `pointerdown`; for `key`/`virtual`
(no pointerdown) the intent anchor is **first-visible** (same anchor Age uses).

**Default mode:** `report`. The `disabled`→enabled sub-check is high-value and low-risk; consider it a
candidate for early enforcement, but keep the default `report`.

## The rule

Fingerprint the target at intent-formation, re-check at activation, block on a **meaningful** change.

```
allowed = fingerprintEqual(intent.fingerprint, activation.fingerprint)
```

## The fingerprint (what counts as "meaning")

```ts
interface Fingerprint {
  disabled: boolean       // HIGHEST value; near-free; ALWAYS checked
  ariaLabel?: string      // checked
  role?: string           // checked
  hrefOrValue?: string    // href for <a>, value for inputs/buttons — checked
  guardKey?: string       // data-guard-key — checked (see below)
  text?: string           // trimmed textContent — OPT-IN / SCOPED (see caveat)
}
```

### `disabled` → enabled is the flagship check (D14)

The single highest-value check in all of sparsh, and nearly free. A press begun against a `disabled`
(no-op) button that becomes enabled after an API response would otherwise commit a real action. Always
include `disabled` in the fingerprint.

### `text` diffing is opt-in / scoped — do not default it on (D14)

Raw `textContent` comparison causes **false positives** on stable controls containing live text: a counter
badge, a price that ticks, a "2m ago" timestamp. These change constantly while the control's *meaning* is
unchanged. Therefore:

- The default fingerprint comparison uses `disabled` + `ariaLabel` + `role` + `hrefOrValue` + `guardKey`.
- `text` is compared **only** when explicitly enabled (e.g., an opt-in option or a per-element attribute),
  and even then callers should scope it to the label element, not the whole subtree.
- Prefer `aria-label` / `data-guard-key` as the stable meaning signal over raw text.

## Case 5 (list reorder) requires `data-guard-key` — honest layering (D15)

Entity identity **cannot be inferred from the DOM**. Row 3 becoming a different invoice is invisible to any
fingerprint — same element, same rect, same label shape, different underlying data. The only reliable
signal is an **opt-in** attribute:

```tsx
<Row data-guard-key={item.id} />
```

Consumers already have `key={item.id}` in their framework; `data-guard-key` mirrors it. When present,
`guardKey` is part of the fingerprint and a change between intent and activation is a block. When absent,
sparsh does **not** pretend to cover case 5 — documented explicitly, not silently.

## Intent-anchor detail

- **Pointer:** capture the fingerprint at `pointerdown`; re-read at `pointerup`/`click`.
- **Key/virtual:** there is no pointerdown. Use the fingerprint captured at **first-visible** (the host
  already tracks this for Age) as the intent baseline, re-read at activation. This means Semantics can
  still catch a `disabled`→enabled flip for keyboard activation.

## Edge cases to test (see 04-verification)

- `disabled` → enabled between down and up → **blocked**.
- label "Add to cart" → "Remove from cart" **with** text-check enabled → blocked; with default (no text
  check) and no `aria-label`/`guardKey` change → allowed (documented gap).
- `aria-label` changes meaning between down and up → **blocked**.
- list row with `data-guard-key` that changes between down and up → **blocked**.
- list row **without** `data-guard-key` that reorders → **allowed** (documented gap; not a bug).
- stable control containing a live "2m ago" timestamp, default fingerprint → **allowed** (no false
  positive — this is the whole reason text is opt-in).
