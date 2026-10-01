/**
 * Default block animation — a brief visual "shake" (translateX wiggle) applied to an element
 * whose activation sparsh just blocked, so the user gets immediate feedback that their press
 * didn't register. Implemented with the Web Animations API (`Element.animate`) rather than
 * injecting global CSS/keyframes — fully self-contained, nothing to clean up, nothing to collide
 * with the host page's own stylesheet.
 *
 * Kept in its own module (not inlined in `host.ts`) so the animation itself can be swapped out,
 * tuned, or disabled independently later without touching blocking/classification logic.
 */

/** Default total duration of the shake, ms. */
export const DEFAULT_BLOCK_ANIMATION_MS = 300

/** A quick left-right translateX wiggle, settling back to the element's own resting position. */
function shakeKeyframes(): Keyframe[] {
  return [
    { transform: 'translateX(0)' },
    { transform: 'translateX(-6px)' },
    { transform: 'translateX(5px)' },
    { transform: 'translateX(-4px)' },
    { transform: 'translateX(3px)' },
    { transform: 'translateX(0)' },
  ]
}

/**
 * Plays the default block animation on `el`. Fails open/silently (same spirit as D7): environments
 * without `Element.animate` (older browsers, some test DOMs) simply skip it — this is cosmetic
 * feedback only, never load-bearing for the actual block.
 */
export function playDefaultBlockAnimation(
  el: Element,
  durationMs: number = DEFAULT_BLOCK_ANIMATION_MS,
): void {
  if (typeof (el as Partial<HTMLElement>).animate !== 'function') return
  el.animate(shakeKeyframes(), {
    duration: durationMs,
    easing: 'ease-in-out',
  })
}
