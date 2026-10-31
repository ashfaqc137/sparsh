import type { Decision } from '@sparshlabs/core'
import * as domModule from '@sparshlabs/dom'
import { createSignal } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ActivationGuard } from '../src/ActivationGuard.js'
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

    const dispose = render(
      () => (
        <ActivationGuardProvider mode="report" onDecision={(d) => decisions.push(d)}>
          <button type="button" id="btn">
            Click
          </button>
        </ActivationGuardProvider>
      ),
      container,
    )

    expect(createGuardMock).toHaveBeenCalledTimes(1)
    // Attached to the display:contents wrapper, not the container.
    const wrapper = container.firstElementChild as HTMLDivElement
    expect(wrapper.style.display).toBe('contents')
    expect(createGuardMock.mock.calls[0]?.[0]).toBe(wrapper)

    const btn = container.querySelector('#btn') as HTMLButtonElement
    firePointerEvent(btn, 'pointerdown', { pointerId: 1 })
    firePointerEvent(btn, 'pointerup', { pointerId: 1 })
    expect(decisions).toHaveLength(1)

    dispose()

    // Further interactions on the (now-detached) button produce no new decisions.
    firePointerEvent(btn, 'pointerdown', { pointerId: 2 })
    firePointerEvent(btn, 'pointerup', { pointerId: 2 })
    expect(decisions).toHaveLength(1)
  })

  it('re-render of children with stable options does not recreate the guard', () => {
    const [label, setLabel] = createSignal('one')

    const dispose = render(
      () => (
        <ActivationGuardProvider mode="report">
          <button type="button">{label()}</button>
        </ActivationGuardProvider>
      ),
      container,
    )
    expect(createGuardMock).toHaveBeenCalledTimes(1)

    setLabel('two')
    expect(container.querySelector('button')?.textContent).toBe('two')
    expect(createGuardMock).toHaveBeenCalledTimes(1)

    dispose()
  })

  it('passes onBlocked feedback and keeps the latest callback without recreating the guard', () => {
    const firstHandler = vi.fn()
    const latestHandler = vi.fn()
    const [onBlocked, setOnBlocked] = createSignal<(element: Element) => void>(firstHandler)

    const dispose = render(
      () => (
        <ActivationGuardProvider onBlocked={onBlocked()}>
          <button type="button">Click</button>
        </ActivationGuardProvider>
      ),
      container,
    )
    const button = container.querySelector('button') as HTMLButtonElement
    const hostOptions = createGuardMock.mock.calls[0]?.[1]
    hostOptions?.onBlocked?.(button)
    expect(firstHandler).toHaveBeenCalledWith(button)

    setOnBlocked(() => latestHandler)
    expect(createGuardMock).toHaveBeenCalledTimes(1)
    hostOptions?.onBlocked?.(button)
    expect(latestHandler).toHaveBeenCalledWith(button)

    dispose()
  })

  it('recreates the guard when a meaningful option (cooldownMs) changes, destroying the old one', () => {
    const decisions: Decision[] = []
    const [cooldownMs, setCooldownMs] = createSignal(500)

    const dispose = render(
      () => (
        <ActivationGuardProvider
          mode="report"
          cooldownMs={cooldownMs()}
          onDecision={(d) => decisions.push(d)}
        >
          <button type="button">btn</button>
        </ActivationGuardProvider>
      ),
      container,
    )
    expect(createGuardMock).toHaveBeenCalledTimes(1)

    setCooldownMs(1000)
    expect(createGuardMock).toHaveBeenCalledTimes(2)
    expect(createGuardMock.mock.calls[1]?.[1]?.cooldownMs).toBe(1000)

    // Only the new guard listens: one activation, one decision.
    const btn = container.querySelector('button') as HTMLButtonElement
    firePointerEvent(btn, 'pointerdown', { pointerId: 1 })
    firePointerEvent(btn, 'pointerup', { pointerId: 1 })
    expect(decisions).toHaveLength(1)

    dispose()
  })

  it('report mode: onDecision and onSuspect fire; the action still runs (nothing blocked)', () => {
    const decisions: Decision[] = []
    const suspects: Decision[] = []
    let bubbleFired = false

    const dispose = render(
      () => (
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
        </ActivationGuardProvider>
      ),
      container,
    )

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

    dispose()
  })

  it('root prop: attaches to the given root, renders no wrapper, and follows root changes', () => {
    const rootA = document.createElement('section')
    const rootB = document.createElement('section')
    container.append(rootA, rootB)
    const [root, setRoot] = createSignal<Element>(rootA)

    const host = document.createElement('div')
    container.appendChild(host)
    const dispose = render(
      () => (
        <ActivationGuardProvider mode="report" root={root()}>
          <button type="button">Click</button>
        </ActivationGuardProvider>
      ),
      host,
    )

    const button = host.querySelector('button')
    expect(host.firstElementChild).toBe(button)
    expect(createGuardMock).toHaveBeenCalledTimes(1)
    expect(createGuardMock.mock.calls[0]?.[0]).toBe(rootA)

    setRoot(rootB)
    expect(createGuardMock).toHaveBeenCalledTimes(2)
    expect(createGuardMock.mock.calls[1]?.[0]).toBe(rootB)
    // Switching between two roots doesn't remount the children.
    expect(host.querySelector('button')).toBe(button)

    dispose()
  })

  it('warns when nested inside another ActivationGuardProvider (overlapping subtree)', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const dispose = render(
      () => (
        <ActivationGuardProvider mode="report">
          <ActivationGuard mode={{ age: 'report' }}>
            <button type="button">Click</button>
          </ActivationGuard>
        </ActivationGuardProvider>
      ),
      container,
    )

    expect(createGuardMock).toHaveBeenCalledTimes(2)
    expect(warnSpy).toHaveBeenCalledTimes(1)
    expect(warnSpy.mock.calls[0]?.[0]).toContain('[sparsh]')

    dispose()
    warnSpy.mockRestore()
  })
})
