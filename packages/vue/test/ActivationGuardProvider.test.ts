import type { Decision } from '@sparshlabs/core'
import * as domModule from '@sparshlabs/dom'
import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'
import { ActivationGuardProvider } from '../src/ActivationGuardProvider.js'
import { firePointerEvent } from './dom-events.js'

vi.mock('@sparshlabs/dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@sparshlabs/dom')>()
  return { ...actual, createGuard: vi.fn(actual.createGuard) }
})

const createGuardMock = vi.mocked(domModule.createGuard)

describe('<ActivationGuardProvider>', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    createGuardMock.mockClear()
  })

  afterEach(() => {
    container.remove()
  })

  it('mounts exactly one guard on mount; unmount tears it down (no further decisions)', async () => {
    const decisions: Decision[] = []

    const wrapper = mount(ActivationGuardProvider, {
      attachTo: container,
      props: { mode: 'report', onDecision: (d: Decision) => decisions.push(d) },
      slots: {
        default: () => h('button', { type: 'button', id: 'btn' }, 'Click'),
      },
    })

    expect(createGuardMock).toHaveBeenCalledTimes(1)

    const btn = container.querySelector('#btn') as HTMLButtonElement
    firePointerEvent(btn, 'pointerdown', { pointerId: 1 })
    firePointerEvent(btn, 'pointerup', { pointerId: 1 })
    expect(decisions).toHaveLength(1)

    wrapper.unmount()

    // Further interactions on the (now-detached) button produce no new decisions.
    firePointerEvent(btn, 'pointerdown', { pointerId: 2 })
    firePointerEvent(btn, 'pointerup', { pointerId: 2 })
    expect(decisions).toHaveLength(1)
  })

  it('re-render of children with stable options does not recreate the guard', async () => {
    const App = defineComponent({
      props: { label: { type: String, required: true } },
      setup(props) {
        return () =>
          h(ActivationGuardProvider, { mode: 'report' }, () =>
            h('button', { type: 'button' }, props.label),
          )
      },
    })

    const wrapper = mount(App, { attachTo: container, props: { label: 'one' } })
    expect(createGuardMock).toHaveBeenCalledTimes(1)

    await wrapper.setProps({ label: 'two' })
    expect(createGuardMock).toHaveBeenCalledTimes(1)

    wrapper.unmount()
  })

  it('passes onBlocked feedback and keeps the latest callback without recreating the guard', async () => {
    const firstHandler = vi.fn()
    const latestHandler = vi.fn()
    const App = defineComponent({
      props: { onBlocked: { type: Function, required: true } },
      setup(props) {
        return () =>
          h(
            ActivationGuardProvider,
            { onBlocked: props.onBlocked as (element: Element) => void },
            () => h('button', { type: 'button' }, 'Click'),
          )
      },
    })

    const wrapper = mount(App, { attachTo: container, props: { onBlocked: firstHandler } })
    const button = container.querySelector('button') as HTMLButtonElement
    const hostOptions = createGuardMock.mock.calls[0]?.[1]
    hostOptions?.onBlocked?.(button)
    expect(firstHandler).toHaveBeenCalledWith(button)

    await wrapper.setProps({ onBlocked: latestHandler })
    expect(createGuardMock).toHaveBeenCalledTimes(1)
    hostOptions?.onBlocked?.(button)
    expect(latestHandler).toHaveBeenCalledWith(button)

    wrapper.unmount()
  })

  it('recreates the guard when a meaningful option (cooldownMs) changes', async () => {
    const App = defineComponent({
      props: { cooldownMs: { type: Number, required: true } },
      setup(props) {
        return () =>
          h(ActivationGuardProvider, { mode: 'report', cooldownMs: props.cooldownMs }, () =>
            h('button', { type: 'button' }, 'btn'),
          )
      },
    })

    const wrapper = mount(App, { attachTo: container, props: { cooldownMs: 500 } })
    expect(createGuardMock).toHaveBeenCalledTimes(1)

    await wrapper.setProps({ cooldownMs: 1000 })
    expect(createGuardMock).toHaveBeenCalledTimes(2)

    wrapper.unmount()
  })

  it('report mode: onDecision and onSuspect fire; the action still runs (nothing blocked)', async () => {
    const decisions: Decision[] = []
    const suspects: Decision[] = []
    let bubbleFired = false

    const wrapper = mount(ActivationGuardProvider, {
      attachTo: container,
      props: {
        mode: 'report',
        onDecision: (d: Decision) => decisions.push(d),
        onSuspect: (d: Decision) => suspects.push(d),
      },
      slots: {
        default: () =>
          h(
            'button',
            {
              type: 'button',
              id: 'btn',
              onPointerup: () => {
                bubbleFired = true
              },
            },
            'Click',
          ),
      },
    })

    const btn = container.querySelector('#btn') as HTMLButtonElement
    // Continuity would flag this (displaced between pointerdown/pointerup), but report mode must
    // never block — the handler still runs.
    firePointerEvent(btn, 'pointerdown', { pointerId: 1 })
    btn.getBoundingClientRect = () => ({ x: 999, y: 999, width: 10, height: 10 }) as DOMRect
    firePointerEvent(btn, 'pointerup', { pointerId: 1 })

    expect(decisions).toHaveLength(1)
    expect(decisions[0]?.allowed).toBe(false)
    expect(decisions[0]?.enforced).toBe(false)
    expect(suspects).toHaveLength(1)
    expect(bubbleFired).toBe(true)

    wrapper.unmount()
  })

  it('warns when nested inside another ActivationGuardProvider (overlapping subtree)', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const wrapper = mount(ActivationGuardProvider, {
      attachTo: container,
      props: { mode: 'report' },
      slots: {
        default: () =>
          h(ActivationGuardProvider, { mode: { age: 'report' } }, () =>
            h('button', { type: 'button' }, 'Click'),
          ),
      },
    })

    expect(warnSpy).toHaveBeenCalledTimes(1)
    expect(warnSpy.mock.calls[0]?.[0]).toContain('[sparsh]')

    wrapper.unmount()
    warnSpy.mockRestore()
  })
})
