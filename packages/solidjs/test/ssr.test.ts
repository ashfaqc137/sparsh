/**
 * Server render in a DOM-less Node environment (see vitest.config.ssr.ts): `solid-js` resolves to
 * its server build, effects and `onMount` never run, so no guard is created and nothing touches
 * `document`. No JSX here — the server build needs Solid's SSR compiler output, and plain
 * `createComponent`/`Dynamic` calls work in both builds.
 */

import * as domModule from '@sparshlabs/dom'
import { createComponent } from 'solid-js'
import { Dynamic, isServer, renderToString } from 'solid-js/web'
import { describe, expect, it, vi } from 'vitest'
import { ActivationGuardProvider } from '../src/ActivationGuardProvider.js'
import { useActivationGuard } from '../src/useActivationGuard.js'

vi.mock('@sparshlabs/dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@sparshlabs/dom')>()
  return { ...actual, createGuard: vi.fn(actual.createGuard) }
})

function Probe() {
  const { ref, isGuarded } = useActivationGuard()
  return createComponent(Dynamic, {
    component: 'button',
    ref,
    get children() {
      return `guarded:${isGuarded()}`
    },
  })
}

describe('SSR', () => {
  it('renders the provider and hook to a string without a document or a guard', () => {
    expect(isServer).toBe(true)
    expect(typeof document).toBe('undefined')

    const html = renderToString(() =>
      createComponent(ActivationGuardProvider, {
        mode: 'report',
        get children() {
          return createComponent(Probe, {})
        },
      }),
    )

    expect(html).toContain('display:contents')
    expect(html).toContain('guarded:false')
    expect(vi.mocked(domModule.createGuard)).not.toHaveBeenCalled()
  })

  it('renders children directly when a root is given', () => {
    const html = renderToString(() =>
      createComponent(ActivationGuardProvider, {
        // Never dereferenced on the server; any object stands in for a root.
        root: {} as Element,
        get children() {
          return createComponent(Probe, {})
        },
      }),
    )

    expect(html).not.toContain('display:contents')
    expect(html).toContain('guarded:false')
  })
})
