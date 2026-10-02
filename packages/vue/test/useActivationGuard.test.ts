import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { ActivationGuardProvider } from '../src/ActivationGuardProvider.js'
import { useActivationGuard } from '../src/useActivationGuard.js'
import { firePointerEvent } from './dom-events.js'

function makeProbe(onRender: (isGuarded: boolean) => void) {
  return defineComponent({
    setup() {
      const { ref, isGuarded } = useActivationGuard()
      return () => {
        onRender(isGuarded.value)
        return h('button', { type: 'button', id: 'btn', ref }, 'Click')
      }
    },
  })
}

describe('useActivationGuard()', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    container.remove()
  })

  it('isGuarded flips true after an enforced block, clears after a subsequent trustworthy activation', async () => {
    const seen: boolean[] = []
    const Probe = makeProbe((g) => seen.push(g))

    const wrapper = mount(ActivationGuardProvider, {
      attachTo: container,
      props: { mode: { continuity: 'enforce' } },
      slots: { default: () => h(Probe) },
    })

    const btn = container.querySelector('#btn') as HTMLButtonElement

    // Displaced between pointerdown/pointerup — Continuity enforces a block.
    firePointerEvent(btn, 'pointerdown', { pointerId: 1 })
    btn.getBoundingClientRect = () => ({ x: 999, y: 999, width: 10, height: 10 }) as DOMRect
    firePointerEvent(btn, 'pointerup', { pointerId: 1 })
    await nextTick()
    expect(seen.at(-1)).toBe(true)

    // A clean, un-displaced activation afterwards is allowed — isGuarded clears.
    firePointerEvent(btn, 'pointerdown', { pointerId: 2 })
    firePointerEvent(btn, 'pointerup', { pointerId: 2 })
    await nextTick()
    expect(seen.at(-1)).toBe(false)

    wrapper.unmount()
  })

  it('used without a provider: does not throw, isGuarded stays false', () => {
    const seen: boolean[] = []
    const Probe = makeProbe((g) => seen.push(g))

    const wrapper = mount(Probe, { attachTo: container })

    expect(seen.every((g) => g === false)).toBe(true)

    const btn = container.querySelector('#btn') as HTMLButtonElement
    expect(() => {
      firePointerEvent(btn, 'pointerdown', { pointerId: 1 })
      firePointerEvent(btn, 'pointerup', { pointerId: 1 })
    }).not.toThrow()

    wrapper.unmount()
  })
})
