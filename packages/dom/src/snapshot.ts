/**
 * Snapshot — `snapshot(handle)` per `core-contract.md` and
 * `prompts/03-implementation/tasks/14-dom-host-snapshot.md`.
 *
 * Reads a resolved element's `rect` and `fingerprint` cheaply — one `getBoundingClientRect()`
 * call, no interleaved reads/writes. `ageMs` is supplied by the caller (from `age.ts`, T15).
 */

import type { Fingerprint, Rect, TargetHandle, TargetSnapshot } from '@sparsh/core'
import { fromHandle, guardKeyOf, isGuardOff } from './resolve.js'

function isDisabled(el: Element): boolean {
  if ('disabled' in el && (el as HTMLInputElement | HTMLButtonElement).disabled === true) {
    return true
  }
  if (el.getAttribute('aria-disabled') === 'true') return true
  return el.hasAttribute('disabled')
}

function ariaLabelOf(el: Element): string | undefined {
  return el.getAttribute('aria-label') ?? undefined
}

function roleOf(el: Element): string {
  return el.getAttribute('role') ?? el.tagName.toLowerCase()
}

function hrefOrValueOf(el: Element): string | undefined {
  if (el instanceof HTMLAnchorElement) return el.getAttribute('href') ?? undefined
  if (
    el instanceof HTMLInputElement ||
    el instanceof HTMLButtonElement ||
    el instanceof HTMLTextAreaElement ||
    el instanceof HTMLSelectElement
  ) {
    return el.value
  }
  return undefined
}

/**
 * Trimmed textContent — populated but OPT-IN at the policy level (D14); SemanticsPolicy only
 * compares it when `semanticsTextCheck` is set. Cheap here since it's a single element read, not
 * a whole-subtree walk beyond the browser's own `textContent` traversal of this one node.
 */
function textOf(el: Element): string | undefined {
  const trimmed = el.textContent?.trim()
  return trimmed === undefined || trimmed === '' ? undefined : trimmed
}

export function buildFingerprint(el: Element): Fingerprint {
  return {
    disabled: isDisabled(el),
    ariaLabel: ariaLabelOf(el),
    role: roleOf(el),
    hrefOrValue: hrefOrValueOf(el),
    guardKey: guardKeyOf(el),
    text: textOf(el),
  }
}

export function rectOf(el: Element): Rect {
  const r = el.getBoundingClientRect()
  return { x: r.x, y: r.y, w: r.width, h: r.height }
}

export function snapshotOf(handle: TargetHandle, ageMs: number): TargetSnapshot {
  const el = fromHandle(handle)
  return {
    identity: el,
    rect: rectOf(el),
    fingerprint: buildFingerprint(el),
    ageMs,
    guardOff: isGuardOff(el),
  }
}
