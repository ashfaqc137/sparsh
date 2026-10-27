/**
 * `[sparshGuardTarget]` — the per-element legibility surface, Angular's counterpart of
 * `@sparshlabs/react`/`@sparshlabs/vue`'s `useActivationGuard()`. Put it on the element you want to
 * observe and read `isGuarded()` (a signal) through a template reference:
 *
 *   <button sparshGuardTarget #g="sparshGuardTarget" [class.blocked]="g.isGuarded()">…</button>
 *
 * A directive is Angular's natural "ref + state" pairing: it gets the real DOM node from its host
 * element, so there is no ref callback to wire up (the reason React/Vue need a hook/composable,
 * D16). The nearest guard is resolved through DI — the closest `[sparshGuard]` ancestor, else
 * an app-wide `provideActivationGuard()` — and with neither it stays `false` and never throws.
 */

import { DestroyRef, Directive, ElementRef, inject, signal } from '@angular/core'
import type { TargetHandle } from '@sparshlabs/core'
import { GUARD_CONTEXT, defaultGuardContextValue } from './GuardContext'

@Directive({
  selector: '[sparshGuardTarget]',
  exportAs: 'sparshGuardTarget',
})
export class ActivationGuardTarget {
  private readonly guarded = signal(false)
  /** True when this element's most recent activation was enforced-blocked. */
  readonly isGuarded = this.guarded.asReadonly()

  constructor() {
    const element: Element = inject(ElementRef).nativeElement
    const { isGuarded, subscribeDecision } =
      inject(GUARD_CONTEXT, { optional: true }) ?? defaultGuardContextValue
    const target = element as unknown as TargetHandle

    this.guarded.set(isGuarded(target))
    // Event-driven, not polling: re-check only when the guard reports a decision for our element.
    const unsubscribe = subscribeDecision((decision) => {
      if (decision.target.identity !== element) return
      this.guarded.set(isGuarded(target))
    })
    inject(DestroyRef).onDestroy(unsubscribe)
  }
}
