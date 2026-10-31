import { ActivationGuardProvider, type Decision } from '@sparshlabs/react'
import { useEffect, useRef, useState } from 'react'
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

export function Scene({ scenario, mode, cooldownMs }: SceneProps) {
  const [phase, setPhase] = useState<Phase>('ready')
  const [opened, setOpened] = useState('')
  const [latest, setLatest] = useState<Decision | null>(null)
  const timer = useRef(0)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const start = () => {
    window.clearTimeout(timer.current)
    setOpened('')
    setLatest(null)
    setPhase('armed')
    timer.current = window.setTimeout(() => setPhase('changed'), changeDelayMs(scenario))
  }
  const reset = () => {
    window.clearTimeout(timer.current)
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
      mode={mode}
      cooldownMs={cooldownMs}
      policies={POLICIES}
      onDecision={setLatest}
    >
      <div className="pg-scene" data-testid="playground-scene" data-framework="react">
        {scenario === 'inbox' && (
          <div className="pg-inbox">
            {phase === 'changed' && (
              <button
                type="button"
                data-testid="leo-message"
                className="pg-mail-row"
                onClick={() => act('Leo’s message')}
              >
                <span>
                  <strong>Leo Park</strong>
                  <small>Quick update: the launch is live!</small>
                </span>
              </button>
            )}
            <button
              type="button"
              data-testid="maya-message"
              className={`pg-mail-row ${phase === 'armed' ? 'pg-target' : ''}`}
              onClick={() => act('Maya’s message')}
            >
              <span>
                <strong>Maya Chen</strong>
                <small>Can you take a look at this?</small>
              </span>
            </button>
          </div>
        )}
        {scenario === 'late' && (
          <div className="pg-slot">
            {phase === 'changed' ? (
              <button
                type="button"
                data-testid="late-action"
                className="pg-action pg-target"
                onClick={() => act('Publish update')}
              >
                Publish update
              </button>
            ) : (
              <span>{phase === 'armed' ? 'Waiting for action…' : 'A quiet space, for now'}</span>
            )}
          </div>
        )}
        {scenario === 'meaning' && (
          <div className="pg-meaning">
            <button
              type="button"
              data-testid="meaning-action"
              aria-disabled={String(phase !== 'changed')}
              className={`pg-action ${phase === 'armed' ? 'pg-target' : ''} ${phase !== 'changed' ? 'pg-disabled' : ''}`}
              onClick={() => phase === 'changed' && act('Publish update')}
            >
              {phase === 'changed' ? 'Publish update' : 'Please wait…'}
            </button>
          </div>
        )}
        {phase === 'ready' ? (
          <button type="button" onClick={start}>
            ▶ Start scenario
          </button>
        ) : (
          <button type="button" onClick={reset}>
            ↻ Reset scenario
          </button>
        )}
        <p>{instruction(scenario, phase)}</p>
        {opened && (
          <div data-testid="scenario-result" className="pg-result">
            {openedMessage(opened)}
          </div>
        )}
        {latest && (
          <div
            data-testid="decision-result"
            className={`pg-result pg-result-${decisionTone(latest, mode)}`}
          >
            {decisionMessage(latest, mode)}
            {latest.reason && <small>{decisionReason(latest)}</small>}
          </div>
        )}
      </div>
    </ActivationGuardProvider>
  )
}
