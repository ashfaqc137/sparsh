import type { Decision } from '@sparshlabs/core'
import * as domModule from '@sparshlabs/dom'
import { flushSync, mount, unmount } from 'svelte'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { firePointerEvent } from './dom-events.js'
import Harness from './fixtures/Harness.svelte'
import Nested from './fixtures/Nested.svelte'

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

    const app = mount(Harness, {
      target: container,
      props: { mode: 'report', onDecision: (d: Decision) => decisions.push(d) },
    })
    flushSync()

    expect(createGuardMock).toHaveBeenCalledTimes(1)
    // Attached to the display:contents wrapper, not the container.
    const wrapper = container.firstElementChild as HTMLDivElement
    expect(wrapper.style.display).toBe('contents')
    expect(createGuardMock.mock.calls[0]?.[0]).toBe(wrapper)

    const btn = container.querySelector('#btn') as HTMLButtonElement
    firePointerEvent(btn, 'pointerdown', { pointerId: 1 })
    firePointerEvent(btn, 'pointerup', { pointerId: 1 })
    expect(decisions).toHaveLength(1)

    unmount(app)

    // Further interactions on the (now-detached) button produce no new decisions.
    firePointerEvent(btn, 'pointerdown', { pointerId: 2 })
    firePointerEvent(btn, 'pointerup', { pointerId: 2 })
    expect(decisions).toHaveLength(1)
  })

  it('re-render of children with stable options does not recreate the guard', () => {
    const props = $state({ mode: 'report' as const, label: 'one' })
    const app = mount(Harness, { target: container, props })
    flushSync()
    expect(createGuardMock).toHaveBeenCalledTimes(1)

    props.label = 'two'
    flushSync()
    expect(container.querySelector('button')?.textContent).toBe('two')
    expect(createGuardMock).toHaveBeenCalledTimes(1)

    unmount(app)
  })

  it('passes onBlocked feedback and keeps the latest callback without recreating the guard', () => {
    const firstHandler = vi.fn()
    const latestHandler = vi.fn()
    const props = $state({ onBlocked: firstHandler as (element: Element) => void })

    const app = mount(Harness, { target: container, props })
    flushSync()
    const button = container.querySelector('button') as HTMLButtonElement
    const hostOptions = createGuardMock.mock.calls[0]?.[1]
    hostOptions?.onBlocked?.(button)
    expect(firstHandler).toHaveBeenCalledWith(button)

    props.onBlocked = latestHandler
    flushSync()
    expect(createGuardMock).toHaveBeenCalledTimes(1)
    hostOptions?.onBlocked?.(button)
    expect(latestHandler).toHaveBeenCalledWith(button)

    unmount(app)
  })

  it('recreates the guard when a meaningful option (cooldownMs) changes, destroying the old one', () => {
    const decisions: Decision[] = []
    const props = $state({
      mode: 'report' as const,
      cooldownMs: 500,
      onDecision: (d: Decision) => decisions.push(d),
    })

    const app = mount(Harness, { target: container, props })
    flushSync()
    expect(createGuardMock).toHaveBeenCalledTimes(1)

    props.cooldownMs = 1000
    flushSync()
    expect(createGuardMock).toHaveBeenCalledTimes(2)
    expect(createGuardMock.mock.calls[1]?.[1]?.cooldownMs).toBe(1000)

    // Only the new guard listens: one activation, one decision.
    const btn = container.querySelector('button') as HTMLButtonElement
    firePointerEvent(btn, 'pointerdown', { pointerId: 1 })
    firePointerEvent(btn, 'pointerup', { pointerId: 1 })
    expect(decisions).toHaveLength(1)

    unmount(app)
  })

  it('report mode: onDecision and onSuspect fire; the action still runs (nothing blocked)', () => {
    const decisions: Decision[] = []
    const suspects: Decision[] = []
    let bubbleFired = false

    const app = mount(Harness, {
      target: container,
      props: {
        mode: 'report',
        onDecision: (d: Decision) => decisions.push(d),
        onSuspect: (d: Decision) => suspects.push(d),
        onButtonPointerUp: () => {
          bubbleFired = true
        },
      },
    })
    flushSync()

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

    unmount(app)
  })

  it('root prop: attaches to the given root, renders no wrapper, and follows root changes', () => {
    const rootA = document.createElement('section')
    const rootB = document.createElement('section')
    container.append(rootA, rootB)
    const props = $state({ mode: 'report' as const, root: rootA as Element })

    const host = document.createElement('div')
    container.appendChild(host)
    const app = mount(Harness, { target: host, props })
    flushSync()

    const button = host.querySelector('button')
    expect(host.firstElementChild).toBe(button)
    expect(createGuardMock).toHaveBeenCalledTimes(1)
    expect(createGuardMock.mock.calls[0]?.[0]).toBe(rootA)

    props.root = rootB
    flushSync()
    expect(createGuardMock).toHaveBeenCalledTimes(2)
    expect(createGuardMock.mock.calls[1]?.[0]).toBe(rootB)
    // Switching between two roots doesn't remount the children.
    expect(host.querySelector('button')).toBe(button)

    unmount(app)
  })

  it('warns when nested inside another ActivationGuardProvider (overlapping subtree)', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const app = mount(Nested, { target: container })
    flushSync()

    expect(createGuardMock).toHaveBeenCalledTimes(2)
    expect(warnSpy).toHaveBeenCalledTimes(1)
    expect(warnSpy.mock.calls[0]?.[0]).toContain('[sparsh]')

    unmount(app)
    warnSpy.mockRestore()
  })
})
