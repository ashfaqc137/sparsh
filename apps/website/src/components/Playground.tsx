import type { Decision, Mode } from '@sparsh/core'
import { ActivationGuardProvider } from '@sparsh/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createApp } from 'vue'
import { VueScenario } from './VueScenario'

type Scenario = 'inbox' | 'late' | 'meaning'
type Framework = 'react' | 'vue'

const scenarios: Record<Scenario, { title: string; description: string; instruction: string }> = {
  inbox: {
    title: 'The inbox reshuffle',
    description: 'A new message arrives just as you tap Maya’s row.',
    instruction: 'Press start, aim at Maya’s message, then tap as Leo’s new message arrives.',
  },
  late: {
    title: 'The late render',
    description: 'A fresh action appears under the pointer after the screen changes.',
    instruction: 'Press start, then tap the highlighted space as soon as the button appears.',
  },
  meaning: {
    title: 'The button that changes meaning',
    description: 'A control becomes available while your pointer is already down.',
    instruction: 'Press start, then press and hold the button until it becomes available.',
  },
}

type DemoProps = {
  scenario: Scenario
  mode: Mode
  cooldownMs: number
  onDecision: (d: Decision) => void
  onReset: () => void
}

function Scene({ scenario, mode, cooldownMs, onDecision, onReset }: DemoProps) {
  const [phase, setPhase] = useState<'ready' | 'armed' | 'changed'>('ready')
  const [opened, setOpened] = useState('')
  const [decisions, setDecisions] = useState<Decision[]>([])
  const timer = useRef<number[]>([])
  useEffect(() => () => timer.current.forEach(window.clearTimeout), [])
  const report = (decision: Decision) => {
    setDecisions((old) => [decision, ...old].slice(0, 3))
    onDecision(decision)
  }
  const start = () => {
    timer.current.forEach(window.clearTimeout)
    timer.current = []
    setOpened('')
    setDecisions([])
    onReset()
    setPhase('armed')
    const delay = scenario === 'meaning' ? 450 : scenario === 'inbox' ? 1400 : 900
    timer.current = [window.setTimeout(() => setPhase('changed'), delay)]
  }
  const reset = () => {
    timer.current.forEach(window.clearTimeout)
    timer.current = []
    setOpened('')
    setDecisions([])
    setPhase('ready')
    onReset()
  }
  const guardedAction = (name: string) => {
    setOpened(name)
    setPhase('ready')
  }
  return (
    <ActivationGuardProvider
      mode={mode}
      cooldownMs={cooldownMs}
      policies={['age', 'continuity', 'semantics']}
      onDecision={report}
    >
      <div className="pg-scene" data-testid="playground-scene" data-framework="react">
        <div className="pg-scene-top">
          <span className="pg-live-dot" /> LIVE {mode.toUpperCase()} MODE
        </div>
        {scenario === 'inbox' && (
          <div className="pg-inbox">
            <div className="pg-mail-head">
              <span>Inbox</span>
              <span>3 unread</span>
            </div>
            <button
              data-testid="maya-message"
              type="button"
              className={`pg-mail-row ${phase === 'armed' ? 'pg-target' : ''}`}
              onClick={() => guardedAction('Maya’s message')}
            >
              <b className="pg-avatar">M</b>
              <span>
                <strong>Maya Chen</strong>
                <small>Can you take a look at this?</small>
              </span>
              <time>9:41</time>
            </button>
            {phase === 'changed' && (
              <button
                data-testid="leo-message"
                type="button"
                className="pg-mail-row pg-new"
                onClick={() => guardedAction('Leo’s message')}
              >
                <b className="pg-avatar pg-avatar-blue">L</b>
                <span>
                  <strong>
                    Leo Park <i>NEW</i>
                  </strong>
                  <small>Quick update: the launch is live!</small>
                </span>
                <time>now</time>
              </button>
            )}
            <div className="pg-mail-row pg-muted">
              <b className="pg-avatar pg-avatar-gold">A</b>
              <span>
                <strong>Alex Morgan</strong>
                <small>Thanks for sending this over.</small>
              </span>
              <time>9:18</time>
            </div>
          </div>
        )}
        {scenario === 'late' && (
          <div className="pg-late">
            <span className="pg-slot-label">YOUR TAP LANDS HERE</span>
            <div className="pg-slot">
              {phase === 'changed' ? (
                <button
                  data-testid="late-action"
                  type="button"
                  className="pg-action pg-target"
                  onClick={() => guardedAction('Publish update')}
                >
                  Publish update <span>↗</span>
                </button>
              ) : (
                <span className="pg-empty-slot">
                  {phase === 'armed' ? 'Waiting for action…' : 'A quiet space, for now'}
                </span>
              )}
            </div>
          </div>
        )}
        {scenario === 'meaning' && (
          <div className="pg-meaning">
            <div className="pg-upload-icon">↥</div>
            <strong>Publish your update</strong>
            <span>
              {phase === 'changed'
                ? 'Ready to go'
                : phase === 'armed'
                  ? 'Checking your changes…'
                  : 'Your draft is saved'}
            </span>
            <button
              data-testid="meaning-action"
              type="button"
              aria-disabled={phase !== 'changed'}
              className={`pg-action ${phase === 'armed' ? 'pg-target' : ''} ${phase !== 'changed' ? 'pg-disabled' : ''}`}
              onClick={() => phase === 'changed' && guardedAction('Publish update')}
            >
              {phase === 'changed' ? 'Publish update' : 'Please wait…'}
            </button>
          </div>
        )}
        {phase === 'ready' ? (
          <button type="button" className="pg-start" onClick={start}>
            ▶ &nbsp;Start scenario
          </button>
        ) : (
          <button type="button" className="pg-reset" onClick={reset}>
            ↻ &nbsp;Reset scenario
          </button>
        )}
        <p className="pg-instruction">
          {phase === 'ready'
            ? scenarios[scenario].instruction
            : scenario === 'meaning'
              ? 'Hold the button through the change to see sparsh catch the shift.'
              : scenario === 'inbox'
                ? 'Tap Maya’s row just as Leo’s new message arrives.'
                : 'Go now — the interface is changing under your tap.'}
        </p>
        {opened && (
          <div data-testid="scenario-result" className="pg-result pg-result-ok">
            ✓ &nbsp; {opened} opened. That tap reached the intended action.
          </div>
        )}
        {decisions[0] && (
          <div
            data-testid="decision-result"
            className={`pg-result ${decisions[0].allowed ? 'pg-result-ok' : mode === 'report' ? 'pg-result-report' : 'pg-result-block'}`}
          >
            {decisions[0].allowed
              ? '✓ &nbsp; Tap allowed — this target was stable.'
              : mode === 'report'
                ? `◉ &nbsp; sparsh spotted a ${decisions[0].policy ?? 'suspicious'} tap. Report mode lets it through.`
                : `✋ &nbsp; sparsh caught the ${decisions[0].policy ?? 'suspicious'} tap before it landed.`}
            {decisions[0].reason && <small>{decisions[0].reason}</small>}
          </div>
        )}
      </div>
    </ActivationGuardProvider>
  )
}

function VueMount({ scenario, mode, cooldownMs, onDecision, onReset }: DemoProps) {
  const mountRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!mountRef.current) return
    const app = createApp(VueScenario, { scenario, mode, cooldownMs, onDecision, onReset })
    app.mount(mountRef.current)
    return () => app.unmount()
  }, [scenario, mode, cooldownMs, onDecision, onReset])
  return <div ref={mountRef} />
}

function exampleCode(framework: Framework, scenario: Scenario, mode: Mode, cooldownMs: number) {
  if (framework === 'react')
    return `import { ActivationGuardProvider } from '@sparsh/react'\n\n<ActivationGuardProvider\n  mode="${mode}"\n  cooldownMs={${cooldownMs}}\n  policies={['age', 'continuity', 'semantics']}\n>\n  <${scenario === 'inbox' ? 'Inbox' : scenario === 'late' ? 'LateAction' : 'ChangingButton'} />\n</ActivationGuardProvider>`
  return `import { ActivationGuardProvider } from '@sparsh/vue'\n\n<ActivationGuardProvider\n  mode="${mode}"\n  :cooldown-ms="${cooldownMs}"\n  :policies="['age', 'continuity', 'semantics']"\n>\n  <${scenario === 'inbox' ? 'Inbox' : scenario === 'late' ? 'LateAction' : 'ChangingButton'} />\n</ActivationGuardProvider>`
}

export function Playground() {
  const [framework, setFramework] = useState<Framework>('react')
  const [scenario, setScenario] = useState<Scenario>('inbox')
  const [mode, setMode] = useState<Mode>('report')
  const [cooldownMs, setCooldownMs] = useState(500)
  const [lastDecision, setLastDecision] = useState<Decision | null>(null)
  const [hydrated, setHydrated] = useState(false)
  const onDecision = useCallback((d: Decision) => setLastDecision(d), [])
  const onReset = useCallback(() => setLastDecision(null), [])
  const current = scenarios[scenario]
  useEffect(() => setHydrated(true), [])
  return (
    <main
      className="content-page playground-page"
      data-testid="playground-root"
      data-hydrated={hydrated}
    >
      <div className="page-hero pg-hero">
        <span className="eyebrow">A little hands-on learning</span>
        <h1>
          See what happens
          <br />
          <em>when interfaces move.</em>
        </h1>
        <p className="lead">
          Pick a scenario, try to tap through the change, and see how sparsh keeps the interaction
          fair.
        </p>
      </div>
      <section className="pg-workbench" aria-label="sparsh playground">
        <div className="pg-toolbar">
          <fieldset className="pg-control-group">
            <legend className="pg-label">FRAMEWORK</legend>
            <div className="pg-segment">
              <button
                type="button"
                aria-pressed={framework === 'react'}
                className={framework === 'react' ? 'active' : ''}
                onClick={() => setFramework('react')}
              >
                React
              </button>
              <button
                type="button"
                aria-pressed={framework === 'vue'}
                className={framework === 'vue' ? 'active' : ''}
                onClick={() => setFramework('vue')}
              >
                Vue
              </button>
            </div>
          </fieldset>
          <fieldset className="pg-control-group">
            <legend className="pg-label">GUARD MODE</legend>
            <div className="pg-segment">
              <button
                type="button"
                aria-pressed={mode === 'report'}
                className={mode === 'report' ? 'active' : ''}
                onClick={() => setMode('report')}
              >
                Report
              </button>
              <button
                type="button"
                aria-pressed={mode === 'enforce'}
                className={mode === 'enforce' ? 'active' : ''}
                onClick={() => setMode('enforce')}
              >
                Enforce
              </button>
            </div>
          </fieldset>
        </div>
        <fieldset className="pg-scenario-tabs">
          <legend className="pg-visually-hidden">Choose a scenario</legend>
          {(Object.keys(scenarios) as Scenario[]).map((key, index) => (
            <button
              type="button"
              key={key}
              aria-pressed={scenario === key}
              className={scenario === key ? 'selected' : ''}
              onClick={() => {
                setScenario(key)
                setLastDecision(null)
              }}
            >
              <span>0{index + 1}</span>
              {scenarios[key].title}
            </button>
          ))}
        </fieldset>
        <div className="pg-description">
          <div>
            <h2>{current.title}</h2>
            <p>{current.description}</p>
          </div>
          <label className="pg-cooldown">
            Cooldown <strong>{cooldownMs} ms</strong>
            <input
              aria-label="Cooldown in milliseconds"
              type="range"
              min="0"
              max="1500"
              step="50"
              value={cooldownMs}
              onChange={(e) => setCooldownMs(Number(e.target.value))}
            />
          </label>
        </div>
        <div className="pg-stage" key={`${framework}-${scenario}-${mode}-${cooldownMs}`}>
          {framework === 'react' ? (
            <Scene
              scenario={scenario}
              mode={mode}
              cooldownMs={cooldownMs}
              onDecision={onDecision}
              onReset={onReset}
            />
          ) : (
            <VueMount
              scenario={scenario}
              mode={mode}
              cooldownMs={cooldownMs}
              onDecision={onDecision}
              onReset={onReset}
            />
          )}
        </div>
        <div className="pg-explainer">
          <span className="pg-explainer-icon">{mode === 'report' ? '◉' : '✋'}</span>
          <div>
            <strong>
              {lastDecision
                ? lastDecision.allowed
                  ? 'That tap looked safe.'
                  : mode === 'report'
                    ? 'Sparsh noticed the change.'
                    : 'Sparsh stopped the tap.'
                : mode === 'report'
                  ? 'Report mode is a safe place to start.'
                  : 'Enforce mode protects the interaction.'}
            </strong>
            <p>
              {lastDecision
                ? lastDecision.allowed
                  ? 'The target stayed consistent from pointer down to pointer up.'
                  : mode === 'report'
                    ? 'The suspicious activation was recorded and allowed through, so you can tune before blocking.'
                    : 'The activation was prevented because the target was too new or changed beneath your pointer.'
                : 'Try the scenario once in each mode. Report mode observes; enforce mode can block suspicious activations.'}
            </p>
          </div>
        </div>
      </section>
      <section className="pg-code-section">
        <div>
          <span className="eyebrow">THE SETUP</span>
          <h2>A small wrapper. A calmer interface.</h2>
          <p>This example follows your framework, scenario, mode, and cooldown settings.</p>
        </div>
        <pre>
          <code>{exampleCode(framework, scenario, mode, cooldownMs)}</code>
        </pre>
      </section>
      <p className="pg-footnote">
        These are real React and Vue bindings running in your browser. No account or sandbox setup
        needed.
      </p>
    </main>
  )
}
