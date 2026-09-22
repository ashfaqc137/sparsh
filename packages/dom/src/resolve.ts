/**
 * Target resolution — `resolveTarget(raw)` per `core-contract.md` and
 * `prompts/03-implementation/tasks/13-dom-host-target-resolution.md`.
 *
 * Resolves a raw event target (often a text node or nested `<span>`) to the interactive element
 * the user meant to activate, and wraps it as an opaque `TargetHandle`. The identity for DOM is
 * simply the resolved `Element` reference itself — stable while the node lives, different once
 * detached/replaced (e.g. by a framework re-render).
 */

import type { TargetHandle } from '@sparsh/core'

/**
 * The interactive-element selector set. Exported so tests (and future host-adjacent code) share
 * exactly the selector used at both intent and activation — resolution MUST be consistent between
 * the two or ContinuityPolicy will false-positive (identity mismatch).
 */
export const INTERACTIVE_SELECTOR =
  'button, a[href], input, select, textarea, [role="button"], [role="link"], [tabindex], [onclick], [data-guard-key]'

/**
 * Walk up from a raw event target to the nearest activatable element, or `null` if none.
 * Handles a bare `Text` node target defensively (e.g. some synthetic dispatch paths report the
 * text node itself) by resolving from its `parentElement` — real browsers report the containing
 * `Element` for click hit-testing, but this keeps resolution robust either way.
 */
export function resolveInteractiveElement(raw: unknown): Element | null {
  if (raw instanceof Element) return raw.closest(INTERACTIVE_SELECTOR)
  if (raw instanceof Text) {
    const parent = raw.parentElement
    return parent === null ? null : parent.closest(INTERACTIVE_SELECTOR)
  }
  return null
}

/** Wrap a resolved `Element` as the opaque `TargetHandle` the engine passes back to the host. */
export function toHandle(el: Element): TargetHandle {
  return el as unknown as TargetHandle
}

/** Unwrap a `TargetHandle` back to its `Element`. Only ever called from within `@sparsh/dom`. */
export function fromHandle(handle: TargetHandle): Element {
  return handle as unknown as Element
}

/** `data-guard="off"` opt-out, discovered via `closest` from the resolved element. */
export function isGuardOff(el: Element): boolean {
  return el.closest('[data-guard="off"]') !== null
}

/** `data-guard-key`, discovered via `closest` from the resolved element. */
export function guardKeyOf(el: Element): string | undefined {
  return el.closest('[data-guard-key]')?.getAttribute('data-guard-key') ?? undefined
}
