/**
 * DoubleFirePolicy — residual / repeat activation (case 6: ghost click / dialog-collapse
 * residual event). Pointer input only. Deliberately small: combines recency (time since the last
 * committed activation) and novelty (the current target is young, i.e. it was likely just
 * revealed by that prior activation) at overlapping coordinates.
 *
 * Never degrades into a general debounce — a rapid legitimate repeat press on the SAME stable
 * control (`activation.identity === lastActivation.identity`) always passes.
 *
 * See `prompts/02-policies/double-fire.md`.
 */

import type { Policy, PolicyContext, Verdict } from '../policy.js'
import { rectsOverlap } from '../rect.js'
import type { InputKind, TargetSnapshot } from '../types.js'

const POINTER_KINDS: ReadonlySet<InputKind> = new Set(['mouse', 'touch', 'pen'])

export const doubleFirePolicy: Policy = {
  id: 'doubleFire',

  appliesTo(kind: InputKind): boolean {
    return POINTER_KINDS.has(kind)
  },

  evaluate(
    _intent: TargetSnapshot | undefined,
    activation: TargetSnapshot,
    ctx: PolicyContext,
  ): Verdict {
    const last = ctx.lastActivation
    if (last === undefined) {
      return { allowed: true }
    }

    const dt = ctx.now - last.time
    if (dt > ctx.refractoryMs) {
      return { allowed: true }
    }

    // Legitimate rapid repeat press on the SAME stable control — never flag (non-goal: debounce).
    if (activation.identity === last.identity) {
      return { allowed: true }
    }

    const overlapping = rectsOverlap(activation.rect, last.rect)
    const novel = activation.ageMs < ctx.cooldownMs

    if (overlapping && novel) {
      return {
        allowed: false,
        reason: `activation ${dt}ms after a prior activation, on a different (${activation.ageMs}ms old) element at overlapping coordinates`,
      }
    }

    return { allowed: true }
  },
}
