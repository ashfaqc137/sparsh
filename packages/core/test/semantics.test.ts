import { describe, expect, it } from 'vitest'
import type { Decision } from '../src/decision.js'
import { createGuard } from '../src/engine.js'
import { activationEvent, createFakeHost, intentEvent, makeTarget } from './fake-host.js'

function setup(opts: { textCheck?: boolean } = {}) {
  const host = createFakeHost()
  const decisions: Decision[] = []
  const guard = createGuard(host, {
    mode: { semantics: 'enforce' },
    semanticsTextCheck: opts.textCheck ?? false,
    onDecision: (d) => decisions.push(d),
  })
  return { host, guard, decisions }
}

describe('SemanticsPolicy', () => {
  it('row 7: disabled → enabled between down and up → blocked', () => {
    const { host, decisions } = setup()
    const t = makeTarget({ fingerprint: { disabled: true } })
    host.register(t.handle, t.data)

    host.fire(intentEvent('mouse', t.handle, { pointerId: 1, timeStamp: 0 }))
    host.update(t.handle, t.data, { fingerprint: { ...t.data.fingerprint, disabled: false } })
    host.fire(activationEvent('mouse', t.handle, { pointerId: 1, timeStamp: 50 }))

    expect(decisions[0]?.allowed).toBe(false)
    expect(decisions[0]?.policy).toBe('semantics')
    expect(decisions[0]?.reason).toContain('disabled')
  })

  it('row 10: aria-label meaning change → blocked', () => {
    const { host, decisions } = setup()
    const t = makeTarget({ fingerprint: { disabled: false, ariaLabel: 'Add to cart' } })
    host.register(t.handle, t.data)

    host.fire(intentEvent('mouse', t.handle, { pointerId: 1, timeStamp: 0 }))
    host.update(t.handle, t.data, {
      fingerprint: { ...t.data.fingerprint, ariaLabel: 'Remove from cart' },
    })
    host.fire(activationEvent('mouse', t.handle, { pointerId: 1, timeStamp: 50 }))

    expect(decisions[0]?.allowed).toBe(false)
    expect(decisions[0]?.reason).toContain('ariaLabel')
  })

  it('row 11: data-guard-key change (list reorder) → blocked', () => {
    const { host, decisions } = setup()
    const t = makeTarget({ fingerprint: { disabled: false, guardKey: 'invoice-42' } })
    host.register(t.handle, t.data)

    host.fire(intentEvent('mouse', t.handle, { pointerId: 1, timeStamp: 0 }))
    host.update(t.handle, t.data, {
      fingerprint: { ...t.data.fingerprint, guardKey: 'invoice-99' },
    })
    host.fire(activationEvent('mouse', t.handle, { pointerId: 1, timeStamp: 50 }))

    expect(decisions[0]?.allowed).toBe(false)
    expect(decisions[0]?.reason).toContain('guardKey')
  })

  it('row 12: reorder without data-guard-key, no other field change → allowed (documented gap)', () => {
    const { host, decisions } = setup()
    const t = makeTarget({ fingerprint: { disabled: false } })
    host.register(t.handle, t.data)

    host.fire(intentEvent('mouse', t.handle, { pointerId: 1, timeStamp: 0 }))
    // Underlying entity silently swapped; DOM fingerprint (and identity/rect) unchanged.
    host.fire(activationEvent('mouse', t.handle, { pointerId: 1, timeStamp: 50 }))

    expect(decisions[0]?.allowed).toBe(true)
  })

  it('row 13: stable control with live "2m ago" text, default config → allowed (no false positive)', () => {
    const { host, decisions } = setup()
    const t = makeTarget({ fingerprint: { disabled: false, text: '2 minutes ago' } })
    host.register(t.handle, t.data)

    host.fire(intentEvent('mouse', t.handle, { pointerId: 1, timeStamp: 0 }))
    host.update(t.handle, t.data, { fingerprint: { ...t.data.fingerprint, text: '3 minutes ago' } })
    host.fire(activationEvent('mouse', t.handle, { pointerId: 1, timeStamp: 50 }))

    expect(decisions[0]?.allowed).toBe(true)
  })

  it('with text-check opt-in, label "Add" → "Remove" → blocked', () => {
    const { host, decisions } = setup({ textCheck: true })
    const t = makeTarget({ fingerprint: { disabled: false, text: 'Add to cart' } })
    host.register(t.handle, t.data)

    host.fire(intentEvent('mouse', t.handle, { pointerId: 1, timeStamp: 0 }))
    host.update(t.handle, t.data, {
      fingerprint: { ...t.data.fingerprint, text: 'Remove from cart' },
    })
    host.fire(activationEvent('mouse', t.handle, { pointerId: 1, timeStamp: 50 }))

    expect(decisions[0]?.allowed).toBe(false)
    expect(decisions[0]?.reason).toContain('text')
  })

  it('applies to key/virtual kinds too (unlike Continuity)', () => {
    const { host, decisions } = setup()
    const t = makeTarget({ fingerprint: { disabled: true } })
    host.register(t.handle, t.data)

    // No pointerdown — but a host may still supply a first-visible intent snapshot.
    host.fire(intentEvent('key', t.handle, { timeStamp: 0 }))
    host.update(t.handle, t.data, { fingerprint: { ...t.data.fingerprint, disabled: false } })
    host.fire(activationEvent('key', t.handle, { timeStamp: 50 }))

    expect(decisions[0]?.allowed).toBe(false)
    expect(decisions[0]?.policy).toBe('semantics')
  })

  it('no stored intent at all (e.g. pure virtual click) → allowed (fail open)', () => {
    const { host, decisions } = setup()
    const t = makeTarget({ fingerprint: { disabled: true } })
    host.register(t.handle, t.data)

    host.fire(activationEvent('virtual', t.handle, { timeStamp: 0 }))

    expect(decisions[0]?.allowed).toBe(true)
  })
})
