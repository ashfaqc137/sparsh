// TestBed environment for Vitest. `@analogjs/vite-plugin-angular` (see vitest.config.ts) compiles
// the directives and test host components with the Angular compiler; this file boots the testing
// platform on top of zone.js, the same way an Angular CLI `test.ts` does.
import '@angular/compiler'
import 'zone.js'
import 'zone.js/testing'
import { ComponentFixtureAutoDetect, TestBed, getTestBed } from '@angular/core/testing'
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting,
} from '@angular/platform-browser-dynamic/testing'
import { beforeEach } from 'vitest'

// TestBed is for the jsdom tests only. `ssr.test.ts` runs in a DOM-less Node environment and boots
// a real server platform, and Angular allows a single platform per process.
if (typeof document !== 'undefined') {
  getTestBed().initTestEnvironment(BrowserDynamicTestingModule, platformBrowserDynamicTesting())

  // Attach fixtures to the ApplicationRef so `fixture.detectChanges()` runs a full app tick —
  // including `afterNextRender` hooks, which is when both entry points start their guard —
  // exactly like a real app's change detection, instead of leaking into a later test's tick.
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: ComponentFixtureAutoDetect, useValue: true }],
    })
  })
}
