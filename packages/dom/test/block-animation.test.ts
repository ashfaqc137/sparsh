import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_BLOCK_ANIMATION_MS, playDefaultBlockAnimation } from '../src/block-animation.js'

describe('playDefaultBlockAnimation', () => {
  it('calls Element.animate with a translateX shake and the given duration', () => {
    const el = document.createElement('button')
    const animate = vi.fn()
    // jsdom has no Element.animate (Web Animations API) — stub it for this test.
    ;(el as unknown as { animate: typeof animate }).animate = animate

    playDefaultBlockAnimation(el, 300)

    expect(animate).toHaveBeenCalledTimes(1)
    const [keyframes, options] = animate.mock.calls[0]
    expect(Array.isArray(keyframes)).toBe(true)
    expect(keyframes.length).toBeGreaterThan(1)
    expect(keyframes.every((k: Keyframe) => typeof k.transform === 'string')).toBe(true)
    expect(keyframes.some((k: Keyframe) => k.transform === 'translateX(0)')).toBe(true)
    expect(options).toMatchObject({ duration: 300 })
  })

  it('defaults to DEFAULT_BLOCK_ANIMATION_MS (300ms) when no duration is given', () => {
    const el = document.createElement('button')
    const animate = vi.fn()
    ;(el as unknown as { animate: typeof animate }).animate = animate

    playDefaultBlockAnimation(el)

    expect(animate).toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({ duration: DEFAULT_BLOCK_ANIMATION_MS }),
    )
    expect(DEFAULT_BLOCK_ANIMATION_MS).toBe(300)
  })

  it('fails open silently when Element.animate is unavailable (e.g. jsdom by default)', () => {
    const el = document.createElement('button') // real jsdom element, no .animate stub
    expect(() => playDefaultBlockAnimation(el)).not.toThrow()
  })
})
