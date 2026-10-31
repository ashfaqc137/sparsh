/**
 * What every framework's scene shares: the scenario script (copy, timings, test ids are in the
 * scenes themselves) and the decision wording. Keeping the words here means the e2e spec reads the
 * same text whichever binding rendered it, so a difference in behaviour can only come from the
 * binding.
 */

import type { Decision, Mode, PolicyId } from '@sparshlabs/core'

export type Scenario = 'inbox' | 'late' | 'meaning'
export type Phase = 'ready' | 'armed' | 'changed'
export type Tone = 'ok' | 'report' | 'block'

export interface SceneProps {
  scenario: Scenario
  mode: Mode
  cooldownMs: number
}

/** Mounts one scene into `target`; resolves to its teardown. */
export type MountScene = (
  target: HTMLElement,
  props: SceneProps,
) => (() => void) | Promise<() => void>

export const POLICIES: PolicyId[] = ['age', 'continuity', 'semantics']

export const scenarioTitles: Record<Scenario, string> = {
  inbox: 'The inbox reshuffle',
  late: 'The late render',
  meaning: 'The button that changes meaning',
}

/** How long after "Start scenario" the interface changes. */
export function changeDelayMs(scenario: Scenario): number {
  return scenario === 'meaning' ? 450 : scenario === 'inbox' ? 1400 : 900
}

export function instruction(scenario: Scenario, phase: Phase): string {
  if (phase === 'ready') {
    return scenario === 'inbox'
      ? 'Press start, press and hold Maya’s row, then release after Leo arrives.'
      : scenario === 'late'
        ? 'Press start, then tap the highlighted space as soon as the button appears.'
        : 'Press start, then press and hold the button until it becomes available.'
  }
  return scenario === 'meaning'
    ? 'Hold the button through the change to see sparsh catch the shift.'
    : scenario === 'inbox'
      ? 'Keep holding Maya’s row. Release after Leo takes her place.'
      : 'Go now — the interface is changing under your tap.'
}

export function openedMessage(name: string): string {
  return `✓  ${name} opened. That tap reached the intended action.`
}

export function decisionTone(decision: Decision, mode: Mode): Tone {
  return decision.allowed ? 'ok' : mode === 'report' ? 'report' : 'block'
}

export function decisionMessage(decision: Decision, mode: Mode): string {
  const policy = decision.policy ?? 'suspicious'
  return decision.allowed
    ? '✓  Tap allowed — this target was stable.'
    : mode === 'report'
      ? `◉  sparsh spotted a ${policy} tap. Report mode lets it through.`
      : `✋  sparsh caught the ${policy} tap before it landed.`
}

/** Same formatting as the website playground's `formatDecisionReason`. */
export function decisionReason(decision: Decision): string {
  return (decision.reason ?? '')
    .replace(
      /(-?\d+(?:\.\d+)?)ms\b/g,
      (_match, value: string) => `${(Number(value) / 1000).toFixed(2)}s`,
    )
    .replace(
      /(-?\d+(?:\.\d+)?)px\b/g,
      (_match, value: string) => `${(Math.floor(Number(value) * 100) / 100).toFixed(2)}px`,
    )
}
