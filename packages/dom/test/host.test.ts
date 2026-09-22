import type { ActivationEvent, IntentClearSignal } from '@sparsh/core'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createDomHost } from '../src/host.js'
import { fireClick, fireKeyDown, firePointerEvent } from './dom-events.js'

describe('createDomHost', () => {
  let btn: HTMLButtonElement
  let host: ReturnType<typeof createDomHost>

  beforeEach(() => {
    document.body.innerHTML = '<button id="btn">Click</button>'
    btn = document.getElementById('btn') as HTMLButtonElement
    host = createDomHost(document.body)
  })

  afterEach(() => {
    host.destroy()
  })

  it('pointerdown then pointerup yields two normalized events with correct phase/kind', () => {
    const events: ActivationEvent[] = []
    host.onActivationEvent((e) => events.push(e))

    firePointerEvent(btn, 'pointerdown', { pointerId: 7, pointerType: 'touch' })
    firePointerEvent(btn, 'pointerup', { pointerId: 7, pointerType: 'touch' })

    expect(events).toHaveLength(2)
    expect(events[0]).toMatchObject({ phase: 'intent', kind: 'touch', pointerId: 7 })
    expect(events[1]).toMatchObject({ phase: 'activation', kind: 'touch', pointerId: 7 })
  })

  it('classifies a click with detail===0 as virtual', () => {
    const events: ActivationEvent[] = []
    host.onActivationEvent((e) => events.push(e))

    fireClick(btn, { detail: 0 })

    expect(events).toHaveLength(1)
    expect(events[0].kind).toBe('virtual')
    expect(events[0].pointerId).toBeUndefined()
  })

  it('classifies Enter keydown on a button as key', () => {
    const events: ActivationEvent[] = []
    host.onActivationEvent((e) => events.push(e))

    fireKeyDown(btn, 'Enter')

    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({ phase: 'activation', kind: 'key' })
  })

  it('classifies Space keydown on a button as key', () => {
    const events: ActivationEvent[] = []
    host.onActivationEvent((e) => events.push(e))

    fireKeyDown(btn, ' ')

    expect(events).toHaveLength(1)
    expect(events[0].kind).toBe('key')
  })

  it('never emits for Escape', () => {
    const events: ActivationEvent[] = []
    host.onActivationEvent((e) => events.push(e))

    fireKeyDown(btn, 'Escape')

    expect(events).toHaveLength(0)
  })

  it('never emits for scroll (no listener attached at all)', () => {
    const events: ActivationEvent[] = []
    host.onActivationEvent((e) => events.push(e))

    document.body.dispatchEvent(new Event('scroll', { bubbles: true }))

    expect(events).toHaveLength(0)
  })

  it('attaches exactly one listener per event type to root', () => {
    document.body.innerHTML = '<button id="btn2">x</button>'
    const addSpy = vi.spyOn(document.body, 'addEventListener')
    const h = createDomHost(document.body)
    const types = addSpy.mock.calls.map((c) => c[0])
    for (const t of [
      'pointerdown',
      'pointerup',
      'pointercancel',
      'lostpointercapture',
      'click',
      'keydown',
    ]) {
      expect(types.filter((x) => x === t)).toHaveLength(1)
    }
    h.destroy()
    addSpy.mockRestore()
  })

  it('suppresses the synthetic click that follows a real pointerup already emitted', () => {
    const events: ActivationEvent[] = []
    host.onActivationEvent((e) => events.push(e))

    firePointerEvent(btn, 'pointerdown', { pointerId: 1, pointerType: 'mouse' })
    firePointerEvent(btn, 'pointerup', { pointerId: 1, pointerType: 'mouse' })
    fireClick(btn, { detail: 1 }) // the browser's own follow-up click for the same press

    const activationEvents = events.filter((e) => e.phase === 'activation')
    expect(activationEvents).toHaveLength(1)
    expect(activationEvents[0].kind).toBe('mouse')
  })

  it('suppresses the native follow-up click after a keyboard (Enter) activation', () => {
    const events: ActivationEvent[] = []
    host.onActivationEvent((e) => events.push(e))

    fireKeyDown(btn, 'Enter')
    fireClick(btn, { detail: 1 }) // native <button> auto-click for Enter

    const activationEvents = events.filter((e) => e.phase === 'activation')
    expect(activationEvents).toHaveLength(1)
    expect(activationEvents[0].kind).toBe('key')
  })

  it('block() prevents default and stops propagation so a bubble handler does not see it', () => {
    let bubbleFired = false
    btn.addEventListener('pointerup', () => {
      bubbleFired = true
    })

    let captured: ActivationEvent | undefined
    host.onActivationEvent((e) => {
      if (e.phase === 'activation') {
        captured = e
        host.block(e) // mirrors the engine calling block() synchronously on enforce
      }
    })

    firePointerEvent(btn, 'pointerdown', { pointerId: 1 })
    const upEvent = firePointerEvent(btn, 'pointerup', { pointerId: 1 }) as MouseEvent

    expect(captured).toBeDefined()
    expect(upEvent.defaultPrevented).toBe(true)
    expect(bubbleFired).toBe(false)
  })

  it('block() on the pointerup activation also cancels the real follow-up click (regression: real-browser-verified fix — canceling pointerup alone does NOT stop click for mouse input)', () => {
    let realClickHandlerFired = false
    btn.addEventListener('click', () => {
      realClickHandlerFired = true
    })

    host.onActivationEvent((e) => {
      if (e.phase === 'activation') host.block(e) // mirrors the engine blocking on enforce
    })

    firePointerEvent(btn, 'pointerdown', { pointerId: 1, pointerType: 'mouse' })
    firePointerEvent(btn, 'pointerup', { pointerId: 1, pointerType: 'mouse' })
    const click = fireClick(btn, { detail: 1 }) // the browser's own real follow-up click

    expect(click.defaultPrevented).toBe(true)
    expect(realClickHandlerFired).toBe(false)
  })

  it('an allowed (unblocked) pointerup activation lets the real follow-up click through untouched', () => {
    let realClickHandlerFired = false
    btn.addEventListener('click', () => {
      realClickHandlerFired = true
    })

    host.onActivationEvent(() => {
      /* allow — never call block() */
    })

    firePointerEvent(btn, 'pointerdown', { pointerId: 1, pointerType: 'mouse' })
    firePointerEvent(btn, 'pointerup', { pointerId: 1, pointerType: 'mouse' })
    const click = fireClick(btn, { detail: 1 })

    expect(click.defaultPrevented).toBe(false)
    expect(realClickHandlerFired).toBe(true)
  })

  it('block() on a keyboard (Enter) activation also cancels the native auto-click', () => {
    let realClickHandlerFired = false
    btn.addEventListener('click', () => {
      realClickHandlerFired = true
    })

    host.onActivationEvent((e) => {
      if (e.phase === 'activation') host.block(e)
    })

    fireKeyDown(btn, 'Enter')
    const click = fireClick(btn, { detail: 1 }) // native <button> auto-click for Enter

    expect(click.defaultPrevented).toBe(true)
    expect(realClickHandlerFired).toBe(false)
  })

  it('pointercancel clears intent for that pointerId', () => {
    const clears: IntentClearSignal[] = []
    host.onIntentClear((s) => clears.push(s))

    firePointerEvent(btn, 'pointerdown', { pointerId: 5 })
    firePointerEvent(btn, 'pointercancel', { pointerId: 5 })

    expect(clears).toHaveLength(1)
    expect(clears[0].pointerId).toBe(5)
  })

  it('lostpointercapture clears intent for that pointerId', () => {
    const clears: IntentClearSignal[] = []
    host.onIntentClear((s) => clears.push(s))

    firePointerEvent(btn, 'pointerdown', { pointerId: 9 })
    firePointerEvent(btn, 'lostpointercapture', { pointerId: 9 })

    expect(clears).toHaveLength(1)
    expect(clears[0].pointerId).toBe(9)
  })

  it('resolveTarget/snapshot work through the Host port', () => {
    const handle = host.resolveTarget(btn)
    expect(handle).not.toBeNull()
    const snap = host.snapshot(handle as NonNullable<typeof handle>)
    expect(snap.identity).toBe(btn)
  })

  it('destroy() removes listeners — no further events after destroy', () => {
    const events: ActivationEvent[] = []
    host.onActivationEvent((e) => events.push(e))
    host.destroy()

    firePointerEvent(btn, 'pointerdown', { pointerId: 1 })

    expect(events).toHaveLength(0)
  })
})
