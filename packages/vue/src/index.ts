/**
 * `@sparshlabs/vue` — the Vue 3 (Composition API) binding for sparsh: `ActivationGuardProvider`,
 * `useActivationGuard()`, `ActivationGuard`. Thin layer over `@sparshlabs/dom`'s `createGuard`,
 * mirroring `@sparshlabs/react`'s surface.
 */

export {
  ActivationGuardProvider,
  type ActivationGuardProviderProps,
  type GuardContextValue,
  GuardKey,
} from './ActivationGuardProvider.js'
export { useActivationGuard, type UseActivationGuardResult } from './useActivationGuard.js'
export { ActivationGuard, type ActivationGuardProps } from './ActivationGuard.js'

// Re-exported for convenience so consumers don't need a direct `@sparshlabs/core` dependency.
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
} from '@sparshlabs/core'
export type { DomGuardOptions, DomHost, DomHostOptions } from '@sparshlabs/dom'
