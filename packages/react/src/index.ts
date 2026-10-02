/**
 * `@sparsh/react` — the React binding for sparsh (T18/T19): `<ActivationGuardProvider>`,
 * `useActivationGuard()`, `<ActivationGuard>`. Thin layer over `@sparsh/dom`'s `createGuard`.
 */

export {
  ActivationGuardProvider,
  type ActivationGuardProviderProps,
  type GuardContextValue,
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
