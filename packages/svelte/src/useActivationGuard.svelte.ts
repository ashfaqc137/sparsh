/**
 * `useActivationGuard()` — the per-element escape hatch and legibility surface: returns a `ref`
 * attachment for the element the consumer wants to observe (`<button {@attach ref}>`), and
 * `isGuarded` (an accessor, `isGuarded()`) reflecting whether that element's most recent
 * activation was blocked. Mirrors `@sparshlabs/react`'s `useActivationGuard` /
 * `@sparshlabs/solidjs`'s 1:1 — an attachment rather than a `use:` action because attachments are
 * Svelte 5's ref-callback equivalent (the node in, a cleanup out), and an accessor rather than a
 * getter so `const { ref, isGuarded } = useActivationGuard()` keeps its reactivity.
 *
 * Like any `getContext` caller, it must be called while a component is initialising (in its
 * `<script>`), not later in an event handler.
 */

import type { TargetHandle } from '@sparshlabs/core'
import { getContext } from 'svelte'
import type { Attachment } from 'svelte/attachments'
import { type GuardContextValue, GuardKey, defaultGuardContextValue } from './context.js'

export interface UseActivationGuardResult {
  /** Attach to the DOM element (via `{@attach ref}`) to observe. */
  ref: Attachment<Element>
  /** True when this element's most recent activation was enforced-blocked. Reactive. */
  isGuarded: () => boolean
}

export function useActivationGuard(): UseActivationGuardResult {
  const { isGuarded: checkGuarded, subscribeDecision } =
    getContext<GuardContextValue | undefined>(GuardKey) ?? defaultGuardContextValue

  let guarded = $state(false)

  // Attachments only run in the browser, so the subscription is client-only (like Vue's
  // `onMounted`). Event-driven, not polling: re-check only when the guard reports a decision for
  // our element.
  const ref: Attachment<Element> = (node) => {
    const handle = node as unknown as TargetHandle
    guarded = checkGuarded(handle)
    const unsubscribe = subscribeDecision((decision) => {
      if (decision.target.identity !== node) return
      guarded = checkGuarded(handle)
    })
    return () => {
      unsubscribe()
      guarded = false
    }
  }

  return { ref, isGuarded: () => guarded }
}
