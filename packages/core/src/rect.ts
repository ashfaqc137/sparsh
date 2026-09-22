import type { Rect } from './types.js'

/**
 * Max of |Δx|, |Δy| of the rect origin. Cheap, allocation-free displacement measure used by
 * ContinuityPolicy. See `prompts/02-policies/continuity.md`.
 */
export function rectDelta(a: Rect, b: Rect): number {
  const dx = Math.abs(a.x - b.x)
  const dy = Math.abs(a.y - b.y)
  return Math.max(dx, dy)
}

/** Do two rects overlap at all (axis-aligned intersection test)? Used by DoubleFirePolicy. */
export function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
}
