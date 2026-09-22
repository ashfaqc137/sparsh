# Task 09 — SemanticsPolicy
Status: done
Depends on: T07
Package: core

## Goal
Implement the meaning-change policy: fingerprint at intent, re-check at activation, block on a meaningful
change. The `disabled`→enabled check is the flagship; raw text diffing is opt-in to avoid live-text false
positives.

## Scope
- In: fingerprint equality (default fields), opt-in `text` comparison, `data-guard-key` handling,
  intent-anchor selection (pointerdown for pointer; first-visible for key/virtual).
- Out: how the host *builds* the fingerprint (T14); DOM reads.

## Deliverables
- `packages/core/src/policies/semantics.ts` implementing `Policy` (`id:'semantics'`, applies to all
  kinds).
- Default comparison fields: `disabled`, `ariaLabel`, `role`, `hrefOrValue`, `guardKey`.
- `text` compared **only** when opt-in flag is set (via options); document the caveat inline.
- `evaluate`: if any compared field differs between intent and activation fingerprints ⇒ blocked with a
  field-specific reason (e.g. `disabled changed false→? ... enabled`). Missing intent fingerprint ⇒ allowed
  (fail open).

## Acceptance (unit, fake host)
- `disabled` true→false between intent and activation ⇒ **blocked**.
- `aria-label` meaning change ⇒ **blocked**.
- `guardKey` change (list reorder) ⇒ **blocked**.
- reorder **without** `guardKey` and no other field change ⇒ **allowed** (documented gap, not a bug).
- stable control with live "2m ago" text, default config (no text check) ⇒ **allowed** (no false
  positive).
- with text-check opt-in, label "Add"→"Remove" ⇒ **blocked**.

## References
- `../../02-policies/semantics.md` (normative)
- `../../01-architecture/decisions.md` D14, D15

## Notes
- `disabled` is the highest-value, near-free check — always on.
- For key/virtual, the intent fingerprint comes from the **first-visible** snapshot the host tracks (same
  anchor as Age), since there is no pointerdown.
- Prefer `aria-label` / `guardKey` as stable meaning signals over raw text.
