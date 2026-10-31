import { mount, unmount } from 'svelte'
import type { MountScene } from '../shared'
import Scene from './Scene.svelte'

export const mountScene: MountScene = (target, props) => {
  const scene = mount(Scene, { target, props })
  return () => {
    void unmount(scene)
  }
}
