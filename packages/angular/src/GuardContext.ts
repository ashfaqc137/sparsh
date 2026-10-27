/**
 * The guard context — what descendants of a guard (`[sparshGuardTarget]`) see through DI. Angular's
 * `InjectionToken` is the structural equivalent of React's `createContext` / Vue's `InjectionKey`:
 * a `[sparshGuard]` directive provides it to its element-injector subtree, and
 * `provideActivationGuard()` provides it app-wide from an environment injector, so DI's normal
 * nearest-provider lookup resolves the closest guard for free.
 */

import { InjectionToken } from '@angular/core'
import type { Decision, TargetHandle } from '@sparshlabs/core'

export interface GuardContextValue {
  /** Was the most recent activation for this handle enforced-blocked? Powers `[sparshGuardTarget]`. */
  isGuarded(target: TargetHandle): boolean
  /** Subscribe to every decision the guard emits; returns an unsubscribe function. */
  subscribeDecision(listener: (decision: Decision) => void): () => void
}

const noopUnsubscribe = (): void => {}

/** Fallback for `[sparshGuardTarget]` used without any guard above it — never throws. */
export const defaultGuardContextValue: GuardContextValue = {
  isGuarded: () => false,
  subscribeDecision: () => noopUnsubscribe,
}

export const GUARD_CONTEXT = new InjectionToken<GuardContextValue>('sparsh:guard')
