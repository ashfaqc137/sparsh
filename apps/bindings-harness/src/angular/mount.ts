import { createComponent, provideZonelessChangeDetection } from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import type { MountScene } from '../shared'
import { SceneComponent } from './scene.component'

// One standalone application per mount, zoneless (signals drive change detection), so each
// remount gets a fresh injector and the old one is fully destroyed.
export const mountScene: MountScene = async (target, props) => {
  const app = await createApplication({ providers: [provideZonelessChangeDetection()] })
  const ref = createComponent(SceneComponent, {
    environmentInjector: app.injector,
    hostElement: target,
  })
  ref.setInput('scenario', props.scenario)
  ref.setInput('mode', props.mode)
  ref.setInput('cooldownMs', props.cooldownMs)
  app.attachView(ref.hostView)
  ref.changeDetectorRef.detectChanges()
  return () => {
    ref.destroy()
    app.destroy()
  }
}
