import { ActivationGuardProvider, type Decision } from '@sparshlabs/solidjs'
import { Match, Show, Switch, createSignal, onCleanup } from 'solid-js'
import {
  POLICIES,
  type Phase,
  type SceneProps,
  changeDelayMs,
  decisionMessage,
  decisionReason,
  decisionTone,
  instruction,
  openedMessage,
} from '../shared'

export function Scene(props: SceneProps) {
  const [phase, setPhase] = createSignal<Phase>('ready')
  const [opened, setOpened] = createSignal('')
  const [latest, setLatest] = createSignal<Decision | null>(null)
  let timer = 0
  onCleanup(() => window.clearTimeout(timer))

  const start = () => {
    window.clearTimeout(timer)
    setOpened('')
    setLatest(null)
    setPhase('armed')
    timer = window.setTimeout(() => setPhase('changed'), changeDelayMs(props.scenario))
  }
  const reset = () => {
    window.clearTimeout(timer)
    setOpened('')
    setLatest(null)
    setPhase('ready')
  }
  const act = (name: string) => {
    setOpened(name)
    setPhase('ready')
  }

  return (
    <ActivationGuardProvider
      mode={props.mode}
      cooldownMs={props.cooldownMs}
      policies={POLICIES}
      onDecision={(decision) => setLatest(decision)}
    >
      <div class="pg-scene" data-testid="playground-scene" data-framework="solid">
        <Switch>
          <Match when={props.scenario === 'inbox'}>
            <div class="pg-inbox">
              <Show when={phase() === 'changed'}>
                <button
                  type="button"
                  data-testid="leo-message"
                  class="pg-mail-row"
                  onClick={() => act('Leo’s message')}
                >
                  <span>
                    <strong>Leo Park</strong>
                    <small>Quick update: the launch is live!</small>
                  </span>
                </button>
              </Show>
              <button
                type="button"
                data-testid="maya-message"
                class="pg-mail-row"
                classList={{ 'pg-target': phase() === 'armed' }}
                onClick={() => act('Maya’s message')}
              >
                <span>
                  <strong>Maya Chen</strong>
                  <small>Can you take a look at this?</small>
                </span>
              </button>
            </div>
          </Match>
          <Match when={props.scenario === 'late'}>
            <div class="pg-slot">
              <Show
                when={phase() === 'changed'}
                fallback={
                  <span>
                    {phase() === 'armed' ? 'Waiting for action…' : 'A quiet space, for now'}
                  </span>
                }
              >
                <button
                  type="button"
                  data-testid="late-action"
                  class="pg-action pg-target"
                  onClick={() => act('Publish update')}
                >
                  Publish update
                </button>
              </Show>
            </div>
          </Match>
          <Match when={props.scenario === 'meaning'}>
            <div class="pg-meaning">
              <button
                type="button"
                data-testid="meaning-action"
                aria-disabled={String(phase() !== 'changed')}
                class="pg-action"
                classList={{
                  'pg-target': phase() === 'armed',
                  'pg-disabled': phase() !== 'changed',
                }}
                onClick={() => phase() === 'changed' && act('Publish update')}
              >
                {phase() === 'changed' ? 'Publish update' : 'Please wait…'}
              </button>
            </div>
          </Match>
        </Switch>
        <Show
          when={phase() === 'ready'}
          fallback={
            <button type="button" onClick={reset}>
              ↻ Reset scenario
            </button>
          }
        >
          <button type="button" onClick={start}>
            ▶ Start scenario
          </button>
        </Show>
        <p>{instruction(props.scenario, phase())}</p>
        <Show when={opened()}>
          <div data-testid="scenario-result" class="pg-result">
            {openedMessage(opened())}
          </div>
        </Show>
        <Show when={latest()}>
          {(decision) => (
            <div
              data-testid="decision-result"
              class={`pg-result pg-result-${decisionTone(decision(), props.mode)}`}
            >
              {decisionMessage(decision(), props.mode)}
              <Show when={decision().reason}>
                <small>{decisionReason(decision())}</small>
              </Show>
            </div>
          )}
        </Show>
      </div>
    </ActivationGuardProvider>
  )
}
