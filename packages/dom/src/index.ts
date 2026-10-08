/**
 * `@sparsh/dom` — the browser host implementing `@sparsh/core`'s `Host` port, plus the
 * framework-free `createGuard` entry point (T17). This is the reference binding every framework
 * adapter (`@sparsh/react`, future bindings) mirrors.
 */

import type { Guard, GuardOptions, TargetHandle } from '@sparsh/core'
import { createGuard as createCoreGuard } from '@sparsh/core'
import { DEFAULT_BLOCK_ANIMATION_MS, playDefaultBlockAnimation } from './block-animation.js'
import { type DomHost, type DomHostOptions, createDomHost } from './host.js'

export { createDomHost, playDefaultBlockAnimation, DEFAULT_BLOCK_ANIMATION_MS }
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
 * Roots with a currently-active guard, so `createGuard` can warn about overlapping instances
 * (e.g. two `ActivationGuardProvider`s nested over the same subtree — see D10 in
 * `prompts/01-architecture/decisions.md`). Each guard is fully independent — capture-phase
 * listeners stack on overlapping roots, and the outermost one runs first and can stop
 * propagation before an inner one ever sees the event. This is the documented mechanism for
 * intentional subtree-scoped overrides (`<ActivationGuard>`), so the warning is advisory only —
 * it never changes blocking behavior — but it surfaces an easy-to-miss accidental double-wrap.
 */
const activeRoots = new Set<Element | Document>()

function warnOnOverlap(root: Element | Document): void {
  for (const existing of activeRoots) {
    if (existing === root || existing.contains(root) || root.contains(existing)) {
      console.warn(
        '[sparsh] Another guard is already active on an overlapping DOM subtree. Guards never ' +
          'merge or inherit configuration from one another — each installs its own independent ' +
          'listeners and policy pipeline, and the outermost one sees events first. If this is an ' +
          'intentional scoped override (e.g. `<ActivationGuard>`/a nested `ActivationGuardProvider` ' +
          'for one region with different options), this warning can be ignored. Otherwise, make ' +
          'sure the same subtree is only wrapped once.',
      )
      return
    }
  }
}

/**
 * Framework-free entry point: wires `createDomHost` + `core.createGuard` and ties `destroy()` to
 * tear down both the engine and the host's listeners/observers.
 */
export function createGuard(root: Element | Document, opts: DomGuardOptions = {}): Guard {
  warnOnOverlap(root)
  activeRoots.add(root)

  const host = createDomHost(root, opts)
  const guard = createCoreGuard(host, opts)
  let destroyed = false
  return {
    isGuarded(target: TargetHandle): boolean {
      return guard.isGuarded(target)
    },
    destroy(): void {
      if (destroyed) return
      destroyed = true
      activeRoots.delete(root)
      guard.destroy()
      host.destroy()
    },
  }
}
