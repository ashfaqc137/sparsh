import { beforeEach, describe, expect, it } from 'vitest'
import {
  fromHandle,
  guardKeyOf,
  isGuardOff,
  resolveInteractiveElement,
  toHandle,
} from '../src/resolve.js'
import { byId } from './dom-events.js'

describe('resolveInteractiveElement', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('resolves a span inside a button to the button', () => {
    document.body.innerHTML = '<button id="btn"><span id="label">Click</span></button>'
    const span = byId('label')
    const resolved = resolveInteractiveElement(span)
    expect(resolved).toBe(byId('btn'))
  })

  it('resolves bare text inside an anchor to the anchor', () => {
    document.body.innerHTML = '<a id="link" href="/x">go</a>'
    const anchor = byId('link')
    const textNode = anchor.firstChild as Text // a Text node, not an Element
    const resolved = resolveInteractiveElement(textNode)
    expect(resolved).toBe(anchor)
  })

  it('resolves non-interactive whitespace to null', () => {
    document.body.innerHTML = '<div id="wrapper"><p id="text">just text</p></div>'
    const p = byId('text')
    expect(resolveInteractiveElement(p)).toBeNull()
  })

  it('returns null for non-Element raw targets', () => {
    expect(resolveInteractiveElement(null)).toBeNull()
    expect(resolveInteractiveElement(undefined)).toBeNull()
    expect(resolveInteractiveElement({})).toBeNull()
  })

  it('two events on the same button resolve to the same identity', () => {
    document.body.innerHTML = '<button id="btn">x</button>'
    const btn = byId('btn')
    const first = resolveInteractiveElement(btn)
    const second = resolveInteractiveElement(btn)
    expect(first).toBe(second)
  })

  it('a replaced node resolves to a different identity', () => {
    document.body.innerHTML = '<button id="btn">x</button>'
    const before = resolveInteractiveElement(byId('btn'))
    const replacement = document.createElement('button')
    replacement.id = 'btn'
    byId('btn').replaceWith(replacement)
    const after = resolveInteractiveElement(byId('btn'))
    expect(before).not.toBe(after)
  })
})

describe('handle round-trip', () => {
  it('toHandle/fromHandle round-trips the same Element', () => {
    const el = document.createElement('button')
    const handle = toHandle(el)
    expect(fromHandle(handle)).toBe(el)
  })
})

describe('isGuardOff / guardKeyOf', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('discovers data-guard="off" from an ancestor via closest, from a deep child target', () => {
    document.body.innerHTML =
      '<div data-guard="off"><button id="btn"><span id="deep">x</span></button></div>'
    expect(isGuardOff(byId('btn'))).toBe(true)
  })

  it('is false when no ancestor opts out', () => {
    document.body.innerHTML = '<button id="btn">x</button>'
    expect(isGuardOff(byId('btn'))).toBe(false)
  })

  it('reads data-guard-key from the resolved element or an ancestor', () => {
    document.body.innerHTML = '<div data-guard-key="row-1"><button id="btn">x</button></div>'
    expect(guardKeyOf(byId('btn'))).toBe('row-1')
  })

  it('is undefined when no guard key is present', () => {
    document.body.innerHTML = '<button id="btn">x</button>'
    expect(guardKeyOf(byId('btn'))).toBeUndefined()
  })
})
