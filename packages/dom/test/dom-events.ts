/**
 * Shared test helpers for dispatching synthetic input events.
 *
 * jsdom does not implement `PointerEvent` (long-standing limitation:
 * https://github.com/jsdom/jsdom/issues/2527), so pointer tests dispatch a `MouseEvent` and patch
 * on the `pointerId`/`pointerType` fields our host code reads. This is a test-only shim — it does
 * not affect production code, which runs against real `PointerEvent`s in a browser.
 */

export interface FirePointerOptions {
  pointerId?: number
  pointerType?: 'mouse' | 'touch' | 'pen'
  detail?: number
}

export function firePointerEvent(
  target: EventTarget,
  type: string,
  opts: FirePointerOptions = {},
): Event {
  const { pointerId = 1, pointerType = 'mouse', detail = 0 } = opts
  const event = new MouseEvent(type, { bubbles: true, cancelable: true, detail })
  Object.defineProperty(event, 'pointerId', { value: pointerId, configurable: true })
  Object.defineProperty(event, 'pointerType', { value: pointerType, configurable: true })
  target.dispatchEvent(event)
  return event
}

export function fireClick(target: EventTarget, opts: { detail?: number } = {}): Event {
  const event = new MouseEvent('click', {
    bubbles: true,
    cancelable: true,
    detail: opts.detail ?? 1,
  })
  target.dispatchEvent(event)
  return event
}

export function fireKeyDown(target: EventTarget, key: string): Event {
  const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key })
  target.dispatchEvent(event)
  return event
}

/** `document.getElementById` with a non-`!` cast, to keep tests clean under the lint fence. */
export function byId<T extends Element = HTMLElement>(id: string): T {
  return document.getElementById(id) as T
}
