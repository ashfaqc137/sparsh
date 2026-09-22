/**
 * SemanticsPolicy — meaning. Fingerprints the target at intent, re-checks at activation, blocks
 * on a meaningful change. `disabled`→enabled is the flagship, near-free check (D14). Raw `text`
 * diffing is opt-in via `ctx.compareText` to avoid false positives on live-text controls.
 *
 * Applies to ALL input kinds — meaning changes matter regardless of modality.
 * See `prompts/02-policies/semantics.md`.
 */

import type { Policy, PolicyContext, Verdict } from '../policy.js'
import type { Fingerprint, InputKind, TargetSnapshot } from '../types.js'

/** Fields always compared, regardless of `compareText`. */
const DEFAULT_FIELDS = ['disabled', 'ariaLabel', 'role', 'hrefOrValue', 'guardKey'] as const

export const semanticsPolicy: Policy = {
  id: 'semantics',

  appliesTo(_kind: InputKind): boolean {
    return true
  },

  evaluate(
    intent: TargetSnapshot | undefined,
    activation: TargetSnapshot,
    ctx: PolicyContext,
  ): Verdict {
    // No stored intent (no pointerdown, and no host-supplied first-visible anchor for
    // key/virtual) → nothing to compare against, fail open.
    if (intent === undefined) {
      return { allowed: true }
    }

    const a = intent.fingerprint
    const b = activation.fingerprint

    for (const field of DEFAULT_FIELDS) {
      if (a[field] !== b[field]) {
        return {
          allowed: false,
          reason: `fingerprint.${field} changed (${describe(a[field])} → ${describe(b[field])})`,
        }
      }
    }

    if (ctx.compareText && a.text !== b.text) {
      return {
        allowed: false,
        reason: `fingerprint.text changed (${describe(a.text)} → ${describe(b.text)})`,
      }
    }

    return { allowed: true }
  },
}

function describe(v: Fingerprint[keyof Fingerprint]): string {
  return v === undefined ? 'undefined' : JSON.stringify(v)
}
