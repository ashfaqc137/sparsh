import type { Decision, TargetHandle } from '@sparsh/core'
import { beforeEach, describe, expect, it } from 'vitest'
import { createGuard } from '../src/index.js'
import { fireClick, firePointerEvent } from './dom-events.js'

describe('createGuard (vanilla entry point)', () => {
  let btn: HTMLButtonElement

  beforeEach(() => {
    document.body.innerHTML = '<button id="btn">Click</button>'
    btn = document.getElementById('btn') as HTMLButtonElement
  })

  it('fires onDecision for a clean pointer interaction (report mode, allowed)', () => {
    const decisions: Decision[] = []
    const guard = createGuard(document.body, {
      mode: 'report',
      onDecision: (d) => decisions.push(d),
    })

    firePointerEvent(btn, 'pointerdown', { pointerId: 1 })
    firePointerEvent(btn, 'pointerup', { pointerId: 1 })

    expect(decisions).toHaveLength(1)
    expect(decisions[0].allowed).toBe(true)
    expect(decisions[0].enforced).toBe(false)

    guard.destroy()
  })

  it('flags but does not block in report mode, even when Continuity would object', () => {
    // pointerdown on the button, then the button is displaced before pointerup — Continuity
    // should flag this, but report mode must never enforce.
    const decisions: Decision[] = []
    const guard = createGuard(document.body, {
      mode: 'report',
      onDecision: (d) => decisions.push(d),
    })

    firePointerEvent(btn, 'pointerdown', { pointerId: 1 })
    btn.getBoundingClientRect = () => ({ x: 999, y: 999, width: 10, height: 10 }) as DOMRect
    firePointerEvent(btn, 'pointerup', { pointerId: 1 })

    expect(decisions).toHaveLength(1)
    expect(decisions[0].allowed).toBe(false)
    expect(decisions[0].policy).toBe('continuity')
    expect(decisions[0].enforced).toBe(false)

    guard.destroy()
  })

  it('blocks in enforce mode when Continuity flags a displaced target', () => {
    let bubbleFired = false
    btn.addEventListener('pointerup', () => {
      bubbleFired = true
    })

    const guard = createGuard(document.body, { mode: { continuity: 'enforce' } })

    firePointerEvent(btn, 'pointerdown', { pointerId: 1 })
    btn.getBoundingClientRect = () => ({ x: 999, y: 999, width: 10, height: 10 }) as DOMRect
    firePointerEvent(btn, 'pointerup', { pointerId: 1 })

    expect(bubbleFired).toBe(false) // blocked at the event layer, never reached the bubble handler

    guard.destroy()
  })

  it('isGuarded reflects the most recent enforced-block state for a target', () => {
    const guard = createGuard(document.body, { mode: { continuity: 'enforce' } })

    firePointerEvent(btn, 'pointerdown', { pointerId: 1 })
    btn.getBoundingClientRect = () => ({ x: 999, y: 999, width: 10, height: 10 }) as DOMRect
    firePointerEvent(btn, 'pointerup', { pointerId: 1 })

    expect(guard.isGuarded(btn as unknown as TargetHandle)).toBe(true)

    guard.destroy()
  })

  it('destroy() tears down both the engine and the host (no further decisions)', () => {
    const decisions: Decision[] = []
    const guard = createGuard(document.body, { onDecision: (d) => decisions.push(d) })
    guard.destroy()

    firePointerEvent(btn, 'pointerdown', { pointerId: 1 })
    firePointerEvent(btn, 'pointerup', { pointerId: 1 })
    fireClick(btn)

    expect(decisions).toHaveLength(0)
  })
})
