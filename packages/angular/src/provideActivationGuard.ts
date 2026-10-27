/**
 * `provideActivationGuard()` — an app-wide guard, configured once in `app.config.ts` (or any
 * environment injector, e.g. a lazy route's `providers`). Global-by-default is the point: you
 * can't predict which control renders late. Guards `document` unless `root` says otherwise; the
 * Angular counterpart of React/Vue's `<ActivationGuardProvider root={document}>`.
 *
 * Options are static for the injector's lifetime. For options that change at runtime, or for a
 * region with different options, use the `[sparshGuard]` directive (which also takes precedence
 * for its descendants' `[sparshGuardTarget]`s, by ordinary DI resolution).
 */

import { DOCUMENT, isPlatformBrowser } from '@angular/common'
import {
  DestroyRef,
  type EnvironmentProviders,
  InjectionToken,
  PLATFORM_ID,
  afterNextRender,
  inject,
  makeEnvironmentProviders,
  provideEnvironmentInitializer,
} from '@angular/core'
import type { Decision } from '@sparshlabs/core'
import type { DomGuardOptions } from '@sparshlabs/dom'
import { GUARD_CONTEXT } from './GuardContext'
import { GuardHost } from './GuardHost'

export interface ActivationGuardConfig extends DomGuardOptions {
  /** Fires for decisions where `allowed === false` — convenience over `onDecision`. */
  onSuspect?: (decision: Decision) => void
  /**
   * The root to guard. Default: `document`. A factory, not an element, so it's only evaluated in
   * the browser (never during SSR) and after the app's first render.
   */
  root?: () => Element | Document
}

const APP_GUARD_HOST = new InjectionToken<GuardHost>('sparsh:app-guard-host')

export function provideActivationGuard(config: ActivationGuardConfig = {}): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: APP_GUARD_HOST, useFactory: () => new GuardHost() },
    { provide: GUARD_CONTEXT, useFactory: () => inject(APP_GUARD_HOST).context },
    provideEnvironmentInitializer(() => {
      if (!isPlatformBrowser(inject(PLATFORM_ID))) return
      const host = inject(APP_GUARD_HOST)
      const document = inject(DOCUMENT)
      const { root, onDecision, onSuspect, ...domOpts } = config
      // After the first render (like the directive), so the initial UI counts as pre-existing.
      // Angular never runs after-render hooks during a server render; the `PLATFORM_ID` check
      // above is defense in depth.
      afterNextRender(() => host.update(root?.() ?? document, domOpts, { onDecision, onSuspect }))
      inject(DestroyRef).onDestroy(() => host.destroy())
    }),
  ])
}
