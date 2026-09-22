import { describe, expect, it } from 'vitest'
import type { Decision } from '../src/decision.js'
import { createGuard } from '../src/engine.js'
import { activationEvent, createFakeHost, makeTarget } from './fake-host.js'

function setup(mode: 'report' | 'enforce' = 'enforce', cooldownMs = 500) {
  const host = createFakeHost()
  const decisions: Decision[] = []
  const guard = createGuard(host, {
    mode: { age: mode },
    cooldownMs,
    onDecision: (d) => decisions.push(d),
  })
  return { host, guard, decisions }
}

describe('AgePolicy', () => {
  it('row 3: age 120ms, cooldown 500 → blocked (verdict); enforced when mode=enforce', () => {
    const { host, decisions } = setup('enforce', 500)
    const t = makeTarget({ ageMs: 120 })
    host.register(t.handle, t.data)

    host.fire(activationEvent('mouse', t.handle, { pointerId: 1, timeStamp: 120 }))

    expect(decisions[0]?.allowed).toBe(false)
    expect(decisions[0]?.policy).toBe('age')
    expect(decisions[0]?.enforced).toBe(true)
    expect(host.blocked).toHaveLength(1)
  })

  it('default report mode: verdict blocked but NOT enforced (D6)', () => {
    const { host, decisions } = setup('report', 500)
    const t = makeTarget({ ageMs: 120 })
    host.register(t.handle, t.data)

    host.fire(activationEvent('mouse', t.handle, { pointerId: 1, timeStamp: 120 }))

    expect(decisions[0]?.allowed).toBe(false)
    expect(decisions[0]?.enforced).toBe(false)
    expect(host.blocked).toHaveLength(0)
  })

  it('row 4: age 600ms (>= cooldown 500) → allowed', () => {
    const { decisions, host } = setup('enforce', 500)
    const t = makeTarget({ ageMs: 600 })
    host.register(t.handle, t.data)

    host.fire(activationEvent('mouse', t.handle, { pointerId: 1, timeStamp: 600 }))

    expect(decisions[0]?.allowed).toBe(true)
  })

  it('row 5: pre-existing (unseen) element, ageMs=Infinity → allowed', () => {
    const { decisions, host } = setup('enforce', 500)
    const t = makeTarget({ ageMs: Number.POSITIVE_INFINITY })
    host.register(t.handle, t.data)

    host.fire(activationEvent('mouse', t.handle, { pointerId: 1, timeStamp: 0 }))

    expect(decisions[0]?.allowed).toBe(true)
  })

  it('row 15: key/virtual young target → verdict blocked, but report mode ⇒ not enforced', () => {
    const { decisions, host } = setup('report', 500)
    const t = makeTarget({ ageMs: 50 })
    host.register(t.handle, t.data)

    host.fire(activationEvent('key', t.handle, { timeStamp: 50 }))

    expect(decisions[0]?.allowed).toBe(false)
    expect(decisions[0]?.enforced).toBe(false)
  })

  it('same key/virtual activation after the cooldown window → allowed (never permanently blocked)', () => {
    const { decisions, host } = setup('enforce', 500)
    const t = makeTarget({ ageMs: 50 })
    host.register(t.handle, t.data)
    host.fire(activationEvent('key', t.handle, { timeStamp: 50 }))
    expect(decisions[0]?.allowed).toBe(false)

    host.update(t.handle, t.data, { ageMs: 600 })
    host.fire(activationEvent('key', t.handle, { timeStamp: 600 }))
    expect(decisions[1]?.allowed).toBe(true)
  })
})
