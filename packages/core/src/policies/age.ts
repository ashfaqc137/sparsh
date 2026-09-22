/**
 * AgePolicy — perception. Blocks activations on targets younger than `cooldownMs`. All the
 * difficulty is in how the host computes `ageMs` (perceivability, not DOM insertion — D13); the
 * engine-side rule is trivial. Applies to ALL input kinds, including key/virtual (D12) — safe
 * only because Age defaults to `report` (D6).
 *
 * See `prompts/02-policies/age.md`.
 */

import type { Policy, PolicyContext, Verdict } from '../policy.js'
import type { InputKind, TargetSnapshot } from '../types.js'

export const agePolicy: Policy = {
  id: 'age',

  appliesTo(_kind: InputKind): boolean {
    return true
  },

  evaluate(
    _intent: TargetSnapshot | undefined,
    activation: TargetSnapshot,
    ctx: PolicyContext,
  ): Verdict {
    // ageMs === Infinity is the fail-open convention for "unseen / pre-existing element".
    if (activation.ageMs >= ctx.cooldownMs) {
      return { allowed: true }
    }

    return {
      allowed: false,
      reason: `target perceivable for ${activation.ageMs}ms < ${ctx.cooldownMs}ms cooldown`,
    }
  },
}
