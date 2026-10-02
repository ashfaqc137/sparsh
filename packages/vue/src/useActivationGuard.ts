/**
 * `useActivationGuard()` — the per-element escape hatch and legibility surface: returns a `ref`
 * callback to attach to the element the consumer wants to observe, and `isGuarded` (a reactive
 * `Ref<boolean>`) reflecting whether that element's most recent activation was blocked. Mirrors
 * `@sparsh/react`'s `useActivationGuard` 1:1 — a composable, not a mixin/directive, for the same
 * reason React uses a hook not a HOC (D16): the guard needs a real DOM node, and the ref must be
 * handed to it directly.
 *
 * Composition-API-only (v1): this composable can only be called from inside `setup()` (or
 * `<script setup>`), so an Options API component cannot call it directly. Options API support is
 * intentionally deferred — see `prompts/01-architecture/packages.md` for the decision.
 */

import type { TargetHandle } from '@sparsh/core'
import { type Ref, inject, onBeforeUnmount, onMounted, ref } from 'vue'
import { GuardKey, defaultGuardContextValue } from './ActivationGuardProvider.js'

export interface UseActivationGuardResult {
  /** Attach to the DOM element (via `:ref="ref"`) to observe. */
  ref: (node: Element | null) => void
  /** True when this element's most recent activation was enforced-blocked. Reactive. */
  isGuarded: Ref<boolean>
}

export function useActivationGuard(): UseActivationGuardResult {
  const { isGuarded: checkGuarded, subscribeDecision } = inject(GuardKey, defaultGuardContextValue)

  // Plain mutable holder (not a `Ref`) — the element itself doesn't need to be reactive, only
  // `isGuarded` does; mirrors React's `elementRef` (a `useRef`, not `useState`).
  const elementHolder: { current: Element | null } = { current: null }
  const isGuarded = ref(false)

  const refCallback = (node: Element | null): void => {
    elementHolder.current = node
    isGuarded.value = node === null ? false : checkGuarded(node as unknown as TargetHandle)
  }

  // Event-driven, not polling: re-check only when the guard reports a decision for our element.
  let unsubscribe: (() => void) | undefined
  onMounted(() => {
    unsubscribe = subscribeDecision((decision) => {
      const el = elementHolder.current
      if (el === null) return
      if (decision.target.identity !== el) return
      isGuarded.value = checkGuarded(el as unknown as TargetHandle)
    })
  })

  onBeforeUnmount(() => {
    unsubscribe?.()
  })

  return { ref: refCallback, isGuarded }
}
