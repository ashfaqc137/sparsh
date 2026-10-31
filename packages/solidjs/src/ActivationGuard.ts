/**
 * `ActivationGuard` (optional) — a subtree wrapper for scoping/overriding guard options within a
 * region. Implemented as a nested `ActivationGuardProvider`: still just one listener per provider
 * instance (D10's "provider root" framing applies recursively), and this is the documented
 * mechanism for subtree-scoped overrides — it does not attempt to merge/inherit an ancestor
 * provider's options, it simply installs its own guard, scoped to its own subtree root, with
 * whatever options are passed to it. Mirrors `@sparshlabs/react`'s `<ActivationGuard>` 1:1.
 */

import {
  ActivationGuardProvider,
  type ActivationGuardProviderProps,
} from './ActivationGuardProvider.js'

export type ActivationGuardProps = ActivationGuardProviderProps

export const ActivationGuard = ActivationGuardProvider
