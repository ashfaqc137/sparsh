import { render } from 'solid-js/web'
import type { MountScene } from '../shared'
import { Scene } from './Scene'

export const mountScene: MountScene = (target, props) => render(() => <Scene {...props} />, target)
