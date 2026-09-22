/**
 * The engine — `createGuard(host, opts)`. Subscribes to the host's normalized event stream,
 * tracks per-interaction intent state, runs the applicable policy pipeline at activation, and
 * reports every decision. Zero DOM — all platform access is through `host`.
 *
 * See `prompts/01-architecture/core-contract.md` ("Engine responsibilities" + "Invariants") and
 * `prompts/03-implementation/conventions.md` (report-by-default, fail-open, a11y carve-out).
 */

import type { Decision } from './decision.js'
import type { Host } from './host.js'
import { agePolicy, continuityPolicy, doubleFirePolicy, semanticsPolicy } from './policies/index.js'
import type { LastActivation, Policy, PolicyContext } from './policy.js'
import type { ActivationEvent, Mode, PolicyId, TargetHandle, TargetSnapshot } from './types.js'

export interface GuardOptions {
  /** Global mode, or per-policy override. Default: 'report' for ALL policies (D6). */
  mode?: Mode | Partial<Record<PolicyId, Mode>>
  /** Age cooldown, ms. Default 500. */
  cooldownMs?: number
  /** Continuity rect-movement tolerance in px. Default 4. */
  rectThresholdPx?: number
  /**
   * DoubleFire's post-activation refractory window, ms. Default 300 (a dedicated, smaller value
   * than `cooldownMs`; see `policies/double-fire.ts`). Engine-contract extension beyond the
   * initial `core-contract.md` draft.
   */
  refractoryMs?: number
  /**
   * Opt-in: also compare `Fingerprint.text` in SemanticsPolicy. Default false (D14). Engine-
   * contract extension beyond the initial `core-contract.md` draft.
   */
  semanticsTextCheck?: boolean
  /** Which policies run. Default: all four. */
  policies?: PolicyId[]
  /** Fires for EVERY decision — allow and block — in BOTH report and enforce. */
  onDecision?: (d: Decision) => void
}

export interface Guard {
  destroy(): void
  /** Was the most recent activation for this handle enforced-blocked? Powers React's isGuarded. */
  isGuarded(target: TargetHandle): boolean
}

const DEFAULT_COOLDOWN_MS = 500
const DEFAULT_RECT_THRESHOLD_PX = 4
const DEFAULT_REFRACTORY_MS = 300

/** Pipeline order. Continuity + Semantics (near-zero false-positive) are checked before Age/DoubleFire. */
const ALL_POLICIES: readonly Policy[] = [
  continuityPolicy,
  semanticsPolicy,
  agePolicy,
  doubleFirePolicy,
]

interface IntentEntry {
  target: TargetHandle
  snapshot: TargetSnapshot
}

export function createGuard(host: Host, opts: GuardOptions = {}): Guard {
  const cooldownMs = opts.cooldownMs ?? DEFAULT_COOLDOWN_MS
  const rectThresholdPx = opts.rectThresholdPx ?? DEFAULT_RECT_THRESHOLD_PX
  const refractoryMs = opts.refractoryMs ?? DEFAULT_REFRACTORY_MS
  const compareText = opts.semanticsTextCheck ?? false
  const enabledIds = new Set<PolicyId>(
    opts.policies ?? ['age', 'continuity', 'semantics', 'doubleFire'],
  )
  const policies = ALL_POLICIES.filter((p) => enabledIds.has(p.id))

  function modeFor(policyId: PolicyId): Mode {
    if (typeof opts.mode === 'string') return opts.mode
    return opts.mode?.[policyId] ?? 'report'
  }

  // Pointer-id-scoped intent (cleared on pointercancel/lostpointercapture and after activation).
  const pointerIntents = new Map<number, IntentEntry>()
  // Target-scoped fallback intent — lets key/virtual activations use a host-supplied intent
  // snapshot (e.g. first-visible) when no pointerId is involved. See `policies/semantics.ts`.
  const lastIntentByTarget = new WeakMap<TargetHandle, TargetSnapshot>()
  // Enforced-block state per target, for `isGuarded`.
  const guardedState = new WeakMap<TargetHandle, boolean>()
  // Last committed (allowed) pointer activation, for DoubleFirePolicy.
  let lastActivation: LastActivation | undefined

  let destroyed = false

  const unsubscribeEvent = host.onActivationEvent((e) => handleEvent(e))
  const unsubscribeClear = host.onIntentClear((signal) => {
    const entry = pointerIntents.get(signal.pointerId)
    if (entry) {
      lastIntentByTarget.delete(entry.target)
    }
    pointerIntents.delete(signal.pointerId)
  })

  function handleEvent(e: ActivationEvent): void {
    if (destroyed) return

    if (e.phase === 'intent') {
      recordIntent(e)
      return
    }

    handleActivation(e)
  }

  function recordIntent(e: ActivationEvent): void {
    let snapshot: TargetSnapshot
    try {
      snapshot = host.snapshot(e.target)
    } catch {
      // Fail open (D7): if we can't read the target at intent time, simply don't store one.
      return
    }
    const entry: IntentEntry = { target: e.target, snapshot }
    if (e.pointerId !== undefined) {
      pointerIntents.set(e.pointerId, entry)
    }
    lastIntentByTarget.set(e.target, snapshot)
  }

  function handleActivation(e: ActivationEvent): void {
    const intentEntry = e.pointerId !== undefined ? pointerIntents.get(e.pointerId) : undefined
    const intentSnapshot = intentEntry?.snapshot ?? lastIntentByTarget.get(e.target)

    // Clear consumed intent state regardless of outcome below.
    if (e.pointerId !== undefined) pointerIntents.delete(e.pointerId)
    lastIntentByTarget.delete(e.target)

    // Absolute prohibitions (D11): never block Escape/focus/scroll, in any mode.
    if (e.neverBlock === true) {
      emit(e, { allowed: true, enforced: false })
      guardedState.set(e.target, false)
      return
    }

    let activationSnapshot: TargetSnapshot
    try {
      activationSnapshot = host.snapshot(e.target)
    } catch {
      // Fail open (D7): can't read the target now → allow, no block.
      emit(e, { allowed: true, enforced: false, reason: 'snapshot failed: fail open' })
      guardedState.set(e.target, false)
      return
    }

    // `data-guard="off"` opt-out (also never blocked, in any mode).
    if (activationSnapshot.guardOff) {
      emit(e, { allowed: true, enforced: false, target: activationSnapshot })
      guardedState.set(e.target, false)
      return
    }

    const ctx: PolicyContext = {
      now: host.now(),
      cooldownMs,
      rectThresholdPx,
      refractoryMs,
      compareText,
      lastActivation,
    }

    let blockedBy: PolicyId | undefined
    let reason: string | undefined

    for (const policy of policies) {
      if (!policy.appliesTo(e.kind)) continue

      let verdict: { allowed: boolean; reason?: string }
      try {
        verdict = policy.evaluate(intentSnapshot, activationSnapshot, ctx)
      } catch {
        // Fail open (D7): a throwing policy never blocks; just skip to the next one.
        continue
      }

      if (!verdict.allowed) {
        blockedBy = policy.id
        reason = verdict.reason
        break
      }
    }

    const allowed = blockedBy === undefined
    const enforced = blockedBy !== undefined && modeFor(blockedBy) === 'enforce'

    if (enforced) {
      host.block(e)
    }

    guardedState.set(e.target, enforced)

    if (allowed && (e.kind === 'mouse' || e.kind === 'touch' || e.kind === 'pen')) {
      lastActivation = {
        time: ctx.now,
        identity: activationSnapshot.identity,
        rect: activationSnapshot.rect,
      }
    }

    emit(e, { allowed, enforced, policy: blockedBy, reason, target: activationSnapshot })
  }

  function emit(
    e: ActivationEvent,
    partial: {
      allowed: boolean
      enforced: boolean
      policy?: PolicyId
      reason?: string
      target?: TargetSnapshot
    },
  ): void {
    if (opts.onDecision === undefined) return
    const target = partial.target
    const decision: Decision = {
      allowed: partial.allowed,
      enforced: partial.enforced,
      policy: partial.policy,
      reason: partial.reason,
      event: { kind: e.kind, phase: e.phase },
      target: {
        identity: target?.identity,
        ageMs: target?.ageMs ?? Number.POSITIVE_INFINITY,
        guardKey: target?.fingerprint.guardKey,
      },
    }
    opts.onDecision(decision)
  }

  return {
    destroy(): void {
      if (destroyed) return
      destroyed = true
      unsubscribeEvent()
      unsubscribeClear()
      pointerIntents.clear()
    },
    isGuarded(target: TargetHandle): boolean {
      return guardedState.get(target) ?? false
    },
  }
}
