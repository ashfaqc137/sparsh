/**
 * Shared, non-component pieces of `@sparshlabs/svelte`: the context key and value type, the props
 * type, and `serializeOptions`. They live in a plain module, not the provider's `.svelte` file,
 * because `useActivationGuard.svelte.ts` and `index.ts` need to import them and a component's
 * `<script module>` exports are awkward to type. This is the one break from the other packages'
 * "co-locate the context with the provider" layout.
 */

import type { Decision, TargetHandle } from '@sparshlabs/core'
import type { DomGuardOptions } from '@sparshlabs/dom'
import type { Snippet } from 'svelte'

export interface GuardContextValue {
  /** Was the most recent activation for this handle enforced-blocked? Powers `useActivationGuard`. */
  isGuarded(target: TargetHandle): boolean
  /** Subscribe to every decision the guard emits; returns an unsubscribe function. */
  subscribeDecision(listener: (decision: Decision) => void): () => void
}

const noopUnsubscribe = (): void => {}

/** Fallback for `useActivationGuard()` called without an ancestor provider — never throws. */
export const defaultGuardContextValue: GuardContextValue = {
  isGuarded: () => false,
  subscribeDecision: () => noopUnsubscribe,
}

/** Context key for `setContext`/`getContext` — Vue's `GuardKey`, React's/Solid's `GuardContext`. */
export const GuardKey: unique symbol = Symbol('sparsh:guard')

export interface ActivationGuardProviderProps extends DomGuardOptions {
  children?: Snippet
  /** Fires for decisions where `allowed === false` — convenience over `onDecision`. */
  onSuspect?: (decision: Decision) => void
  /**
   * Explicit root to attach the guard to, bypassing the default `display: contents` wrapper
   * element. Useful when the provider can't own a DOM node of its own (e.g. attaching to
   * `document.body` or a portal target).
   */
  root?: Element | Document
}

/**
 * Serializes the option set the guard cares about so the effect only recreates `createGuard` on a
 * meaningful change, not on every prop update (perf + avoids losing in-flight intent state).
 * `mode` and `policies` can be objects/arrays, so they're included via `JSON.stringify` rather
 * than reference equality — correctness over micro-perf, mirrors the other bindings'
 * `serializeOptions`.
 */
export function serializeOptions(opts: DomGuardOptions): string {
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
