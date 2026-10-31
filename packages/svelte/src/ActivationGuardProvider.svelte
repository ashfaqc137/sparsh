<!--
  `ActivationGuardProvider` — the primary Svelte 5 API. Installs exactly one guard, via
  `@sparshlabs/dom`'s `createGuard`, on a root subtree, in an effect, with clean teardown.
  Global-by-default is the point: you can't predict which control renders late.

  Mirrors `@sparshlabs/react`/`@sparshlabs/vue`/`@sparshlabs/solidjs`'s `ActivationGuardProvider`
  1:1. Svelte's `setContext`/`getContext` is the structural equivalent of React context / Vue's
  `provide`/`inject`.
-->
<script lang="ts">
  import type { Decision } from '@sparshlabs/core'
  import { type Guard, createGuard } from '@sparshlabs/dom'
  import { setContext, untrack } from 'svelte'
  import {
    type ActivationGuardProviderProps,
    type GuardContextValue,
    GuardKey,
    serializeOptions,
  } from './context.js'

  // Destructured props stay live: reading `onDecision` etc. inside the guard's callbacks always
  // sees the latest value, so no React-style "latest ref" is needed.
  const {
    children,
    onDecision,
    onSuspect,
    onBlocked,
    root,
    ...domOpts
  }: ActivationGuardProviderProps = $props()

  // display:contents wrapper — zero layout footprint, used only when `root` isn't supplied.
  // `$state` so the effect re-runs when the wrapper appears (e.g. `root` is unset later).
  let wrapperEl: HTMLDivElement | null = $state(null)
  let guard: Guard | null = null
  const listeners = new Set<(decision: Decision) => void>()

  // Stable forever: the component's script runs exactly once per instance (like Vue's `setup()`),
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
  setContext(GuardKey, contextValue)

  // A derived string: Svelte's equality check on it gives us "only re-run when the option set
  // actually changes" for free, mirroring React's `optionsKey`.
  const optionsKey = $derived(serializeOptions({ ...domOpts, onBlocked }))

  // Effects never run during SSR, so the server never creates a guard. On the client this runs
  // after the children (and the wrapper's `bind:this`) exist, matching React's `useEffect` / Vue's
  // `onMounted`, and re-runs only when `optionsKey`, `root` or the wrapper element changes.
  $effect(() => {
    optionsKey
    const rootNode = root ?? wrapperEl
    if (rootNode === null) return
    const created = untrack(() =>
      createGuard(rootNode, {
        ...domOpts,
        ...(onBlocked === undefined ? {} : { onBlocked: (element) => onBlocked?.(element) }),
        onDecision: (decision) => {
          onDecision?.(decision)
          if (decision.allowed === false) onSuspect?.(decision)
          for (const listener of listeners) listener(decision)
        },
      }),
    )
    guard = created
    return () => {
      created.destroy()
      if (guard === created) guard = null
    }
  })
</script>

<!-- Only flips when `root` goes between set and unset; switching between two roots keeps the
     children mounted. -->
{#if root === undefined}
  <div style="display: contents" bind:this={wrapperEl}>{@render children?.()}</div>
{:else}
  {@render children?.()}
{/if}
