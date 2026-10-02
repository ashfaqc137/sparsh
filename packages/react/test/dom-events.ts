/**
 * Shared test helpers for dispatching synthetic input events — mirrors
 * `packages/dom/test/dom-events.ts` (kept local since test files aren't published/exported).
 *
 * jsdom does not implement `PointerEvent` (https://github.com/jsdom/jsdom/issues/2527), so pointer
 * tests dispatch a `MouseEvent` and patch on the `pointerId`/`pointerType` fields our host code
 * reads. Test-only shim — production code runs against real `PointerEvent`s in a browser.
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
