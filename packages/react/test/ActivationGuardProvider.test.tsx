import type { Decision } from '@sparshlabs/core'
import * as domModule from '@sparshlabs/dom'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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

  it('mounts exactly one guard on mount; unmount tears it down (no further decisions)', () => {
    const decisions: Decision[] = []
    const root = createRoot(container)

    act(() => {
      root.render(
        <ActivationGuardProvider mode="report" onDecision={(d) => decisions.push(d)}>
          <button type="button" id="btn">
            Click
          </button>
        </ActivationGuardProvider>,
      )
    })

    expect(createGuardMock).toHaveBeenCalledTimes(1)

    const btn = container.querySelector('#btn') as HTMLButtonElement
    firePointerEvent(btn, 'pointerdown', { pointerId: 1 })
    firePointerEvent(btn, 'pointerup', { pointerId: 1 })
    expect(decisions).toHaveLength(1)

    act(() => {
      root.unmount()
    })

    // Further interactions on the (now-detached) button produce no new decisions.
    firePointerEvent(btn, 'pointerdown', { pointerId: 2 })
    firePointerEvent(btn, 'pointerup', { pointerId: 2 })
    expect(decisions).toHaveLength(1)
  })

  it('re-render of children with stable options does not recreate the guard', () => {
    const root = createRoot(container)

    function App({ label }: { label: string }) {
      return (
        <ActivationGuardProvider mode="report">
          <button type="button">{label}</button>
        </ActivationGuardProvider>
      )
    }

    act(() => {
      root.render(<App label="one" />)
    })
    expect(createGuardMock).toHaveBeenCalledTimes(1)

    act(() => {
      root.render(<App label="two" />)
    })
    expect(createGuardMock).toHaveBeenCalledTimes(1)

    act(() => {
      root.unmount()
    })
  })

  it('passes onBlocked feedback and keeps the latest callback without recreating the guard', () => {
    const firstHandler = vi.fn()
    const latestHandler = vi.fn()
    const root = createRoot(container)

    function App({ onBlocked }: { onBlocked: (element: Element) => void }) {
      return (
        <ActivationGuardProvider onBlocked={onBlocked}>
          <button type="button">Click</button>
        </ActivationGuardProvider>
      )
    }

    act(() => {
      root.render(<App onBlocked={firstHandler} />)
    })
    const button = container.querySelector('button') as HTMLButtonElement
    const hostOptions = createGuardMock.mock.calls[0]?.[1]
    act(() => hostOptions?.onBlocked?.(button))
    expect(firstHandler).toHaveBeenCalledWith(button)

    act(() => {
      root.render(<App onBlocked={latestHandler} />)
    })
    expect(createGuardMock).toHaveBeenCalledTimes(1)
    act(() => hostOptions?.onBlocked?.(button))
    expect(latestHandler).toHaveBeenCalledWith(button)

    act(() => {
      root.unmount()
    })
  })

  it('recreates the guard when a meaningful option (cooldownMs) changes', () => {
    const root = createRoot(container)

    function App({ cooldownMs }: { cooldownMs: number }) {
      return (
        <ActivationGuardProvider mode="report" cooldownMs={cooldownMs}>
          <button type="button">btn</button>
        </ActivationGuardProvider>
      )
    }

    act(() => {
      root.render(<App cooldownMs={500} />)
    })
    expect(createGuardMock).toHaveBeenCalledTimes(1)

    act(() => {
      root.render(<App cooldownMs={1000} />)
    })
    expect(createGuardMock).toHaveBeenCalledTimes(2)

    act(() => {
      root.unmount()
    })
  })

  it('report mode: onDecision and onSuspect fire; the action still runs (nothing blocked)', () => {
    const decisions: Decision[] = []
    const suspects: Decision[] = []
    let bubbleFired = false
    const root = createRoot(container)

    act(() => {
      root.render(
        <ActivationGuardProvider
          mode="report"
          onDecision={(d) => decisions.push(d)}
          onSuspect={(d) => suspects.push(d)}
        >
          <button
            type="button"
            id="btn"
            onPointerUp={() => {
              bubbleFired = true
            }}
          >
            Click
          </button>
        </ActivationGuardProvider>,
      )
    })

    const btn = container.querySelector('#btn') as HTMLButtonElement
    // Continuity would flag this (displaced between pointerdown/pointerup), but report mode must
    // never block — the handler still runs.
    firePointerEvent(btn, 'pointerdown', { pointerId: 1 })
    btn.getBoundingClientRect = () => ({ x: 999, y: 999, width: 10, height: 10 }) as DOMRect
    firePointerEvent(btn, 'pointerup', { pointerId: 1 })

    expect(decisions).toHaveLength(1)
    expect(decisions[0].allowed).toBe(false)
    expect(decisions[0].enforced).toBe(false)
    expect(suspects).toHaveLength(1)
    expect(bubbleFired).toBe(true)

    act(() => {
      root.unmount()
    })
  })

  it('SSR: rendering via renderToString with no `document` global does not throw', () => {
    const savedDocument = globalThis.document
    // biome-ignore lint/performance/noDelete: test-only emulation of a non-browser SSR environment
    delete (globalThis as { document?: Document }).document

    try {
      expect(() =>
        renderToString(
          <ActivationGuardProvider mode="report">
            <button type="button">Click</button>
          </ActivationGuardProvider>,
        ),
      ).not.toThrow()
    } finally {
      globalThis.document = savedDocument
    }
  })

  it('warns when nested inside another ActivationGuardProvider (overlapping subtree)', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const root = createRoot(container)

    act(() => {
      root.render(
        <ActivationGuardProvider mode="report">
          <ActivationGuardProvider mode={{ age: 'report' }}>
            <button type="button">Click</button>
          </ActivationGuardProvider>
        </ActivationGuardProvider>,
      )
    })

    expect(warnSpy).toHaveBeenCalledTimes(1)
    expect(warnSpy.mock.calls[0][0]).toContain('[sparsh]')

    act(() => {
      root.unmount()
    })
    warnSpy.mockRestore()
  })
})
