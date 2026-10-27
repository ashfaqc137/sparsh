# @sparshlabs/angular

Angular directives and an app-wide provider for Sparsh.

```sh
npm install @sparshlabs/angular
```

Guard a region of your app by putting `sparshGuard` on any element. The element itself becomes
the guard root, so no wrapper element is added:

```ts
import { Component } from '@angular/core'
import { ActivationGuardDirective, type Decision } from '@sparshlabs/angular'

@Component({
  selector: 'app-root',
  imports: [ActivationGuardDirective],
  template: `
    <main sparshGuard mode="report" (suspect)="onSuspect($event)">
      <app-inbox />
    </main>
  `,
})
export class AppComponent {
  onSuspect(decision: Decision) {
    console.info('Suspicious activation', decision)
  }
}
```

Or guard the whole document from `app.config.ts`:

```ts
import { provideActivationGuard } from '@sparshlabs/angular'

export const appConfig = {
  providers: [provideActivationGuard({ mode: 'report' })],
}
```

`mode` defaults to `enforce`; start with `report` to observe decisions before enabling blocking.
The directive's inputs can change at runtime (the guard is recreated only when an option that
matters changes). `provideActivationGuard()` options are fixed for the injector's lifetime.

`[sparshGuardTarget]` exposes an `isGuarded()` signal for one element, resolved against the
nearest `[sparshGuard]` or the app-wide guard:

```html
<button sparshGuardTarget #g="sparshGuardTarget" [class.blocked]="g.isGuarded()">Delete</button>
```

A nested `sparshGuard` creates an independently configured guard for its subtree. Guards start
after the first render and never run during server-side rendering. Angular 22 or newer is required.

See the [repository README](../../README.md) and [API source](src/index.ts).
