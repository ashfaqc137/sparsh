// @vitest-environment node
import { Component, signal } from '@angular/core'
import { bootstrapApplication } from '@angular/platform-browser'
import { renderApplication } from '@angular/platform-server'
import * as domModule from '@sparshlabs/dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ActivationGuardDirective } from '../src/ActivationGuardDirective'
import { ActivationGuardTarget } from '../src/ActivationGuardTarget'
import { provideActivationGuard } from '../src/provideActivationGuard'

vi.mock('@sparshlabs/dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@sparshlabs/dom')>()
  return { ...actual, createGuard: vi.fn(actual.createGuard) }
})

const createGuardMock = vi.mocked(domModule.createGuard)

@Component({
  selector: 'app-root',
  imports: [ActivationGuardDirective, ActivationGuardTarget],
  template: `
    <main sparshGuard mode="enforce" cooldownMs="800">
      <button type="button" sparshGuardTarget #g="sparshGuardTarget">{{ label() }}</button>
      <p>{{ g.isGuarded() ? 'guarded' : 'clear' }}</p>
    </main>
  `,
})
class AppComponent {
  readonly label = signal('Delete')
}

/** A real server render (Node, no DOM globals), the way `@angular/ssr` drives one per request. */
function render(): Promise<string> {
  return renderApplication(
    (context) =>
      bootstrapApplication(AppComponent, { providers: [provideActivationGuard()] }, context),
    { document: '<html><head></head><body><app-root></app-root></body></html>', url: '/' },
  )
}

// What the Angular CLI defines for server bundles (Angular skips `afterNextRender` when it's set).
const serverModeGlobal = globalThis as { ngServerMode?: boolean }

describe('server-side rendering', () => {
  beforeEach(() => {
    createGuardMock.mockClear()
  })

  afterEach(() => {
    serverModeGlobal.ngServerMode = undefined
  })

  it('runs in a DOM-less environment', () => {
    expect(typeof document).toBe('undefined')
  })

  it('renders guarded markup without creating any guard (CLI server bundle: ngServerMode)', async () => {
    serverModeGlobal.ngServerMode = true

    const html = await render()

    expect(html).toContain('Delete')
    expect(html).toContain('clear')
    expect(createGuardMock).not.toHaveBeenCalled()
  })

  it('renders without creating any guard when ngServerMode is not defined', async () => {
    const html = await render()

    expect(html).toContain('Delete')
    expect(createGuardMock).not.toHaveBeenCalled()
  })
})
