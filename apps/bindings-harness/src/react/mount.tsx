import { createRoot } from 'react-dom/client'
import type { MountScene } from '../shared'
import { Scene } from './Scene'

export const mountScene: MountScene = (target, props) => {
  const root = createRoot(target)
  root.render(<Scene {...props} />)
  return () => root.unmount()
}
