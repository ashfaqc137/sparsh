/**
 * The Policy interface — internal, but part of the contract for extensibility. Each of the four
 * shipped policies (age, continuity, semantics, doubleFire) implements this.
 */

import type { InputKind, PolicyId, Rect, TargetSnapshot } from './types.js'

/**
 * The last activation the engine allowed to commit, per guarded root. Supplied so
 * DoubleFirePolicy can reason about the temporal sequence (an activation right after a UI
 * collapse) without the engine leaking pipeline internals into the policy. Undefined until the
 * first committed activation.
 *
 * This is an engine-contract extension beyond the initial `core-contract.md` draft — documented
 * here and mirrored in that doc (see task 11 notes).
 */
export interface LastActivation {
  time: number
  identity: unknown
  rect: Rect
}

export interface PolicyContext {
  now: number
  cooldownMs: number
  rectThresholdPx: number
  /**
   * Refractory window for DoubleFirePolicy (default: a dedicated, smaller value than
   * `cooldownMs` — see `policies/double-fire.ts`). Engine-contract extension.
   */
  refractoryMs: number
  /**
   * Opt-in: also compare `Fingerprint.text` in SemanticsPolicy. Default false — raw text diffing
   * causes false positives on live-text controls (D14). Engine-contract extension.
   */
  compareText: boolean
  /** See `LastActivation`. Engine-contract extension (DoubleFirePolicy only). */
  lastActivation?: LastActivation
}

export interface Verdict {
  allowed: boolean
  /** Human-readable reason, e.g. "target younger than cooldown (120ms < 500ms)". */
  reason?: string
}

export interface Policy {
  id: PolicyId
  /** Does this policy apply to this input kind? (e.g. continuity: pointer only.) */
  appliesTo(kind: InputKind): boolean
  /**
   * Evaluate at activation. `intent` is the snapshot captured at intent-phase for this
   * interaction (may be undefined for key/virtual with no pointerdown). `activation` is the
   * snapshot at now.
   */
  evaluate(
    intent: TargetSnapshot | undefined,
    activation: TargetSnapshot,
    ctx: PolicyContext,
  ): Verdict
}
