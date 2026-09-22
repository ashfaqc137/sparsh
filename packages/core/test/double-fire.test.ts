import { describe, expect, it } from 'vitest'
import type { Decision } from '../src/decision.js'
import { createGuard } from '../src/engine.js'
import { activationEvent, createFakeHost, intentEvent, makeTarget } from './fake-host.js'

function setup(refractoryMs = 300, cooldownMs = 500) {
  const host = createFakeHost()
  const decisions: Decision[] = []
  const guard = createGuard(host, {
    // Isolate DoubleFire from Age/Continuity/Semantics for these unit tests — Age uses the same
    // "younger than cooldownMs" signal and would otherwise win the pipeline first (by design;
    // see prompts/02-policies/double-fire.md "Relationship to the other policies"). Engine-level
    // interplay across all four policies together is covered in engine.test.ts.
    policies: ['doubleFire'],
    mode: 'enforce',
    refractoryMs,
    cooldownMs,
    onDecision: (d) => decisions.push(d),
  })
  return { host, guard, decisions }
}

describe('DoubleFirePolicy', () => {
  it('row 18: dialog closes on click; residual click on element underneath → blocked', () => {
    const { host, decisions } = setup()
    const dialogButton = makeTarget({ rect: { x: 100, y: 100, w: 80, h: 30 } })
    const revealedButton = makeTarget({ rect: { x: 100, y: 100, w: 80, h: 30 }, ageMs: 10 })
    host.register(dialogButton.handle, dialogButton.data)
    host.register(revealedButton.handle, revealedButton.data)

    // First activation: closes the dialog (committed / allowed).
    host.fire(intentEvent('mouse', dialogButton.handle, { pointerId: 1, timeStamp: 0 }))
    host.fire(activationEvent('mouse', dialogButton.handle, { pointerId: 1, timeStamp: 20 }))
    expect(decisions[0]?.allowed).toBe(true)

    // Residual event lands on the now-revealed, young, overlapping element shortly after.
    host.fire(activationEvent('mouse', revealedButton.handle, { pointerId: 2, timeStamp: 100 }))

    expect(decisions[1]?.allowed).toBe(false)
    expect(decisions[1]?.policy).toBe('doubleFire')
    expect(host.blocked).toHaveLength(1)
  })

  it('row 19: rapid legitimate double-click on the SAME stable button → allowed (non-regression)', () => {
    const { host, decisions } = setup()
    const t = makeTarget({ ageMs: Number.POSITIVE_INFINITY })
    host.register(t.handle, t.data)

    host.fire(intentEvent('mouse', t.handle, { pointerId: 1, timeStamp: 0 }))
    host.fire(activationEvent('mouse', t.handle, { pointerId: 1, timeStamp: 20 }))
    host.fire(intentEvent('mouse', t.handle, { pointerId: 1, timeStamp: 50 }))
    host.fire(activationEvent('mouse', t.handle, { pointerId: 1, timeStamp: 70 }))

    expect(decisions.every((d) => d.allowed)).toBe(true)
    expect(host.blocked).toHaveLength(0)
  })

  it('second activation after the refractory window → allowed', () => {
    const { host, decisions } = setup(300, 500)
    const first = makeTarget({ rect: { x: 0, y: 0, w: 50, h: 50 } })
    const second = makeTarget({ rect: { x: 0, y: 0, w: 50, h: 50 }, ageMs: 10 })
    host.register(first.handle, first.data)
    host.register(second.handle, second.data)

    host.fire(intentEvent('mouse', first.handle, { pointerId: 1, timeStamp: 0 }))
    host.fire(activationEvent('mouse', first.handle, { pointerId: 1, timeStamp: 20 }))

    // Well past the 300ms refractory window.
    host.fire(activationEvent('mouse', second.handle, { pointerId: 2, timeStamp: 1000 }))

    expect(decisions[1]?.allowed).toBe(true)
  })

  it('overlapping coords but target is NOT young (old, unrelated element) → allowed', () => {
    const { host, decisions } = setup()
    const first = makeTarget({ rect: { x: 0, y: 0, w: 50, h: 50 } })
    const second = makeTarget({
      rect: { x: 0, y: 0, w: 50, h: 50 },
      ageMs: Number.POSITIVE_INFINITY,
    })
    host.register(first.handle, first.data)
    host.register(second.handle, second.data)

    host.fire(intentEvent('mouse', first.handle, { pointerId: 1, timeStamp: 0 }))
    host.fire(activationEvent('mouse', first.handle, { pointerId: 1, timeStamp: 20 }))
    host.fire(activationEvent('mouse', second.handle, { pointerId: 2, timeStamp: 100 }))

    expect(decisions[1]?.allowed).toBe(true)
  })

  it('never runs for key/virtual kinds (pointer only)', () => {
    const { host, decisions } = setup()
    const first = makeTarget({ rect: { x: 0, y: 0, w: 50, h: 50 } })
    const second = makeTarget({ rect: { x: 0, y: 0, w: 50, h: 50 }, ageMs: 10 })
    host.register(first.handle, first.data)
    host.register(second.handle, second.data)

    host.fire(intentEvent('mouse', first.handle, { pointerId: 1, timeStamp: 0 }))
    host.fire(activationEvent('mouse', first.handle, { pointerId: 1, timeStamp: 20 }))
    host.fire(activationEvent('key', second.handle, { timeStamp: 100 }))

    expect(decisions[1]?.allowed).toBe(true)
  })
})
