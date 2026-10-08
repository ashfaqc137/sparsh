/**
 * `ActivationGuardProvider` — the primary Vue 3 (Composition API) API. Installs exactly one
 * guard, via `@sparsh/dom`'s `createGuard`, on a root subtree, in a lifecycle hook, with clean
 * teardown. Global-by-default is the point: you can't predict which control renders late.
 *
 * Mirrors `@sparsh/react`'s `ActivationGuardProvider` 1:1. Vue's `provide`/`inject` is the
 * structural equivalent of React context — `provide()` is called once in `setup()` for the whole
 * component subtree, so (unlike React) no extra wrapper component is needed just to host the
 * context value.
 *
 * `GuardKey` is co-located here (not a separate `context.ts`) to keep `packages/vue/src` flat,
 * mirroring `@sparsh/core`/`@sparsh/dom`/`@sparsh/react`'s flat-`src` convention.
 */

import type { Decision, TargetHandle } from '@sparsh/core'
import { type DomGuardOptions, type Guard, createGuard } from '@sparsh/dom'
import {
  type InjectionKey,
  type SetupContext,
  computed,
  defineComponent,
  h,
  onBeforeUnmount,
  onMounted,
  provide,
  ref,
  watch,
} from 'vue'

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

/** Vue's `InjectionKey` — the typed `provide`/`inject` equivalent of React's `createContext`. */
export const GuardKey: InjectionKey<GuardContextValue> = Symbol('sparsh:guard')

export interface ActivationGuardProviderProps extends DomGuardOptions {
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
 * Runtime prop names only (no validators/defaults) — paired with the explicit `Props` type
 * annotation on the setup function below, this is Vue 3.3+'s "two-argument `defineComponent`"
 * form, giving full compile-time prop types without the ceremony of per-prop `PropType` casts.
 */
const PROVIDER_PROP_NAMES = [
  'mode',
  'onDecision',
  'onSuspect',
  'root',
  'cooldownMs',
  'rectThresholdPx',
  'refractoryMs',
  'semanticsTextCheck',
  'policies',
  'clickSuppressMs',
  'blockAnimation',
  'blockAnimationMs',
  'onBlocked',
] as const

/**
 * Serializes the option set the guard cares about so the watcher only recreates `createGuard` on
 * a meaningful change, not on every prop update (perf + avoids losing in-flight intent state).
 * `mode` and `policies` can be objects/arrays, so they're included via `JSON.stringify` rather
 * than reference equality — correctness over micro-perf, mirrors `@sparsh/react`'s
 * `serializeOptions`.
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

export const ActivationGuardProvider = defineComponent(
  (props: ActivationGuardProviderProps, { slots }: SetupContext) => {
    // display:contents wrapper — zero layout footprint, used only when `root` isn't supplied.
    const wrapperEl = ref<HTMLDivElement | null>(null)
    let guard: Guard | null = null
    const listeners = new Set<(decision: Decision) => void>()

    // Stable forever: setup() runs exactly once per instance (unlike a React render), so this
    // closure over `guard`/`listeners` never needs to be re-created — no React-style "stable via
    // useMemo" dance required.
    const contextValue: GuardContextValue = {
      isGuarded: (target) => guard?.isGuarded(target) ?? false,
      subscribeDecision: (listener) => {
        listeners.add(listener)
        return () => {
          listeners.delete(listener)
        }
      },
    }
    provide(GuardKey, contextValue)

    function domOptsFromProps(): DomGuardOptions {
      const { onSuspect: _onSuspect, onBlocked: _onBlocked, root: _root, ...domOpts } = props
      return domOpts
    }

    // A plain computed (reactive) string: Vue's equality check on it already gives us "only
    // re-run when the option set actually changes" for free, mirroring React's `optionsKey`.
    const optionsKey = computed(() =>
      serializeOptions({ ...domOptsFromProps(), onBlocked: props.onBlocked }),
    )

    function recreateGuard(): void {
      guard?.destroy()
      guard = null
      const rootNode = props.root ?? wrapperEl.value
      if (rootNode === null || rootNode === undefined) return
      guard = createGuard(rootNode, {
        ...domOptsFromProps(),
        ...(props.onBlocked === undefined
          ? {}
          : { onBlocked: (element) => props.onBlocked?.(element) }),
        onDecision: (decision) => {
          props.onDecision?.(decision)
          if (decision.allowed === false) props.onSuspect?.(decision)
          for (const listener of listeners) listener(decision)
        },
      })
    }

    onMounted(recreateGuard)
    // `watch` only fires on subsequent changes (not on initial setup) — `onMounted` above covers
    // the first creation, this covers meaningful option changes thereafter.
    watch(optionsKey, recreateGuard)

    onBeforeUnmount(() => {
      guard?.destroy()
      guard = null
    })

    return () => {
      if (props.root !== undefined) {
        return slots.default?.() ?? null
      }
      return h('div', { ref: wrapperEl, style: { display: 'contents' } }, slots.default?.())
    }
  },
  {
    name: 'ActivationGuardProvider',
    props: [...PROVIDER_PROP_NAMES],
  },
)
