import { Component, PLATFORM_ID, signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import type { Decision, GuardOptions } from '@sparshlabs/core'
import * as domModule from '@sparshlabs/dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ActivationGuardDirective } from '../src/ActivationGuardDirective'
import { firePointerEvent } from './dom-events'

vi.mock('@sparshlabs/dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@sparshlabs/dom')>()
  return { ...actual, createGuard: vi.fn(actual.createGuard) }
})

const createGuardMock = vi.mocked(domModule.createGuard)

@Component({
  imports: [ActivationGuardDirective],
  template: `
    <div
      sparshGuard
      [mode]="mode()"
      [cooldownMs]="cooldownMs()"
      [onBlocked]="onBlocked()"
      (decision)="decisions.push($event)"
      (suspect)="suspects.push($event)"
    >
      <button type="button" id="btn" (pointerup)="bubbleFired = true">{{ label() }}</button>
    </div>
  `,
})
class HostComponent {
  readonly mode = signal<GuardOptions['mode']>('report')
  readonly cooldownMs = signal(500)
  readonly label = signal('one')
  readonly onBlocked = signal<((element: Element) => void) | undefined>(undefined)
  readonly decisions: Decision[] = []
  readonly suspects: Decision[] = []
  bubbleFired = false
}

@Component({
  imports: [ActivationGuardDirective],
  template: `
    <div sparshGuard mode="report">
      <section sparshGuard [mode]="{ age: 'report' }">
        <button type="button">Click</button>
      </section>
    </div>
  `,
})
class NestedHostComponent {}

function render() {
  const fixture = TestBed.createComponent(HostComponent)
  fixture.detectChanges()
  const btn = fixture.nativeElement.querySelector('#btn') as HTMLButtonElement
  return { fixture, host: fixture.componentInstance, btn }
}

describe('[sparshGuard]', () => {
  beforeEach(() => {
    createGuardMock.mockClear()
  })

  afterEach(() => {
    TestBed.resetTestingModule()
  })

  it('creates exactly one guard on its host element; destroy tears it down (no further decisions)', () => {
    const { fixture, host, btn } = render()

    expect(createGuardMock).toHaveBeenCalledTimes(1)
    expect(createGuardMock.mock.calls[0]?.[0]).toBe(fixture.nativeElement.querySelector('div'))

    firePointerEvent(btn, 'pointerdown', { pointerId: 1 })
    firePointerEvent(btn, 'pointerup', { pointerId: 1 })
    expect(host.decisions).toHaveLength(1)

    fixture.destroy()

    // Further interactions on the (now-detached) button produce no new decisions.
    firePointerEvent(btn, 'pointerdown', { pointerId: 2 })
    firePointerEvent(btn, 'pointerup', { pointerId: 2 })
    expect(host.decisions).toHaveLength(1)
  })

  it('re-render of children with stable options does not recreate the guard', () => {
    const { fixture, host, btn } = render()
    expect(createGuardMock).toHaveBeenCalledTimes(1)

    host.label.set('two')
    fixture.detectChanges()
    expect(btn.textContent).toBe('two')
    expect(createGuardMock).toHaveBeenCalledTimes(1)
  })

  it('passes onBlocked feedback and keeps the latest callback without recreating the guard', () => {
    const firstHandler = vi.fn()
    const latestHandler = vi.fn()
    const { fixture, host, btn } = render()

    host.onBlocked.set(firstHandler)
    fixture.detectChanges()
    const callsWithFeedback = createGuardMock.mock.calls.length
    const hostOptions = createGuardMock.mock.calls.at(-1)?.[1]
    hostOptions?.onBlocked?.(btn)
    expect(firstHandler).toHaveBeenCalledWith(btn)

    host.onBlocked.set(latestHandler)
    fixture.detectChanges()
    expect(createGuardMock).toHaveBeenCalledTimes(callsWithFeedback)
    hostOptions?.onBlocked?.(btn)
    expect(latestHandler).toHaveBeenCalledWith(btn)
  })

  it('recreates the guard when a meaningful option (cooldownMs) changes', () => {
    const { fixture, host } = render()
    expect(createGuardMock).toHaveBeenCalledTimes(1)

    host.cooldownMs.set(1000)
    fixture.detectChanges()
    expect(createGuardMock).toHaveBeenCalledTimes(2)
    expect(createGuardMock.mock.calls[1]?.[1]?.cooldownMs).toBe(1000)
  })

  it('report mode: decision and suspect emit; the action still runs (nothing blocked)', () => {
    const { host, btn } = render()

    // Continuity would flag this (displaced between pointerdown/pointerup), but report mode must
    // never block — the handler still runs.
    firePointerEvent(btn, 'pointerdown', { pointerId: 1 })
    btn.getBoundingClientRect = () => ({ x: 999, y: 999, width: 10, height: 10 }) as DOMRect
    firePointerEvent(btn, 'pointerup', { pointerId: 1 })

    expect(host.decisions).toHaveLength(1)
    expect(host.decisions[0]?.allowed).toBe(false)
    expect(host.decisions[0]?.enforced).toBe(false)
    expect(host.suspects).toHaveLength(1)
    expect(host.bubbleFired).toBe(true)
  })

  it('warns when nested inside another [sparshGuard] (overlapping subtree)', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const fixture = TestBed.createComponent(NestedHostComponent)
    fixture.detectChanges()

    expect(createGuardMock).toHaveBeenCalledTimes(2)
    expect(warnSpy).toHaveBeenCalledTimes(1)
    expect(warnSpy.mock.calls[0]?.[0]).toContain('[sparsh]')

    warnSpy.mockRestore()
  })

  it('on the server platform: renders, but never creates a guard', () => {
    TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: 'server' }] })
    const { fixture, host } = render()
    host.cooldownMs.set(1000)
    fixture.detectChanges()

    expect(createGuardMock).not.toHaveBeenCalled()
  })
})
