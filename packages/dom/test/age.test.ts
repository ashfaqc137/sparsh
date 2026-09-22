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

  it('destroy() disconnects observers — no further stamping', async () => {
    tracker = createAgeTracker(document.body)
    tracker.destroy()

    const el = document.createElement('button')
    document.body.appendChild(el)
    await flushMutations()

    expect(tracker.ageMs(el, performance.now())).toBe(Number.POSITIVE_INFINITY)
  })
})
