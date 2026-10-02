'use client'

/**
 * `useActivationGuard()` (T19) — the per-element escape hatch and legibility surface: returns a
 * `ref` to attach to the element the consumer wants to observe, and `isGuarded` (boolean,
 * reactive) reflecting whether that element's most recent activation was blocked. A hook, not a
 * HOC (D16) — the guard needs a real DOM node, and HOC ref-plumbing breaks on class components,
 * `memo`, and ref-swallowing third-party components.
 */

import type { TargetHandle } from '@sparsh/core'
import { useCallback, useContext, useEffect, useRef, useState } from 'react'
import { GuardContext } from './ActivationGuardProvider.js'

export interface UseActivationGuardResult {
  /** Attach to the DOM element (or component accepting a ref-callback) to observe. */
  ref: (node: Element | null) => void
  /** True when this element's most recent activation was enforced-blocked. */
  isGuarded: boolean
}

export function useActivationGuard(): UseActivationGuardResult {
  const { isGuarded: checkGuarded, subscribeDecision } = useContext(GuardContext)
  const elementRef = useRef<Element | null>(null)
  const [isGuarded, setIsGuarded] = useState(false)

  const ref = useCallback(
    (node: Element | null) => {
      elementRef.current = node
      setIsGuarded(node === null ? false : checkGuarded(node as unknown as TargetHandle))
    },
    [checkGuarded],
  )

  // Event-driven, not polling: re-check only when the guard reports a decision for our element.
  useEffect(() => {
    return subscribeDecision((decision) => {
      const el = elementRef.current
      if (el === null) return
      if (decision.target.identity !== el) return
      setIsGuarded(checkGuarded(el as unknown as TargetHandle))
    })
  }, [subscribeDecision, checkGuarded])

  return { ref, isGuarded }
}
