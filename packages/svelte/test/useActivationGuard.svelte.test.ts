import { flushSync, mount, unmount } from 'svelte'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { firePointerEvent } from './dom-events.js'
import Probe from './fixtures/Probe.svelte'
import ProbeInProvider from './fixtures/ProbeInProvider.svelte'

describe('useActivationGuard()', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    container.remove()
  })

  it('isGuarded flips true after an enforced block, clears after a subsequent trustworthy activation', () => {
    const seen: boolean[] = []

    const app = mount(ProbeInProvider, {
      target: container,
      props: { mode: { continuity: 'enforce' }, onChange: (g: boolean) => seen.push(g) },
    })
    flushSync()

    const btn = container.querySelector('#btn') as HTMLButtonElement
    expect(seen.at(-1)).toBe(false)

    // Displaced between pointerdown/pointerup — Continuity enforces a block.
    firePointerEvent(btn, 'pointerdown', { pointerId: 1 })
    btn.getBoundingClientRect = () => ({ x: 999, y: 999, width: 10, height: 10 }) as DOMRect
    firePointerEvent(btn, 'pointerup', { pointerId: 1 })
    flushSync()
    expect(seen.at(-1)).toBe(true)
    expect(btn.dataset.guarded).toBe('true')

    // A clean, un-displaced activation afterwards is allowed — isGuarded clears.
    firePointerEvent(btn, 'pointerdown', { pointerId: 2 })
    firePointerEvent(btn, 'pointerup', { pointerId: 2 })
    flushSync()
    expect(seen.at(-1)).toBe(false)
    expect(btn.dataset.guarded).toBe('false')

    unmount(app)
  })

  it('used without a provider: does not throw, isGuarded stays false', () => {
    const seen: boolean[] = []

    const app = mount(Probe, {
      target: container,
      props: { onChange: (g: boolean) => seen.push(g) },
    })
    flushSync()

    expect(seen.every((g) => g === false)).toBe(true)

    const btn = container.querySelector('#btn') as HTMLButtonElement
    expect(() => {
      firePointerEvent(btn, 'pointerdown', { pointerId: 1 })
      firePointerEvent(btn, 'pointerup', { pointerId: 1 })
      flushSync()
    }).not.toThrow()
    expect(seen.every((g) => g === false)).toBe(true)

    unmount(app)
  })
})
