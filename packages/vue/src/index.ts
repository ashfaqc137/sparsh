/**
 * `@sparsh/vue` — the Vue 3 (Composition API) binding for sparsh: `ActivationGuardProvider`,
 * `useActivationGuard()`, `ActivationGuard`. Thin layer over `@sparsh/dom`'s `createGuard`,
 * mirroring `@sparsh/react`'s surface.
 */

export {
  ActivationGuardProvider,
  type ActivationGuardProviderProps,
  type GuardContextValue,
  GuardKey,
} from './ActivationGuardProvider.js'
export { useActivationGuard, type UseActivationGuardResult } from './useActivationGuard.js'
export { ActivationGuard, type ActivationGuardProps } from './ActivationGuard.js'

// Re-exported for convenience so consumers don't need a direct `@sparsh/core` dependency.
export type {
  ActivationEvent,
  Decision,
  Fingerprint,
  Guard,
  GuardOptions,
  Host,
  InputKind,
  Mode,
  PolicyId,
  Rect,
  TargetHandle,
  TargetSnapshot,
} from '@sparsh/core'
export type { DomGuardOptions, DomHost, DomHostOptions } from '@sparsh/dom'
