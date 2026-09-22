/**
 * The Host port — implemented by `@sparsh/dom`, a future RN host, and test fakes.
 *
 * This is the one seam through which the engine ever touches the outside world. `@sparsh/core`
 * never imports the DOM directly; all platform access is behind this interface (D5).
 */

import type { ActivationEvent, IntentClearSignal, TargetHandle, TargetSnapshot } from './types.js'

export type Unsubscribe = () => void

export interface Host {
  /**
   * Subscribe to normalized activation events. The host is responsible for capture-phase
   * listening, pointer-id bookkeeping, and cleanup.
   */
  onActivationEvent(cb: (e: ActivationEvent) => void): Unsubscribe

  /**
   * Subscribe to intent-clearing signals (`pointercancel` / `lostpointercapture` in the DOM host).
   * The engine clears any stored intent for the given `pointerId` when this fires.
   */
  onIntentClear(cb: (signal: IntentClearSignal) => void): Unsubscribe

  /** Resolve a raw platform target to the interactive element handle, or null if none. */
  resolveTarget(raw: unknown): TargetHandle | null

  /** Read a target "now". */
  snapshot(target: TargetHandle): TargetSnapshot

  /** Prevent the activation from committing (capture-phase preventDefault + stopPropagation in dom). */
  block(e: ActivationEvent): void

  /** Monotonic clock. */
  now(): number
}
