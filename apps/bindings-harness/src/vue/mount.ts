import { createApp } from 'vue'
import type { MountScene } from '../shared'
import { Scene } from './Scene'

export const mountScene: MountScene = (target, props) => {
  const app = createApp(Scene, { ...props })
  app.mount(target)
  return () => app.unmount()
}
