/**
 * `@sparshlabs/svelte` — the Svelte 5 binding for sparsh: `ActivationGuardProvider`,
 * `useActivationGuard()`, `ActivationGuard`. Thin layer over `@sparshlabs/dom`'s `createGuard`,
 * mirroring `@sparshlabs/react`'s surface.
 */

export { default as ActivationGuardProvider } from './ActivationGuardProvider.svelte'
export {
  type ActivationGuardProviderProps,
  type GuardContextValue,
  GuardKey,
} from './context.js'
export { useActivationGuard, type UseActivationGuardResult } from './useActivationGuard.svelte.js'
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
  Phase,
  PolicyId,
  Rect,
  TargetHandle,
  TargetSnapshot,
} from '@sparshlabs/core'
export type { DomGuardOptions, DomHost, DomHostOptions } from '@sparshlabs/dom'
