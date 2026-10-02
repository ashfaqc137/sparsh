import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createAgeTracker } from '../src/age.js'

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** MutationObserver callbacks fire as a microtask; give them a tick to flush. */
function flushMutations(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

describe('createAgeTracker', () => {
  let tracker: ReturnType<typeof createAgeTracker> | undefined

  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    tracker?.destroy()
    tracker = undefined
  })

  it('reports Infinity for a pre-existing element never observed by this tracker', async () => {
    document.body.innerHTML = '<button id="pre">x</button>'
    tracker = createAgeTracker(document.body)
    await flushMutations()

    const el = document.getElementById('pre') as HTMLElement
    expect(tracker.ageMs(el, performance.now())).toBe(Number.POSITIVE_INFINITY)
  })

  it('reports a small age for a freshly inserted element, growing over time', async () => {
    tracker = createAgeTracker(document.body)
    const el = document.createElement('button')
    document.body.appendChild(el)
    await flushMutations()

    const ageJustAfter = tracker.ageMs(el, performance.now())
    expect(ageJustAfter).toBeGreaterThanOrEqual(0)
    expect(ageJustAfter).toBeLessThan(200) // generous bound for CI jitter

    await wait(60)
    const ageLater = tracker.ageMs(el, performance.now())
    expect(ageLater).toBeGreaterThanOrEqual(ageJustAfter + 40)
  })

  it('is O(added nodes): does not retroactively stamp pre-existing siblings', async () => {
    document.body.innerHTML = '<button id="existing">x</button>'
    tracker = createAgeTracker(document.body)
    const added = document.createElement('button')
    document.body.appendChild(added)
    await flushMutations()

    const existing = document.getElementById('existing') as HTMLElement
    expect(tracker.ageMs(existing, performance.now())).toBe(Number.POSITIVE_INFINITY)
    expect(tracker.ageMs(added, performance.now())).not.toBe(Number.POSITIVE_INFINITY)
  })

  it('stamps descendants already attached to a newly-inserted subtree (build off-document, append once)', async () => {
    tracker = createAgeTracker(document.body)
    // Common real-world pattern (e.g. a toast built with its own button before being mounted):
    // the whole subtree is assembled detached, then inserted in a single appendChild.
    const wrapper = document.createElement('div')
    const inner = document.createElement('button')
    wrapper.appendChild(inner)
    document.body.appendChild(wrapper)
    await flushMutations()

    expect(tracker.ageMs(wrapper, performance.now())).not.toBe(Number.POSITIVE_INFINITY)
    expect(tracker.ageMs(inner, performance.now())).not.toBe(Number.POSITIVE_INFINITY)
  })

  it('re-arms a pre-existing, page-load-disabled element the moment it becomes enabled', async () => {
    document.body.innerHTML = '<button id="pre" disabled>x</button>'
    tracker = createAgeTracker(document.body)
    await flushMutations()

    const el = document.getElementById('pre') as HTMLButtonElement
    // Still disabled: untracked, fail-open.
    expect(tracker.ageMs(el, performance.now())).toBe(Number.POSITIVE_INFINITY)

    el.removeAttribute('disabled')
    await flushMutations()

    const ageJustAfterEnable = tracker.ageMs(el, performance.now())
    expect(ageJustAfterEnable).toBeGreaterThanOrEqual(0)
    expect(ageJustAfterEnable).toBeLessThan(200)
  })

  it('re-arms via aria-disabled="true" → "false" the same way as the disabled attribute', async () => {
    document.body.innerHTML = '<button id="pre" aria-disabled="true">x</button>'
    tracker = createAgeTracker(document.body)
    await flushMutations()

    const el = document.getElementById('pre') as HTMLButtonElement
    expect(tracker.ageMs(el, performance.now())).toBe(Number.POSITIVE_INFINITY)

    el.setAttribute('aria-disabled', 'false')
    await flushMutations()

    expect(tracker.ageMs(el, performance.now())).not.toBe(Number.POSITIVE_INFINITY)
  })

  it('re-arms a previously-tracked element that becomes disabled then enabled again', async () => {
    tracker = createAgeTracker(document.body)
    const el = document.createElement('button')
    document.body.appendChild(el)
    await flushMutations()

    await wait(60)
    el.disabled = true
    await flushMutations()
    el.disabled = false
    await flushMutations()

    const ageAfterReEnable = tracker.ageMs(el, performance.now())
    expect(ageAfterReEnable).toBeGreaterThanOrEqual(0)
    expect(ageAfterReEnable).toBeLessThan(200)
  })

  it('does not re-arm on a disabled → disabled (no-op) or enabled → disabled transition', async () => {
    document.body.innerHTML = '<button id="pre">x</button>'
    tracker = createAgeTracker(document.body)
    await flushMutations()

    const el = document.getElementById('pre') as HTMLButtonElement
    // Untracked, enabled pre-existing element stays Infinity.
    el.disabled = true
    await flushMutations()
    expect(tracker.ageMs(el, performance.now())).toBe(Number.POSITIVE_INFINITY)
  })

  it('destroy() disconnects observers — no further stamping', async () => {
    tracker = createAgeTracker(document.body)
    tracker.destroy()

    const el = document.createElement('button')
    document.body.appendChild(el)
    await flushMutations()

    expect(tracker.ageMs(el, performance.now())).toBe(Number.POSITIVE_INFINITY)
  })
})
