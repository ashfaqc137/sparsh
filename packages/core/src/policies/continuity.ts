/**
 * ContinuityPolicy — in-flight press stability. Blocks when the target's identity or position
 * changed between intent (pointerdown) and activation (pointerup/click).
 *
 * Covers case 2 (layout shift), the mid-press variant of case 6, and the mid-press half of case 1
 * (interstitial appears between down and up). Pointer input only — never key/virtual, which have
 * no pointerdown (D11). See `prompts/02-policies/continuity.md`.
 */

import type { Policy, PolicyContext, Verdict } from '../policy.js'
import { rectDelta } from '../rect.js'
import type { InputKind } from '../types.js'
import type { TargetSnapshot } from '../types.js'

const POINTER_KINDS: ReadonlySet<InputKind> = new Set(['mouse', 'touch', 'pen'])

export const continuityPolicy: Policy = {
  id: 'continuity',

  appliesTo(kind: InputKind): boolean {
    return POINTER_KINDS.has(kind)
  },

  evaluate(
    intent: TargetSnapshot | undefined,
    activation: TargetSnapshot,
    ctx: PolicyContext,
  ): Verdict {
    // No stored intent (no preceding pointerdown for this pointerId) → not our case, fail open.
    if (intent === undefined) {
      return { allowed: true }
    }

    if (activation.identity !== intent.identity) {
      return { allowed: false, reason: 'target identity changed between intent and activation' }
    }

    const delta = rectDelta(intent.rect, activation.rect)
    if (delta > ctx.rectThresholdPx) {
      return {
        allowed: false,
        reason: `target displaced ${delta}px (> ${ctx.rectThresholdPx}px threshold) between intent and activation`,
      }
    }

    return { allowed: true }
  },
}
