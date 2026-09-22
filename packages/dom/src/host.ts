/**
 * `createDomHost(root, opts)` — the `@sparsh/dom` implementation of `@sparsh/core`'s `Host` port.
 *
 * Combines T12 (capture-phase listener + classification), T13 (target resolution, via
 * `resolve.ts`), T14/T15 (snapshot + age, via `snapshot.ts`/`age.ts`), and T16 (block + pointer
 * cleanup + visibility). One listener per event type on `root` (never `document`) — D10. Pointer
 * Events only, no legacy `mouse*`/`touch*` — D8. Blocking is capture-phase `preventDefault` +
 * `stopPropagation`, never `pointer-events:none` — D9.
 *
 * Real-browser-verified caveat to D9: for pointer/keyboard activations (phase `activation` from
 * `pointerup`/`keydown`), canceling the native pointerup/keydown event does NOT stop the browser's
 * own follow-up `click` — that only works for touch/pen "compatibility" events, not a mouse's
 * primary click. `block()` therefore defers the actual cancellation to the `click` event itself
 * via the `pendingClick` mechanism below; see its comment for the full explanation.
 */

import type { ActivationEvent, Host, InputKind, IntentClearSignal, Unsubscribe } from '@sparsh/core'
import { createAgeTracker } from './age.js'
import { fromHandle, resolveInteractiveElement, toHandle } from './resolve.js'
import { snapshotOf } from './snapshot.js'

export interface DomHostOptions {
  /**
   * How long (ms) to keep the pending-click bookkeeping armed after a pointerup/keydown
   * activation, so the browser's matching follow-up `click` for that same physical gesture is
   * recognized (and, if the activation was blocked, actually canceled) rather than treated as a
   * new, separate `virtual` activation. Default 500 — generous relative to normal event dispatch
   * latency, small relative to human interaction timing. Heuristic, not a guarantee (see
   * `classification.md`).
   */
  clickSuppressMs?: number
}

/** `createDomHost`'s return type: the `Host` port plus lifecycle teardown (not part of `Host`). */
export interface DomHost extends Host {
  destroy(): void
}

const DEFAULT_CLICK_SUPPRESS_MS = 500

const ACTIVATING_KEYS = new Set(['Enter', ' '])

function classifyPointerType(pointerType: string): InputKind {
  if (pointerType === 'touch') return 'touch'
  if (pointerType === 'pen') return 'pen'
  return 'mouse'
}

export function createDomHost(root: Element | Document, opts: DomHostOptions = {}): DomHost {
  const clickSuppressMs = opts.clickSuppressMs ?? DEFAULT_CLICK_SUPPRESS_MS

  const activationCbs = new Set<(e: ActivationEvent) => void>()
  const clearCbs = new Set<(s: IntentClearSignal) => void>()

  // Tracks which InputKind a live pointerdown belongs to, so pointerup can classify consistently.
  const pointerKinds = new Map<number, InputKind>()

  // Recovers the native event a given emitted ActivationEvent came from, for block(). Keyed by
  // object identity of the ActivationEvent we hand to the engine (same reference round-trips).
  const nativeEventOf = new WeakMap<ActivationEvent, Event>()

  // Tracks the browser's own follow-up `click` after a pointerup/keydown we already emitted as
  // the activation for that physical gesture (see classification.md + T12 notes).
  //
  // Empirically verified (real Chromium, not jsdom): canceling `pointerup`/`pointerdown`/
  // `mousedown` does NOT stop the browser's subsequent `click` for real mouse input — the Pointer
  // Events spec's "cancel pointerdown to suppress compatibility mouse events" behavior only
  // applies to non-hovering pointers (touch/pen); a mouse's `click` is its own primary event, not
  // a synthesized compatibility one, so it fires regardless of what we do to pointerup. The only
  // reliable, cross-pointer-type way to actually stop the real activation from executing is to
  // cancel the `click` event itself when it arrives. So: `block()` called during pointerup/keydown
  // handling can only *mark* the upcoming click as blocked (via `pendingClick.blocked`); the
  // actual `preventDefault`/`stopImmediatePropagation` happens in `onClick` once we see it.
  interface PendingClick {
    el: Element
    blocked: boolean
  }
  let pendingClick: PendingClick | null = null
  let pendingClickTimer: ReturnType<typeof setTimeout> | undefined

  function armPendingClick(el: Element): void {
    pendingClick = { el, blocked: false }
    if (pendingClickTimer !== undefined) clearTimeout(pendingClickTimer)
    pendingClickTimer = setTimeout(() => {
      pendingClick = null
      pendingClickTimer = undefined
    }, clickSuppressMs)
  }

  function clearPendingClick(): void {
    pendingClick = null
    if (pendingClickTimer !== undefined) {
      clearTimeout(pendingClickTimer)
      pendingClickTimer = undefined
    }
  }

  function stopImmediate(native: Event): void {
    if (typeof native.stopImmediatePropagation === 'function') {
      native.stopImmediatePropagation()
    } else {
      native.stopPropagation()
    }
  }

  const ageTracker = createAgeTracker(root)

  function emit(
    native: Event,
    phase: ActivationEvent['phase'],
    kind: InputKind,
    el: Element,
    pointerId?: number,
  ): void {
    const event: ActivationEvent = {
      phase,
      kind,
      pointerId,
      target: toHandle(el),
      timeStamp: performance.now(),
    }
    nativeEventOf.set(event, native)
    for (const cb of activationCbs) cb(event)
  }

  function emitClear(pointerId: number): void {
    const signal: IntentClearSignal = { pointerId, timeStamp: performance.now() }
    for (const cb of clearCbs) cb(signal)
  }

  // --- T12: capture-phase listeners + classification -----------------------------------------

  function onPointerDown(e: PointerEvent): void {
    const el = resolveInteractiveElement(e.target)
    if (el === null) return
    const kind = classifyPointerType(e.pointerType)
    pointerKinds.set(e.pointerId, kind)
    emit(e, 'intent', kind, el, e.pointerId)
  }

  function onPointerUp(e: PointerEvent): void {
    const kind = pointerKinds.get(e.pointerId)
    pointerKinds.delete(e.pointerId)
    if (kind === undefined) return // pointerup with no tracked pointerdown — nothing to guard
    const el = resolveInteractiveElement(e.target)
    if (el === null) return
    // Arm *before* emitting: the engine may call block() synchronously from within emit(), and
    // that must be able to mark this pending click as blocked before the browser dispatches it.
    armPendingClick(el)
    emit(e, 'activation', kind, el, e.pointerId)
  }

  function onPointerCancel(e: PointerEvent): void {
    if (!pointerKinds.has(e.pointerId)) return
    pointerKinds.delete(e.pointerId)
    emitClear(e.pointerId)
  }

  function onLostPointerCapture(e: PointerEvent): void {
    if (!pointerKinds.has(e.pointerId)) return
    pointerKinds.delete(e.pointerId)
    emitClear(e.pointerId)
  }

  function onClick(e: MouseEvent): void {
    const el = resolveInteractiveElement(e.target)
    if (el === null) return
    if (pendingClick !== null && pendingClick.el === el) {
      // This click is the browser's own follow-up to a pointerup/keydown we already emitted as
      // the activation for this gesture. If the engine blocked that activation, this is the only
      // place we can actually stop the real handler from running (see the comment above
      // `pendingClick`'s declaration).
      const blocked = pendingClick.blocked
      clearPendingClick()
      if (blocked) {
        e.preventDefault()
        stopImmediate(e)
      }
      return
    }
    // Reaches here only for clicks with no matching real pointer sequence: detail===0 (typical
    // AT-driven click) or an untracked pointerdown — classification.md: virtual.
    emit(e, 'activation', 'virtual', el)
  }

  function onKeyDown(e: KeyboardEvent): void {
    // Never intercept Escape/Tab/etc — only Enter/Space are activation keys. Everything else
    // (including Escape and focus-moving keys) is simply never emitted — an absolute prohibition
    // (classification.md), satisfied here by construction rather than an explicit neverBlock flag.
    if (!ACTIVATING_KEYS.has(e.key)) return
    const el = resolveInteractiveElement(e.target)
    if (el === null) return
    // Keyboard has no pointerdown: this keydown is both intent and activation in one event
    // (classification.md). Emit only the activation phase.
    // Arm *before* emitting for the same reason as onPointerUp: block() can be called
    // synchronously from within emit() and must be able to mark this pending click as blocked.
    armPendingClick(el)
    emit(e, 'activation', 'key', el)
  }

  root.addEventListener('pointerdown', onPointerDown as EventListener, true)
  root.addEventListener('pointerup', onPointerUp as EventListener, true)
  root.addEventListener('pointercancel', onPointerCancel as EventListener, true)
  root.addEventListener('lostpointercapture', onLostPointerCapture as EventListener, true)
  root.addEventListener('click', onClick as EventListener, true)
  root.addEventListener('keydown', onKeyDown as EventListener, true)

  let destroyed = false

  return {
    onActivationEvent(cb: (e: ActivationEvent) => void): Unsubscribe {
      activationCbs.add(cb)
      return () => activationCbs.delete(cb)
    },

    onIntentClear(cb: (signal: IntentClearSignal) => void): Unsubscribe {
      clearCbs.add(cb)
      return () => clearCbs.delete(cb)
    },

    resolveTarget(raw: unknown) {
      const el = resolveInteractiveElement(raw)
      return el === null ? null : toHandle(el)
    },

    snapshot(target) {
      const el = fromHandle(target)
      return snapshotOf(target, ageTracker.ageMs(el, performance.now()))
    },

    // --- T16: block() ---------------------------------------------------------------------
    block(e: ActivationEvent): void {
      const native = nativeEventOf.get(e)
      if (native === undefined) return
      native.preventDefault()
      stopImmediate(native)
      if (native.type === 'click') return // native IS the click (virtual activation) — done.
      // native is pointerup/keydown: canceling it does not stop the browser's own follow-up
      // click for real mouse/keyboard input (see the comment on `pendingClick`). Mark the
      // already-armed pending click so `onClick` cancels it when it actually arrives.
      const el = fromHandle(e.target)
      if (pendingClick !== null && pendingClick.el === el) pendingClick.blocked = true
    },

    now(): number {
      return performance.now()
    },

    destroy(): void {
      if (destroyed) return
      destroyed = true
      root.removeEventListener('pointerdown', onPointerDown as EventListener, true)
      root.removeEventListener('pointerup', onPointerUp as EventListener, true)
      root.removeEventListener('pointercancel', onPointerCancel as EventListener, true)
      root.removeEventListener('lostpointercapture', onLostPointerCapture as EventListener, true)
      root.removeEventListener('click', onClick as EventListener, true)
      root.removeEventListener('keydown', onKeyDown as EventListener, true)
      if (pendingClickTimer !== undefined) clearTimeout(pendingClickTimer)
      ageTracker.destroy()
      activationCbs.clear()
      clearCbs.clear()
      pointerKinds.clear()
    },
  }
}
