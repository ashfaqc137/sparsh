/**
 * `ActivationGuardProvider` — the primary SolidJS API. Installs exactly one guard, via
 * `@sparshlabs/dom`'s `createGuard`, on a root subtree, in an effect, with clean teardown.
 * Global-by-default is the point: you can't predict which control renders late.
 *
 * Mirrors `@sparshlabs/react`/`@sparshlabs/vue`'s `ActivationGuardProvider` 1:1. Solid's
 * `createContext` is the structural equivalent of React context / Vue's `provide`/`inject`.
 *
 * Written without JSX on purpose (`createComponent`, `Show`, `Dynamic` are what Solid's compiler
 * would emit anyway): tsup can then ship plain JS with no Solid compiler step, and the consumer's
 * bundler resolves `solid-js`/`solid-js/web` to the browser or server build as appropriate, so the
 * same output works for client rendering, SSR and hydration.
 *
 * `GuardContext` is co-located here (not a separate `context.ts`) to keep `packages/solidjs/src`
 * flat, mirroring the other packages' flat-`src` convention.
 */

import type { Decision, TargetHandle } from '@sparshlabs/core'
import { type DomGuardOptions, type Guard, createGuard } from '@sparshlabs/dom'
import {
  type JSX,
  createComponent,
  createContext,
  createEffect,
  createMemo,
  onCleanup,
  splitProps,
  untrack,
} from 'solid-js'
import { Dynamic } from 'solid-js/web'

export interface GuardContextValue {
  /** Was the most recent activation for this handle enforced-blocked? Powers `useActivationGuard`. */
  isGuarded(target: TargetHandle): boolean
  /** Subscribe to every decision the guard emits; returns an unsubscribe function. */
  subscribeDecision(listener: (decision: Decision) => void): () => void
}

const noopUnsubscribe = (): void => {}

/** Fallback for `useActivationGuard()` called without an ancestor provider — never throws. */
export const defaultGuardContextValue: GuardContextValue = {
  isGuarded: () => false,
  subscribeDecision: () => noopUnsubscribe,
}

export const GuardContext = createContext<GuardContextValue>(defaultGuardContextValue)

export interface ActivationGuardProviderProps extends DomGuardOptions {
  children?: JSX.Element
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
 * meaningful change, not on every prop update (perf + avoids losing in-flight intent state).
 * `mode` and `policies` can be objects/arrays, so they're included via `JSON.stringify` rather
 * than reference equality — correctness over micro-perf, mirrors `@sparshlabs/react`'s and
 * `@sparshlabs/vue`'s `serializeOptions`.
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

export function ActivationGuardProvider(props: ActivationGuardProviderProps): JSX.Element {
  // Props stay live getters after the split, so the callbacks below always read the latest
  // `onDecision`/`onSuspect`/`onBlocked` — no React-style "latest ref" needed.
  const [local, domOpts] = splitProps(props, [
    'children',
    'onDecision',
    'onSuspect',
    'onBlocked',
    'root',
  ])

  // display:contents wrapper — zero layout footprint, used only when `root` isn't supplied.
  let wrapperEl: HTMLDivElement | undefined
  let guard: Guard | null = null
  const listeners = new Set<(decision: Decision) => void>()

  // Stable forever: a Solid component body runs exactly once per instance (like Vue's `setup()`),
  // so this closure over `guard`/`listeners` never needs to be re-created.
  const contextValue: GuardContextValue = {
    isGuarded: (target) => guard?.isGuarded(target) ?? false,
    subscribeDecision: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }

  // A memoized string: Solid's equality check on it gives us "only re-run when the option set
  // actually changes" for free, mirroring React's `optionsKey`.
  const optionsKey = createMemo(() => serializeOptions({ ...domOpts, onBlocked: local.onBlocked }))

  // Effects never run during SSR, so the server never creates a guard. On the client this runs
  // after the initial children (and the wrapper's ref) exist, matching React's `useEffect` / Vue's
  // `onMounted`, and re-runs only when `optionsKey` or `root` changes.
  createEffect(() => {
    optionsKey()
    const rootNode = local.root ?? wrapperEl
    if (rootNode === undefined) return
    const created = untrack(() =>
      createGuard(rootNode, {
        ...domOpts,
        ...(local.onBlocked === undefined
          ? {}
          : { onBlocked: (element) => local.onBlocked?.(element) }),
        onDecision: (decision) => {
          local.onDecision?.(decision)
          if (decision.allowed === false) local.onSuspect?.(decision)
          for (const listener of listeners) listener(decision)
        },
      }),
    )
    guard = created
    onCleanup(() => {
      created.destroy()
      if (guard === created) guard = null
    })
  })

  // Only flips when `root` goes between set and unset — switching between two roots keeps the
  // children mounted. Equivalent to `<Show when={!root} fallback={children}>`, spelled as a memo
  // because `createComponent` can't pick one of `Show`'s overloads.
  const usesWrapper = createMemo(() => local.root === undefined)

  return createComponent(GuardContext.Provider, {
    value: contextValue,
    get children() {
      return createMemo(() =>
        usesWrapper()
          ? createComponent(Dynamic, {
              component: 'div',
              ref: (el: HTMLDivElement) => {
                wrapperEl = el
              },
              style: { display: 'contents' },
              get children() {
                return local.children
              },
            })
          : local.children,
      ) as unknown as JSX.Element // Solid's own `Show` uses the same cast: renderers accept accessors.
    },
  })
}
