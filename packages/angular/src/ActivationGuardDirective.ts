/**
 * `[sparshGuard]` — the primary Angular API. Installs exactly one guard, via `@sparshlabs/dom`'s
 * `createGuard`, rooted at the directive's host element, with clean teardown. The Angular
 * counterpart of `@sparshlabs/react`/`@sparshlabs/vue`'s `ActivationGuardProvider`.
 *
 * A directive rather than a wrapper component: Angular directives attach to an element the app
 * already renders, so the guard can use it as its root directly — no `display: contents` wrapper
 * element and no `root` prop are needed. (For `document`/app-wide use, see
 * `provideActivationGuard()`.)
 *
 * Also the scoped-override mechanism (React/Vue's `<ActivationGuard>`): a nested `[sparshGuard]`
 * simply installs its own independent guard on its own subtree — it never merges or inherits an
 * ancestor's options (D10), and `@sparshlabs/dom` warns about the overlap.
 *
 * Descendants reach the guard through DI: the directive provides `GUARD_CONTEXT` on its element
 * injector, so a `[sparshGuardTarget]` anywhere below resolves the nearest one.
 */

import { isPlatformBrowser } from '@angular/common'
import {
  DestroyRef,
  Directive,
  ElementRef,
  PLATFORM_ID,
  afterNextRender,
  booleanAttribute,
  computed,
  effect,
  inject,
  input,
  numberAttribute,
  output,
  untracked,
} from '@angular/core'
import type { Decision, GuardOptions, PolicyId } from '@sparshlabs/core'
import type { DomGuardOptions } from '@sparshlabs/dom'
import { GUARD_CONTEXT } from './GuardContext'
import { GuardHost } from './GuardHost'

/**
 * Like Angular's `numberAttribute`/`booleanAttribute`, but an unset input stays `undefined` so the
 * engine's own default applies (`numberAttribute(undefined)` is `NaN`, and
 * `booleanAttribute(undefined)` is `false`, which would silently turn `blockAnimation` off).
 */
function optionalNumber(value: unknown): number | undefined {
  return value === undefined || value === null ? undefined : numberAttribute(value)
}

function optionalBoolean(value: unknown): boolean | undefined {
  return value === undefined || value === null ? undefined : booleanAttribute(value)
}

@Directive({
  selector: '[sparshGuard]',
  exportAs: 'sparshGuard',
  providers: [
    {
      provide: GUARD_CONTEXT,
      useFactory: () => inject(ActivationGuardDirective).context,
    },
  ],
})
export class ActivationGuardDirective {
  /** Global mode, or per-policy override. Default: `'enforce'` for all policies. */
  readonly mode = input<GuardOptions['mode']>()
  readonly cooldownMs = input<number | undefined, unknown>(undefined, { transform: optionalNumber })
  readonly rectThresholdPx = input<number | undefined, unknown>(undefined, {
    transform: optionalNumber,
  })
  readonly refractoryMs = input<number | undefined, unknown>(undefined, {
    transform: optionalNumber,
  })
  readonly semanticsTextCheck = input<boolean | undefined, unknown>(undefined, {
    transform: optionalBoolean,
  })
  readonly policies = input<PolicyId[]>()
  readonly clickSuppressMs = input<number | undefined, unknown>(undefined, {
    transform: optionalNumber,
  })
  readonly blockAnimation = input<boolean | undefined, unknown>(undefined, {
    transform: optionalBoolean,
  })
  readonly blockAnimationMs = input<number | undefined, unknown>(undefined, {
    transform: optionalNumber,
  })
  /** Replaces the default blocked-activation animation. Swapping it never recreates the guard. */
  readonly onBlocked = input<(element: Element) => void>()

  /** Every decision the guard makes. */
  readonly decision = output<Decision>()
  /** Decisions where `allowed === false` — convenience over `decision`. */
  readonly suspect = output<Decision>()

  private readonly host = new GuardHost()
  /** What `GUARD_CONTEXT` resolves to for this directive's descendants. Stable. */
  readonly context = this.host.context

  /**
   * Everything the guard is configured with. `onBlocked` is wrapped so the guard always calls the
   * latest input value; only its presence feeds `GuardHost`'s recreate key.
   */
  private readonly options = computed<DomGuardOptions>(() => ({
    mode: this.mode(),
    cooldownMs: this.cooldownMs(),
    rectThresholdPx: this.rectThresholdPx(),
    refractoryMs: this.refractoryMs(),
    semanticsTextCheck: this.semanticsTextCheck(),
    policies: this.policies(),
    clickSuppressMs: this.clickSuppressMs(),
    blockAnimation: this.blockAnimation(),
    blockAnimationMs: this.blockAnimationMs(),
    ...(this.onBlocked() === undefined
      ? {}
      : { onBlocked: (element: Element) => untracked(this.onBlocked)?.(element) }),
  }))

  constructor() {
    const element: Element = inject(ElementRef).nativeElement
    const callbacks = {
      onDecision: (decision: Decision) => this.decision.emit(decision),
      onSuspect: (decision: Decision) => this.suspect.emit(decision),
    }

    // The guard starts after the first render, so (like React's `useEffect` / Vue's `onMounted`)
    // the initial children count as pre-existing, not "newly inserted" targets for Age.
    // Browser-only: Angular never runs after-render hooks during a server render. The
    // `PLATFORM_ID` check is defense in depth for anything that reports a server platform but
    // still runs them (e.g. a TestBed configured with `PLATFORM_ID: 'server'`).
    const isBrowser = isPlatformBrowser(inject(PLATFORM_ID))
    let started = false
    afterNextRender(() => {
      if (!isBrowser) return
      started = true
      this.host.update(element, untracked(this.options), callbacks)
    })

    // Input changes after that. `options()` is read before the `started` check so the effect
    // tracks it from its very first run; `GuardHost` skips recreation when nothing meaningful
    // changed.
    effect(() => {
      const opts = this.options()
      if (started) untracked(() => this.host.update(element, opts, callbacks))
    })

    inject(DestroyRef).onDestroy(() => this.host.destroy())
  }
}
