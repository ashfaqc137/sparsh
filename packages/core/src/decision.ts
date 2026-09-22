/**
 * The Decision — engine → consumer. Fires for EVERY activation (allow and block, in both report
 * and enforce) via `GuardOptions.onDecision`. This is the instrumentation hook.
 */

import type { InputKind, Phase, PolicyId } from './types.js'

export interface DecisionEventInfo {
  kind: InputKind
  phase: Phase
}

export interface DecisionTargetInfo {
  identity: unknown
  ageMs: number
  guardKey?: string
}

export interface Decision {
  /** Policy verdict: would this be allowed if enforced? */
  allowed: boolean
  /** Did sparsh ACTUALLY block it (i.e. verdict was untrusted AND that policy is in enforce mode)? */
  enforced: boolean
  /** Which policy produced the verdict (undefined when allowed by all). */
  policy?: PolicyId
  /** Human-readable reason, e.g. "target younger than cooldown (120ms < 500ms)". */
  reason?: string
  event: DecisionEventInfo
  target: DecisionTargetInfo
}
