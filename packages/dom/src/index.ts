/**
 * `@sparsh/dom` — the browser host implementing `@sparsh/core`'s `Host` port, plus the
 * framework-free `createGuard` entry point (T17). This is the reference binding every framework
 * adapter (`@sparsh/react`, future bindings) mirrors.
 */

import type { Guard, GuardOptions, TargetHandle } from '@sparsh/core'
import { createGuard as createCoreGuard } from '@sparsh/core'
import { type DomHost, type DomHostOptions, createDomHost } from './host.js'

export { createDomHost }
export type { DomHost, DomHostOptions }

// Re-exported for convenience so vanilla consumers don't need a direct `@sparsh/core` dependency.
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

export type DomGuardOptions = GuardOptions & DomHostOptions

/**
 * Framework-free entry point: wires `createDomHost` + `core.createGuard` and ties `destroy()` to
 * tear down both the engine and the host's listeners/observers.
 */
export function createGuard(root: Element | Document, opts: DomGuardOptions = {}): Guard {
  const host = createDomHost(root, opts)
  const guard = createCoreGuard(host, opts)
  return {
    isGuarded(target: TargetHandle): boolean {
      return guard.isGuarded(target)
    },
    destroy(): void {
      guard.destroy()
      host.destroy()
    },
  }
}
