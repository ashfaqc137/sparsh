/**
 * The harness shell, in plain DOM so no framework is privileged: framework / mode / scenario /
 * cooldown controls, and a stage that remounts the selected framework's scene whenever any of them
 * changes (like the website playground, which remounts its scene on every setting change).
 *
 * The controls keep the website playground's accessible names so the e2e spec drives both the same
 * way. Each framework's scene is loaded on demand, so a broken binding only fails its own tests.
 */

import './harness.css'
import type { Mode } from '@sparshlabs/core'
import { type MountScene, type Scenario, type SceneProps, scenarioTitles } from './shared'

type Framework = 'react' | 'vue' | 'solid' | 'svelte' | 'angular'

const frameworks: Record<
  Framework,
  { label: string; load: () => Promise<{ mountScene: MountScene }> }
> = {
  react: { label: 'React', load: () => import('./react/mount') },
  vue: { label: 'Vue', load: () => import('./vue/mount') },
  solid: { label: 'Solid', load: () => import('./solid/mount') },
  svelte: { label: 'Svelte', load: () => import('./svelte/mount') },
  angular: { label: 'Angular', load: () => import('./angular/mount') },
}

const state: { framework: Framework } & SceneProps = {
  framework: 'react',
  scenario: 'inbox',
  mode: 'enforce',
  cooldownMs: 800,
}

const root = document.getElementById('harness') as HTMLElement

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
  children: (Node | string)[] = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, value)
  node.append(...children)
  return node
}

function segment<T extends string>(
  legend: string,
  options: { value: T; label: string }[],
  current: () => T,
  select: (value: T) => void,
): HTMLFieldSetElement {
  const buttons = options.map(({ value, label }) => {
    const button = el('button', { type: 'button' }, [label])
    button.addEventListener('click', () => {
      select(value)
      sync()
    })
    return { value, button }
  })
  const sync = () => {
    for (const { value, button } of buttons)
      button.setAttribute('aria-pressed', String(value === current()))
  }
  sync()
  return el('fieldset', {}, [el('legend', {}, [legend]), ...buttons.map((b) => b.button)])
}

const cooldownValue = el('strong', {}, [`${state.cooldownMs} ms`])
const cooldown = el('input', {
  type: 'range',
  min: '0',
  max: '1500',
  step: '50',
  value: String(state.cooldownMs),
  'aria-label': 'Cooldown in milliseconds',
})
cooldown.addEventListener('input', () => {
  state.cooldownMs = Number(cooldown.value)
  cooldownValue.textContent = `${state.cooldownMs} ms`
  void remount()
})

const stage = el('div', { class: 'harness-stage' })

root.append(
  el('h1', {}, ['sparsh bindings harness']),
  el('p', {}, ['Internal e2e fixture: the playground scenarios through every framework binding.']),
  el('div', { class: 'harness-toolbar' }, [
    segment(
      'FRAMEWORK',
      (Object.keys(frameworks) as Framework[]).map((value) => ({
        value,
        label: frameworks[value].label,
      })),
      () => state.framework,
      (value) => {
        state.framework = value
        void remount()
      },
    ),
    segment<Mode & string>(
      'GUARD MODE',
      [
        { value: 'report', label: 'Report' },
        { value: 'enforce', label: 'Enforce' },
      ],
      () => state.mode as Mode & string,
      (value) => {
        state.mode = value
        void remount()
      },
    ),
    segment<Scenario>(
      'SCENARIO',
      (Object.keys(scenarioTitles) as Scenario[]).map((value) => ({
        value,
        label: scenarioTitles[value],
      })),
      () => state.scenario,
      (value) => {
        state.scenario = value
        void remount()
      },
    ),
    el('label', {}, ['Cooldown ', cooldownValue, cooldown]),
  ]),
  stage,
)

// Remounts are serialized by generation: if settings change while a scene is still loading (or
// Angular is still bootstrapping), the stale mount is torn down as soon as it resolves.
let generation = 0
let unmountCurrent: (() => void) | undefined

async function remount(): Promise<void> {
  const current = ++generation
  unmountCurrent?.()
  unmountCurrent = undefined
  const host = el('div')
  stage.replaceChildren(host)
  const { framework, scenario, mode, cooldownMs } = state
  const { mountScene } = await frameworks[framework].load()
  if (current !== generation) return
  const unmount = await mountScene(host, { scenario, mode, cooldownMs })
  if (current !== generation) {
    unmount()
    return
  }
  unmountCurrent = unmount
}

void remount().then(() => root.setAttribute('data-hydrated', 'true'))
