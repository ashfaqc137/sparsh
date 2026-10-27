/**
 * `@sparshlabs/angular` — the Angular binding for sparsh: the `[sparshGuard]` directive,
 * `provideActivationGuard()`, and the `[sparshGuardTarget]` directive. Thin layer over
 * `@sparshlabs/dom`'s `createGuard`, covering the same surface as `@sparshlabs/react`/`vue` in
 * Angular idiom (directives + DI instead of components + context).
 */

export { ActivationGuardDirective } from './ActivationGuardDirective'
export { ActivationGuardTarget } from './ActivationGuardTarget'
export { type ActivationGuardConfig, provideActivationGuard } from './provideActivationGuard'
export { GUARD_CONTEXT, type GuardContextValue } from './GuardContext'

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
