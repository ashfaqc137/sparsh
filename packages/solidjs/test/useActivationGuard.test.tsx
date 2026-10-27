import { createEffect } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ActivationGuardProvider } from '../src/ActivationGuardProvider.js'
import { useActivationGuard } from '../src/useActivationGuard.js'
import { firePointerEvent } from './dom-events.js'

function makeProbe(onChange: (isGuarded: boolean) => void) {
  return function Probe() {
    const { ref, isGuarded } = useActivationGuard()
    createEffect(() => onChange(isGuarded()))
    return (
      <button type="button" id="btn" ref={ref} data-guarded={String(isGuarded())}>
        Click
      </button>
    )
  }
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

  it('isGuarded flips true after an enforced block, clears after a subsequent trustworthy activation', () => {
    const seen: boolean[] = []
    const Probe = makeProbe((g) => seen.push(g))

    const dispose = render(
      () => (
        <ActivationGuardProvider mode={{ continuity: 'enforce' }}>
          <Probe />
        </ActivationGuardProvider>
      ),
      container,
    )

    const btn = container.querySelector('#btn') as HTMLButtonElement
    expect(seen.at(-1)).toBe(false)

    // Displaced between pointerdown/pointerup — Continuity enforces a block.
    firePointerEvent(btn, 'pointerdown', { pointerId: 1 })
    btn.getBoundingClientRect = () => ({ x: 999, y: 999, width: 10, height: 10 }) as DOMRect
    firePointerEvent(btn, 'pointerup', { pointerId: 1 })
    expect(seen.at(-1)).toBe(true)
    expect(btn.dataset.guarded).toBe('true')

    // A clean, un-displaced activation afterwards is allowed — isGuarded clears.
    firePointerEvent(btn, 'pointerdown', { pointerId: 2 })
    firePointerEvent(btn, 'pointerup', { pointerId: 2 })
    expect(seen.at(-1)).toBe(false)
    expect(btn.dataset.guarded).toBe('false')

    dispose()
  })

  it('used without a provider: does not throw, isGuarded stays false', () => {
    const seen: boolean[] = []
    const Probe = makeProbe((g) => seen.push(g))

    const dispose = render(() => <Probe />, container)

    expect(seen.every((g) => g === false)).toBe(true)

    const btn = container.querySelector('#btn') as HTMLButtonElement
    expect(() => {
      firePointerEvent(btn, 'pointerdown', { pointerId: 1 })
      firePointerEvent(btn, 'pointerup', { pointerId: 1 })
    }).not.toThrow()
    expect(seen.every((g) => g === false)).toBe(true)

    dispose()
  })
})
