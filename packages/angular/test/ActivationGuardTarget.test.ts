import { Component } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { afterEach, describe, expect, it } from 'vitest'
import { ActivationGuardDirective } from '../src/ActivationGuardDirective'
import { ActivationGuardTarget } from '../src/ActivationGuardTarget'
import { firePointerEvent } from './dom-events'

@Component({
  imports: [ActivationGuardDirective, ActivationGuardTarget],
  template: `
    <div sparshGuard [mode]="{ continuity: 'enforce' }">
      <button type="button" id="btn" sparshGuardTarget #g="sparshGuardTarget">
        {{ g.isGuarded() ? 'guarded' : 'clear' }}
      </button>
    </div>
  `,
})
class GuardedHostComponent {}

@Component({
  imports: [ActivationGuardTarget],
  template: `
    <button type="button" id="btn" sparshGuardTarget #g="sparshGuardTarget">
      {{ g.isGuarded() ? 'guarded' : 'clear' }}
    </button>
  `,
})
class UnguardedHostComponent {}

describe('[sparshGuardTarget]', () => {
  afterEach(() => {
    TestBed.resetTestingModule()
  })

  it('isGuarded flips true after an enforced block, clears after a subsequent trustworthy activation', () => {
    const fixture = TestBed.createComponent(GuardedHostComponent)
    fixture.detectChanges()
    const btn = fixture.nativeElement.querySelector('#btn') as HTMLButtonElement
    expect(btn.textContent?.trim()).toBe('clear')

    // Displaced between pointerdown/pointerup — Continuity enforces a block.
    firePointerEvent(btn, 'pointerdown', { pointerId: 1 })
    const originalRect = btn.getBoundingClientRect
    btn.getBoundingClientRect = () => ({ x: 999, y: 999, width: 10, height: 10 }) as DOMRect
    firePointerEvent(btn, 'pointerup', { pointerId: 1 })
    fixture.detectChanges()
    expect(btn.textContent?.trim()).toBe('guarded')

    // A clean, un-displaced activation afterwards is allowed — isGuarded clears.
    btn.getBoundingClientRect = originalRect
    firePointerEvent(btn, 'pointerdown', { pointerId: 2 })
    firePointerEvent(btn, 'pointerup', { pointerId: 2 })
    fixture.detectChanges()
    expect(btn.textContent?.trim()).toBe('clear')
  })

  it('used without any guard: does not throw, isGuarded stays false', () => {
    const fixture = TestBed.createComponent(UnguardedHostComponent)
    fixture.detectChanges()
    const btn = fixture.nativeElement.querySelector('#btn') as HTMLButtonElement

    expect(() => {
      firePointerEvent(btn, 'pointerdown', { pointerId: 1 })
      firePointerEvent(btn, 'pointerup', { pointerId: 1 })
      fixture.detectChanges()
    }).not.toThrow()
    expect(btn.textContent?.trim()).toBe('clear')
  })
})
