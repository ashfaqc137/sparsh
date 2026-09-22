import { beforeEach, describe, expect, it } from 'vitest'
import { toHandle } from '../src/resolve.js'
import { buildFingerprint, rectOf, snapshotOf } from '../src/snapshot.js'
import { byId } from './dom-events.js'

describe('rectOf', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('reads the element rect shape correctly', () => {
    document.body.innerHTML = '<button id="btn">x</button>'
    const rect = rectOf(byId('btn'))
    expect(rect).toEqual({
      x: expect.any(Number),
      y: expect.any(Number),
      w: expect.any(Number),
      h: expect.any(Number),
    })
  })

  it('reflects a mocked displaced rect', () => {
    document.body.innerHTML = '<button id="btn">x</button>'
    const btn = byId('btn')
    btn.getBoundingClientRect = () => ({ x: 10, y: 20, width: 30, height: 40 }) as DOMRect
    expect(rectOf(btn)).toEqual({ x: 10, y: 20, w: 30, h: 40 })
  })
})

describe('buildFingerprint', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('disabled is true when the disabled property/attribute is set', () => {
    document.body.innerHTML = '<button id="btn" disabled>x</button>'
    expect(buildFingerprint(byId('btn')).disabled).toBe(true)
  })

  it('disabled is true via aria-disabled', () => {
    document.body.innerHTML = '<button id="btn" aria-disabled="true">x</button>'
    expect(buildFingerprint(byId('btn')).disabled).toBe(true)
  })

  it('disabled is false otherwise', () => {
    document.body.innerHTML = '<button id="btn">x</button>'
    expect(buildFingerprint(byId('btn')).disabled).toBe(false)
  })

  it('captures guardKey', () => {
    document.body.innerHTML = '<button id="btn" data-guard-key="row-1">x</button>'
    expect(buildFingerprint(byId('btn')).guardKey).toBe('row-1')
  })

  it('captures ariaLabel, role, hrefOrValue', () => {
    document.body.innerHTML = '<a id="a" href="/x" aria-label="Go" role="link">Go</a>'
    const fp = buildFingerprint(byId('a'))
    expect(fp.ariaLabel).toBe('Go')
    expect(fp.role).toBe('link')
    expect(fp.hrefOrValue).toBe('/x')
  })

  it('populates text but it is not compared by default (cross-checked in core SemanticsPolicy)', () => {
    document.body.innerHTML = '<button id="btn">Add to cart</button>'
    expect(buildFingerprint(byId('btn')).text).toBe('Add to cart')
  })
})

describe('snapshotOf', () => {
  it('assembles identity + rect + fingerprint + guardOff + the supplied ageMs', () => {
    document.body.innerHTML = '<button id="btn">x</button>'
    const el = byId('btn')
    const handle = toHandle(el)
    const snap = snapshotOf(handle, 42)
    expect(snap.identity).toBe(el)
    expect(snap.ageMs).toBe(42)
    expect(snap.guardOff).toBe(false)
    expect(snap.fingerprint.disabled).toBe(false)
  })
})
