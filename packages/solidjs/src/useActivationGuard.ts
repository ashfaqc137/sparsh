/**
 * `useActivationGuard()` — the per-element escape hatch and legibility surface: returns a `ref`
 * callback to attach to the element the consumer wants to observe (`<button ref={ref}>`), and
 * `isGuarded` (an `Accessor<boolean>`) reflecting whether that element's most recent activation
 * was blocked. Mirrors `@sparshlabs/react`'s `useActivationGuard` / `@sparshlabs/vue`'s composable
 * 1:1 — a ref, not a `use:` directive, for the same reason React uses a hook not a HOC (D16): the
 * guard needs a real DOM node, and the ref hands it over directly without extra JSX typings.
 */

import type { TargetHandle } from '@sparshlabs/core'
import { type Accessor, createSignal, onCleanup, onMount, useContext } from 'solid-js'
import { GuardContext } from './ActivationGuardProvider.js'

export interface UseActivationGuardResult {
  /** Attach to the DOM element (via `ref={ref}`) to observe. */
  ref: (node: Element) => void
  /** True when this element's most recent activation was enforced-blocked. Reactive. */
  isGuarded: Accessor<boolean>
}

export function useActivationGuard(): UseActivationGuardResult {
  const { isGuarded: checkGuarded, subscribeDecision } = useContext(GuardContext)

  // Plain variable (not a signal) — the element itself doesn't need to be reactive, only
  // `isGuarded` does; mirrors React's `elementRef` (a `useRef`, not `useState`).
  let element: Element | undefined
  const [isGuarded, setIsGuarded] = createSignal(false)

  const ref = (node: Element): void => {
    element = node
    setIsGuarded(checkGuarded(node as unknown as TargetHandle))
  }

  // Event-driven, not polling: re-check only when the guard reports a decision for our element.
  // `onMount` keeps the subscription client-only, like Vue's `onMounted`.
  onMount(() => {
    const unsubscribe = subscribeDecision((decision) => {
      if (element === undefined) return
      if (decision.target.identity !== element) return
      setIsGuarded(checkGuarded(element as unknown as TargetHandle))
    })
    onCleanup(unsubscribe)
  })

  return { ref, isGuarded }
}
