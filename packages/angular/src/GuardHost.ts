/**
 * `GuardHost` (internal) — the guard lifecycle shared by `[sparshGuard]` and
 * `provideActivationGuard()`: owns at most one `@sparshlabs/dom` guard, recreates it only when the
 * option set meaningfully changes, fans decisions out to callbacks and `[sparshGuardTarget]`
 * subscribers, and exposes the stable `GuardContextValue` that DI hands to descendants.
 *
 * Framework-agnostic on purpose (no Angular imports): the directive and the provider differ only in
 * *when* they call `update`/`destroy`, which is Angular-specific and lives with them.
 */

import type { Decision } from '@sparshlabs/core'
import { type DomGuardOptions, type Guard, createGuard } from '@sparshlabs/dom'
import type { GuardContextValue } from './GuardContext'

export interface GuardCallbacks {
  onDecision?: (decision: Decision) => void
  onSuspect?: (decision: Decision) => void
}

/**
 * Serializes the option set the guard cares about so `update` only recreates `createGuard` on a
 * meaningful change, not on every input/change-detection pass (perf + avoids losing in-flight
 * intent state). `mode` and `policies` can be objects/arrays, so they're included via
 * `JSON.stringify` rather than reference equality. Mirrors `serializeOptions` in
 * `@sparshlabs/react`/`@sparshlabs/vue` (adapters never import one another, so it's duplicated).
 */
function serializeOptions(opts: DomGuardOptions): string {
  const {
    mode,
    cooldownMs,
    rectThresholdPx,
    refractoryMs,
    semanticsTextCheck,
    policies,
    clickSuppressMs,
    blockAnimation,
    blockAnimationMs,
    onBlocked,
  } = opts
  return JSON.stringify({
    mode,
    cooldownMs,
    rectThresholdPx,
    refractoryMs,
    semanticsTextCheck,
    policies,
    clickSuppressMs,
    blockAnimation,
    blockAnimationMs,
    hasCustomBlockFeedback: onBlocked !== undefined,
  })
}

export class GuardHost {
  private guard: Guard | null = null
  private root: Element | Document | null = null
  private key: string | null = null
  private readonly listeners = new Set<(decision: Decision) => void>()

  /** Stable for the host's lifetime — safe to hand to DI once. */
  readonly context: GuardContextValue = {
    isGuarded: (target) => this.guard?.isGuarded(target) ?? false,
    subscribeDecision: (listener) => {
      this.listeners.add(listener)
      return () => {
        this.listeners.delete(listener)
      }
    },
  }

  /**
   * Creates the guard on first call, then recreates it only when `root` or the serialized option
   * set changes. Callbacks are not part of the key — callers pass ones that forward to their latest
   * handler (only `onBlocked`'s presence/absence counts, since it changes host behavior).
   */
  update(root: Element | Document, opts: DomGuardOptions, callbacks: GuardCallbacks): void {
    const key = serializeOptions(opts)
    if (this.guard !== null && root === this.root && key === this.key) return

    this.guard?.destroy()
    this.root = root
    this.key = key
    this.guard = createGuard(root, {
      ...opts,
      onDecision: (decision) => {
        callbacks.onDecision?.(decision)
        if (decision.allowed === false) callbacks.onSuspect?.(decision)
        for (const listener of this.listeners) listener(decision)
      },
    })
  }

  destroy(): void {
    this.guard?.destroy()
    this.guard = null
    this.root = null
    this.key = null
  }
}
