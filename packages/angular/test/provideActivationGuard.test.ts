import { Component, PLATFORM_ID } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import type { Decision } from '@sparshlabs/core'
import * as domModule from '@sparshlabs/dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ActivationGuardTarget } from '../src/ActivationGuardTarget'
import { provideActivationGuard } from '../src/provideActivationGuard'
import { firePointerEvent } from './dom-events'

vi.mock('@sparshlabs/dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@sparshlabs/dom')>()
  return { ...actual, createGuard: vi.fn(actual.createGuard) }
})

const createGuardMock = vi.mocked(domModule.createGuard)

@Component({
  imports: [ActivationGuardTarget],
  template: `
    <button type="button" id="btn" sparshGuardTarget #g="sparshGuardTarget">
      {{ g.isGuarded() ? 'guarded' : 'clear' }}
    </button>
  `,
})
class AppComponent {}

function displacedPress(btn: HTMLButtonElement, pointerId: number): void {
  firePointerEvent(btn, 'pointerdown', { pointerId })
  btn.getBoundingClientRect = () => ({ x: 999, y: 999, width: 10, height: 10 }) as DOMRect
  firePointerEvent(btn, 'pointerup', { pointerId })
}

describe('provideActivationGuard()', () => {
  beforeEach(() => {
    createGuardMock.mockClear()
  })

  afterEach(() => {
    TestBed.resetTestingModule()
  })

  it('guards document by default, after the first render, and reports decisions', () => {
    const decisions: Decision[] = []
    const suspects: Decision[] = []
    TestBed.configureTestingModule({
      providers: [
        provideActivationGuard({
          mode: 'report',
          onDecision: (d) => decisions.push(d),
          onSuspect: (d) => suspects.push(d),
        }),
      ],
    })

    const fixture = TestBed.createComponent(AppComponent)
    fixture.detectChanges()

    expect(createGuardMock).toHaveBeenCalledTimes(1)
    expect(createGuardMock.mock.calls[0]?.[0]).toBe(document)

    displacedPress(fixture.nativeElement.querySelector('#btn'), 1)
    expect(decisions).toHaveLength(1)
    expect(suspects).toHaveLength(1)
  })

  it('honors a custom root factory', () => {
    const root = document.createElement('main')
    document.body.appendChild(root)
    TestBed.configureTestingModule({
      providers: [provideActivationGuard({ mode: 'report', root: () => root })],
    })

    TestBed.createComponent(AppComponent).detectChanges()
    expect(createGuardMock.mock.calls[0]?.[0]).toBe(root)

    root.remove()
  })

  it('a [sparshGuardTarget] outside any [sparshGuard] uses the app-wide guard', () => {
    TestBed.configureTestingModule({
      providers: [provideActivationGuard({ mode: { continuity: 'enforce' } })],
    })

    const fixture = TestBed.createComponent(AppComponent)
    fixture.detectChanges()
    const btn = fixture.nativeElement.querySelector('#btn') as HTMLButtonElement

    displacedPress(btn, 1)
    fixture.detectChanges()
    expect(btn.textContent?.trim()).toBe('guarded')
  })

  it('destroying the environment injector tears the guard down', () => {
    const decisions: Decision[] = []
    TestBed.configureTestingModule({
      providers: [provideActivationGuard({ mode: 'report', onDecision: (d) => decisions.push(d) })],
    })
    const fixture = TestBed.createComponent(AppComponent)
    fixture.detectChanges()
    const btn = fixture.nativeElement.querySelector('#btn') as HTMLButtonElement
    // Keep the button attached to document so the (destroyed) document guard would still see it.
    document.body.appendChild(btn)

    TestBed.resetTestingModule()

    displacedPress(btn, 1)
    expect(decisions).toHaveLength(0)
    btn.remove()
  })

  it('on the server platform: never creates a guard', () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: PLATFORM_ID, useValue: 'server' },
        provideActivationGuard({ mode: 'report' }),
      ],
    })

    TestBed.createComponent(AppComponent).detectChanges()
    expect(createGuardMock).not.toHaveBeenCalled()
  })
})
