/**
 * Server render in a DOM-less Node environment (see vitest.config.ssr.ts): components compile for
 * the server and `svelte` resolves to its server build, so `$effect` and attachments never run, no
 * guard is created and nothing touches `document`.
 */

import * as domModule from '@sparshlabs/dom'
import { render } from 'svelte/server'
import { describe, expect, it, vi } from 'vitest'
import ProbeInProvider from './fixtures/ProbeInProvider.svelte'

vi.mock('@sparshlabs/dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@sparshlabs/dom')>()
  return { ...actual, createGuard: vi.fn(actual.createGuard) }
})

describe('SSR', () => {
  it('renders the provider and hook to a string without a document or a guard', () => {
    expect(typeof document).toBe('undefined')

    const { body } = render(ProbeInProvider, { props: { mode: 'report' } })

    expect(body).toContain('display: contents')
    expect(body).toContain('guarded:false')
    expect(vi.mocked(domModule.createGuard)).not.toHaveBeenCalled()
  })

  it('renders children directly when a root is given', () => {
    // Never dereferenced on the server; any object stands in for a root.
    const { body } = render(ProbeInProvider, { props: { root: {} as Element } })

    expect(body).not.toContain('display: contents')
    expect(body).toContain('guarded:false')
  })
})
