'use client'

/**
 * `<ActivationGuardProvider>` — the primary React API (T18). Installs exactly one guard, via
 * `@sparshlabs/dom`'s `createGuard`, on a root subtree, in an effect, with SSR safety and clean
 * teardown. Global-by-default is the point: you can't predict which control renders late.
 *
 * `GuardContext` is co-located here (not a separate `context.ts`) to keep `packages/react/src`
 * flat, mirroring `@sparshlabs/core`/`@sparshlabs/dom`'s flat-`src` convention.
 */

import type { Decision, TargetHandle } from '@sparshlabs/core'
import { type DomGuardOptions, type Guard, createGuard } from '@sparshlabs/dom'
import { type ReactNode, createContext, useEffect, useMemo, useRef } from 'react'

export interface GuardContextValue {
  /** Was the most recent activation for this handle enforced-blocked? Powers `useActivationGuard`. */
  isGuarded(target: TargetHandle): boolean
  /** Subscribe to every decision the guard emits; returns an unsubscribe function. */
  subscribeDecision(listener: (decision: Decision) => void): () => void
}

const noopUnsubscribe = (): void => {}

/** Stable module-level default so consumers of `useActivationGuard` without a provider don't throw. */
const defaultGuardContextValue: GuardContextValue = {
  isGuarded: () => false,
  subscribeDecision: () => noopUnsubscribe,
}

export const GuardContext = createContext<GuardContextValue>(defaultGuardContextValue)

export interface ActivationGuardProviderProps extends DomGuardOptions {
  children?: ReactNode
  /** Fires for decisions where `allowed === false` — convenience over `onDecision`. */
  onSuspect?: (decision: Decision) => void
  /**
   * Explicit root to attach the guard to, bypassing the default `display: contents` wrapper
   * element. Useful when the provider can't own a DOM node of its own (e.g. attaching to
   * `document.body` or a portal target).
   */
  root?: Element | Document
}

/**
 * Serializes the option set the guard cares about so the effect only recreates `createGuard` on a
 * meaningful change, not on every render (perf + avoids losing in-flight intent state). `mode` and
 * `policies` can be objects/arrays, so they're included via `JSON.stringify` rather than reference
 * equality — correctness over micro-perf, per T18's "memoize on the option set" note.
 */
function serializeOptions(opts: DomGuardOptions): string {
  const {
    mode,
    cooldownMs,
    rectThresholdPx,
    refractoryMs,
    semanticsTextCheck,
    policies,
    clickSuppressMs,
    blockAnimation,
    blockAnimationMs,
    onBlocked,
  } = opts
  return JSON.stringify({
    mode,
    cooldownMs,
    rectThresholdPx,
    refractoryMs,
    semanticsTextCheck,
    policies,
    clickSuppressMs,
    blockAnimation,
    blockAnimationMs,
    hasCustomBlockFeedback: onBlocked !== undefined,
  })
}

export function ActivationGuardProvider(props: ActivationGuardProviderProps): ReactNode {
  const { children, onDecision, onSuspect, root, ...domOpts } = props

  // display:contents wrapper — zero layout footprint, used only when `root` isn't supplied.
  // NOTE: verify display:contents under flex/grid parents in the consuming app (see demo, T20);
  // some older browsers/flex contexts can treat `display:contents` children unusually.
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const guardRef = useRef<Guard | null>(null)
  const listenersRef = useRef<Set<(decision: Decision) => void>>(new Set())

  // "Latest ref" pattern: updated every render (cheap — just an assignment), read from inside the
  // lifecycle effect below. This keeps the effect's dependency list to just `[root, optionsKey]`
  // (recreate the guard only on a meaningful option change) while `onDecision`/`onSuspect` and the
  // rest of `domOpts` are always current, without biome/eslint's exhaustive-deps complaining and
  // without forcing a guard recreation just because a new inline callback was passed.
  const domOptsRef = useRef(domOpts)
  domOptsRef.current = domOpts
  const onDecisionRef = useRef(onDecision)
  onDecisionRef.current = onDecision
  const onSuspectRef = useRef(onSuspect)
  onSuspectRef.current = onSuspect
  const onBlockedRef = useRef(domOpts.onBlocked)
  onBlockedRef.current = domOpts.onBlocked

  // Stable forever: closes over refs, never needs to change identity across renders, so context
  // consumers (the hook) don't re-render just because the provider re-rendered.
  const contextValue = useMemo<GuardContextValue>(
    () => ({
      isGuarded: (target) => guardRef.current?.isGuarded(target) ?? false,
      subscribeDecision: (listener) => {
        listenersRef.current.add(listener)
        return () => {
          listenersRef.current.delete(listener)
        }
      },
    }),
    [],
  )

  // A plain primitive (string) dependency: React's `Object.is` comparison on it already gives us
  // "only re-run when the option set actually changes" for free — no extra memoization needed.
  const optionsKey = serializeOptions(domOpts)

  useEffect(() => {
    const rootNode = root ?? wrapperRef.current
    if (rootNode === null || rootNode === undefined) return undefined
    // `optionsKey` is read here purely so it's the recreation trigger below — the actual option
    // VALUES always come from `domOptsRef.current` (the "latest ref" pattern above), so updating
    // callbacks/options alone (without changing `optionsKey`) never tears down/recreates the guard.
    void optionsKey

    const guard = createGuard(rootNode, {
      ...domOptsRef.current,
      ...(domOptsRef.current.onBlocked === undefined
        ? {}
        : { onBlocked: (element) => onBlockedRef.current?.(element) }),
      onDecision: (decision) => {
        onDecisionRef.current?.(decision)
        if (decision.allowed === false) onSuspectRef.current?.(decision)
        for (const listener of listenersRef.current) listener(decision)
      },
    })
    guardRef.current = guard

    return () => {
      guard.destroy()
      guardRef.current = null
    }
  }, [root, optionsKey])

  if (root !== undefined) {
    return <GuardContext.Provider value={contextValue}>{children}</GuardContext.Provider>
  }

  return (
    <GuardContext.Provider value={contextValue}>
      <div ref={wrapperRef} style={{ display: 'contents' }}>
        {children}
      </div>
    </GuardContext.Provider>
  )
}
