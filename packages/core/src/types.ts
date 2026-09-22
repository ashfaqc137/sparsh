/**
 * Core types for sparsh — the normative public contract.
 *
 * Mirrors `prompts/01-architecture/core-contract.md`. If this file diverges from that doc,
 * update the doc in the same change (see `prompts/03-implementation/conventions.md`).
 *
 * Zero DOM. This module must compile with `lib: ["ES2022"]` only.
 */

/** Report-only (default) never blocks; enforce may actually block an untrusted activation. */
export type Mode = 'report' | 'enforce'

export type PolicyId = 'age' | 'continuity' | 'semantics' | 'doubleFire'

/**
 * How the activation was produced. Drives which policies apply — see
 * `prompts/02-policies/classification.md` for the full a11y carve-out rationale.
 *
 * - mouse / touch / pen: real pointer input, distinguished by `PointerEvent.pointerType`.
 * - key: keyboard activation (Enter/Space on an activatable element).
 * - virtual: programmatic/AT-driven activation (`.click()`, screen-reader click, automation) —
 *   arrives with no preceding `pointerdown`.
 */
export type InputKind = 'mouse' | 'touch' | 'pen' | 'virtual' | 'key'

/**
 * intent = the moment intent is formed (pointerdown, or first-visible for age/semantics on a
 * fresh element reached via key/virtual).
 * activation = the moment the action would commit (pointerup / click / key-activate).
 */
export type Phase = 'intent' | 'activation'

/**
 * Opaque handle to a resolved interactive target. In `@sparsh/dom` this wraps an `Element`.
 * The engine never inspects it — it is only ever passed back to the `Host` port.
 */
export type TargetHandle = { readonly __brand: 'TargetHandle' }

/**
 * Normalized input event (host → engine). The host normalizes raw platform events into this
 * shape; the engine never sees a DOM event.
 */
export interface ActivationEvent {
  phase: Phase
  kind: InputKind
  /** present for pointer inputs; absent for key/virtual. */
  pointerId?: number
  /** opaque handle the host understands; engine treats it as a token. */
  target: TargetHandle
  /** monotonic ms (host clock). */
  timeStamp: number
  /**
   * Escape hatch: true for events the host says must never be blocked (Escape, focus, scroll —
   * already filtered upstream by the host). The engine defensively honors this unconditionally.
   */
  neverBlock?: boolean
}

/**
 * A signal the host emits to clear stored intent state for a `pointerId` without an activation —
 * `pointercancel` and `lostpointercapture`. Kept distinct from `ActivationEvent` so the engine
 * stays DOM-free and does not need to know these are DOM event names.
 */
export interface IntentClearSignal {
  pointerId: number
  /** monotonic ms (host clock). */
  timeStamp: number
}

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export interface Fingerprint {
  disabled: boolean
  /**
   * Trimmed textContent — OPT-IN / scoped. Raw text diffing causes false positives on stable
   * controls with live text (counters, "2m ago" timestamps). Only compared when a caller opts in.
   * See `prompts/02-policies/semantics.md` (D14).
   */
  text?: string
  ariaLabel?: string
  /** href for links, value for inputs, etc. */
  role?: string
  hrefOrValue?: string
  /** data-guard-key, if present — the only reliable signal for list-reorder identity (case 5). */
  guardKey?: string
}

export interface TargetSnapshot {
  /** Stable identity token for equality comparison across time; the host decides how. */
  identity: unknown
  rect: Rect
  fingerprint: Fingerprint
  /**
   * ms since the element became PERCEIVABLE (visible), per the host's age heuristic.
   * Convention: unknown/unseen/pre-existing ⇒ `Infinity` (treated as old — fail open, D7).
   */
  ageMs: number
  /** `data-guard="off"` — opt-out escape hatch. */
  guardOff: boolean
}
