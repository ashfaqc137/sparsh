import { describe, expect, it } from 'vitest'
import type { Decision } from '../src/decision.js'
import { createGuard } from '../src/engine.js'
import { activationEvent, createFakeHost, intentEvent, makeTarget } from './fake-host.js'

function setup(mode: 'report' | 'enforce' = 'enforce') {
  const host = createFakeHost()
  const decisions: Decision[] = []
  const guard = createGuard(host, {
    mode: { continuity: mode },
    onDecision: (d) => decisions.push(d),
  })
  return { host, guard, decisions }
}

describe('ContinuityPolicy', () => {
  it('row 1: down then up, same stable element, no movement → allowed (happy path)', () => {
    const { host, decisions } = setup()
    const t = makeTarget()
    host.register(t.handle, t.data)

    host.fire(intentEvent('mouse', t.handle, { pointerId: 1, timeStamp: 0 }))
    host.fire(activationEvent('mouse', t.handle, { pointerId: 1, timeStamp: 50 }))

    expect(decisions).toHaveLength(1)
    expect(decisions[0]?.allowed).toBe(true)
    expect(host.blocked).toHaveLength(0)
  })

  it('row 8: rect displaced past threshold between down and up → blocked', () => {
    const { host, decisions } = setup()
    const t = makeTarget()
    host.register(t.handle, t.data)

    host.fire(intentEvent('mouse', t.handle, { pointerId: 1, timeStamp: 0 }))
    host.update(t.handle, t.data, { rect: { ...t.data.rect, x: t.data.rect.x + 20 } })
    host.fire(activationEvent('mouse', t.handle, { pointerId: 1, timeStamp: 50 }))

    expect(decisions[0]?.allowed).toBe(false)
    expect(decisions[0]?.policy).toBe('continuity')
    expect(host.blocked).toHaveLength(1)
  })

  it('movement within threshold (sub-pixel jitter) → allowed', () => {
    const { host, decisions } = setup()
    const t = makeTarget()
    host.register(t.handle, t.data)

    host.fire(intentEvent('mouse', t.handle, { pointerId: 1, timeStamp: 0 }))
    host.update(t.handle, t.data, { rect: { ...t.data.rect, x: t.data.rect.x + 1 } })
    host.fire(activationEvent('mouse', t.handle, { pointerId: 1, timeStamp: 50 }))

    expect(decisions[0]?.allowed).toBe(true)
  })

  it('row 9: identity differs (interstitial swap) between down and up → blocked', () => {
    const { host, decisions } = setup()
    const a = makeTarget({ rect: { x: 0, y: 0, w: 100, h: 40 } })
    const b = makeTarget({ rect: { x: 0, y: 0, w: 100, h: 40 } })
    host.register(a.handle, a.data)
    host.register(b.handle, b.data)

    // Same on-screen slot, but a different element handle now occupies it (interstitial swap).
    host.fire(intentEvent('mouse', a.handle, { pointerId: 1, timeStamp: 0 }))
    host.fire(activationEvent('mouse', b.handle, { pointerId: 1, timeStamp: 50 }))

    expect(decisions[0]?.allowed).toBe(false)
    expect(decisions[0]?.policy).toBe('continuity')
  })

  it('up without a preceding down (virtual) → allowed (no intent → fail open)', () => {
    const { host, decisions } = setup()
    const t = makeTarget()
    host.register(t.handle, t.data)

    host.fire(activationEvent('virtual', t.handle, { timeStamp: 0 }))

    expect(decisions[0]?.allowed).toBe(true)
  })

  it('row 16: pointercancel mid-press, then a fresh legitimate press → fresh press allowed', () => {
    const { host, decisions } = setup()
    const t = makeTarget()
    host.register(t.handle, t.data)

    host.fire(intentEvent('touch', t.handle, { pointerId: 7, timeStamp: 0 }))
    // Displace the target — if the cancelled intent were still tracked, the next activation
    // would wrongly compare against this stale snapshot.
    host.update(t.handle, t.data, { rect: { ...t.data.rect, x: t.data.rect.x + 999 } })
    host.fireIntentClear({ pointerId: 7, timeStamp: 10 })

    host.fire(intentEvent('touch', t.handle, { pointerId: 7, timeStamp: 20 }))
    host.fire(activationEvent('touch', t.handle, { pointerId: 7, timeStamp: 70 }))

    expect(decisions).toHaveLength(1)
    expect(decisions[0]?.allowed).toBe(true)
  })

  it('row 17: lostpointercapture (drag handoff) clears intent; next press allowed', () => {
    const { host, decisions } = setup()
    const t = makeTarget()
    host.register(t.handle, t.data)

    host.fire(intentEvent('mouse', t.handle, { pointerId: 3, timeStamp: 0 }))
    host.update(t.handle, t.data, { rect: { ...t.data.rect, x: t.data.rect.x + 999 } })
    host.fireIntentClear({ pointerId: 3, timeStamp: 5 })

    host.fire(intentEvent('mouse', t.handle, { pointerId: 3, timeStamp: 10 }))
    host.fire(activationEvent('mouse', t.handle, { pointerId: 3, timeStamp: 60 }))

    expect(decisions[0]?.allowed).toBe(true)
  })

  it('rapid legitimate repeat presses on a stable control → all allowed', () => {
    const { host, decisions } = setup()
    const t = makeTarget()
    host.register(t.handle, t.data)

    for (let i = 0; i < 5; i++) {
      const base = i * 100
      host.fire(intentEvent('mouse', t.handle, { pointerId: 1, timeStamp: base }))
      host.fire(activationEvent('mouse', t.handle, { pointerId: 1, timeStamp: base + 20 }))
    }

    expect(decisions).toHaveLength(5)
    expect(decisions.every((d) => d.allowed)).toBe(true)
  })

  it('never runs for key/virtual kinds even with mismatched state (a11y carve-out, D11)', () => {
    const { host, decisions } = setup()
    const a = makeTarget()
    const b = makeTarget()
    host.register(a.handle, a.data)
    host.register(b.handle, b.data)

    // No pointerdown at all for key/virtual — Continuity must not evaluate, let alone block.
    host.fire(activationEvent('key', b.handle, { timeStamp: 0 }))
    host.fire(activationEvent('virtual', a.handle, { timeStamp: 0 }))

    expect(decisions.every((d) => d.allowed)).toBe(true)
    expect(host.blocked).toHaveLength(0)
  })
})
