import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ActivationGuardProvider } from '../src/ActivationGuardProvider.js'
import { useActivationGuard } from '../src/useActivationGuard.js'
import { firePointerEvent } from './dom-events.js'

function Probe({ onRender }: { onRender: (isGuarded: boolean) => void }) {
  const { ref, isGuarded } = useActivationGuard()
  onRender(isGuarded)
  return (
    <button type="button" id="btn" ref={ref}>
      Click
    </button>
  )
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
    const root = createRoot(container)

    act(() => {
      root.render(
        <ActivationGuardProvider mode={{ continuity: 'enforce' }}>
          <Probe onRender={(g) => seen.push(g)} />
        </ActivationGuardProvider>,
      )
    })

    const btn = container.querySelector('#btn') as HTMLButtonElement

    // Displaced between pointerdown/pointerup — Continuity enforces a block.
    act(() => {
      firePointerEvent(btn, 'pointerdown', { pointerId: 1 })
      btn.getBoundingClientRect = () => ({ x: 999, y: 999, width: 10, height: 10 }) as DOMRect
      firePointerEvent(btn, 'pointerup', { pointerId: 1 })
    })
    expect(seen.at(-1)).toBe(true)

    // A clean, un-displaced activation afterwards is allowed — isGuarded clears.
    act(() => {
      firePointerEvent(btn, 'pointerdown', { pointerId: 2 })
      firePointerEvent(btn, 'pointerup', { pointerId: 2 })
    })
    expect(seen.at(-1)).toBe(false)

    act(() => {
      root.unmount()
    })
  })

  it('used without a provider: does not throw, isGuarded stays false', () => {
    const seen: boolean[] = []
    const root = createRoot(container)

    expect(() => {
      act(() => {
        root.render(<Probe onRender={(g) => seen.push(g)} />)
      })
    }).not.toThrow()

    expect(seen.every((g) => g === false)).toBe(true)

    const btn = container.querySelector('#btn') as HTMLButtonElement
    expect(() => {
      firePointerEvent(btn, 'pointerdown', { pointerId: 1 })
      firePointerEvent(btn, 'pointerup', { pointerId: 1 })
    }).not.toThrow()

    act(() => {
      root.unmount()
    })
  })
})
