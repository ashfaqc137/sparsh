/**
 * Fake `Host` test double. Lets engine + policy tests run entirely in Node — no browser, no
 * jsdom — by synthesizing `ActivationEvent`s and scripting `TargetSnapshot` reads. This is the
 * backbone referenced by task T05: "every policy test reuses it."
 */

import type { Host, Unsubscribe } from '../src/host.js'
import type {
  ActivationEvent,
  Fingerprint,
  InputKind,
  IntentClearSignal,
  Rect,
  TargetHandle,
  TargetSnapshot,
} from '../src/types.js'

export interface FakeTargetData {
  identity: unknown
  rect: Rect
  fingerprint: Fingerprint
  ageMs: number
  guardOff: boolean
}

const DEFAULT_RECT: Rect = { x: 0, y: 0, w: 100, h: 40 }
const DEFAULT_FINGERPRINT: Fingerprint = { disabled: false }

let nextId = 0

/** Create a fresh opaque target handle carrying its own mutable fake data record. */
export function makeTarget(overrides: Partial<FakeTargetData> = {}): {
  handle: TargetHandle
  data: FakeTargetData
} {
  const id = nextId++
  const data: FakeTargetData = {
    identity: overrides.identity ?? `target-${id}`,
    rect: overrides.rect ?? { ...DEFAULT_RECT },
    fingerprint: overrides.fingerprint ?? { ...DEFAULT_FINGERPRINT },
    ageMs: overrides.ageMs ?? Number.POSITIVE_INFINITY,
    guardOff: overrides.guardOff ?? false,
  }
  const handle = { __id: id } as unknown as TargetHandle
  return { handle, data }
}

export interface FakeHost extends Host {
  /** Simulate a normalized activation event arriving from the platform. */
  fire(event: ActivationEvent): void
  /** Simulate `pointercancel` / `lostpointercapture`. */
  fireIntentClear(signal: IntentClearSignal): void
  /** Directly set the fake clock (host's `now()`). */
  setNow(t: number): void
  /** Advance the fake clock by `ms`. */
  advance(ms: number): void
  /** Register a target's initial data (must be called before any `snapshot()`/event referencing it). */
  register(handle: TargetHandle, data: FakeTargetData): void
  /** Mutate a target's live data (simulates DOM state changing between intent and activation). */
  update(handle: TargetHandle, data: FakeTargetData, patch: Partial<FakeTargetData>): void
  /** Every `block()` call the engine has made, in order. */
  blocked: ActivationEvent[]
  /** Force the next `snapshot()` call to throw once (fail-open testing). */
  throwOnNextSnapshot(): void
}

export function createFakeHost(): FakeHost {
  const eventListeners = new Set<(e: ActivationEvent) => void>()
  const clearListeners = new Set<(s: IntentClearSignal) => void>()
  const registry = new Map<TargetHandle, FakeTargetData>()
  const blocked: ActivationEvent[] = []
  let clock = 0
  let throwNext = false

  return {
    onActivationEvent(cb: (e: ActivationEvent) => void): Unsubscribe {
      eventListeners.add(cb)
      return () => eventListeners.delete(cb)
    },
    onIntentClear(cb: (s: IntentClearSignal) => void): Unsubscribe {
      clearListeners.add(cb)
      return () => clearListeners.delete(cb)
    },
    resolveTarget(raw: unknown): TargetHandle | null {
      return (raw as TargetHandle) ?? null
    },
    snapshot(target: TargetHandle): TargetSnapshot {
      if (throwNext) {
        throwNext = false
        throw new Error('fake snapshot failure')
      }
      const data = registry.get(target)
      if (!data) {
        throw new Error('unknown fake target — call host.update(handle, data, {}) to register it')
      }
      return {
        identity: data.identity,
        rect: { ...data.rect },
        fingerprint: { ...data.fingerprint },
        ageMs: data.ageMs,
        guardOff: data.guardOff,
      }
    },
    block(e: ActivationEvent): void {
      blocked.push(e)
    },
    now(): number {
      return clock
    },
    fire(event: ActivationEvent): void {
      // Keep the fake clock in lock-step with the event's declared timestamp — a real host's
      // `now()` reflects the moment it dispatches, which is `event.timeStamp`.
      clock = event.timeStamp
      for (const cb of eventListeners) cb(event)
    },
    fireIntentClear(signal: IntentClearSignal): void {
      for (const cb of clearListeners) cb(signal)
    },
    setNow(t: number): void {
      clock = t
    },
    advance(ms: number): void {
      clock += ms
    },
    update(handle: TargetHandle, data: FakeTargetData, patch: Partial<FakeTargetData>): void {
      Object.assign(data, patch)
      registry.set(handle, data)
    },
    register(handle: TargetHandle, data: FakeTargetData): void {
      registry.set(handle, data)
    },
    blocked,
    throwOnNextSnapshot(): void {
      throwNext = true
    },
  }
}

export function intentEvent(
  kind: InputKind,
  target: TargetHandle,
  opts: { pointerId?: number; timeStamp?: number } = {},
): ActivationEvent {
  return {
    phase: 'intent',
    kind,
    target,
    pointerId: opts.pointerId,
    timeStamp: opts.timeStamp ?? 0,
  }
}

export function activationEvent(
  kind: InputKind,
  target: TargetHandle,
  opts: { pointerId?: number; timeStamp?: number; neverBlock?: boolean } = {},
): ActivationEvent {
  return {
    phase: 'activation',
    kind,
    target,
    pointerId: opts.pointerId,
    timeStamp: opts.timeStamp ?? 0,
    neverBlock: opts.neverBlock,
  }
}
