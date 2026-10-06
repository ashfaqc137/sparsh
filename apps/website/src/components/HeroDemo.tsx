import { ActivationGuardProvider, useActivationGuard } from '@sparsh/react'
import { useEffect, useRef, useState } from 'react'

type Message = {
  id: string
  sender: string
  initials: string
  subject: string
  preview: string
  time: string
  color: string
}

const MAYA: Message = {
  id: 'maya',
  sender: 'Maya Chen',
  initials: 'MC',
  subject: 'The little place by the water',
  preview: 'I found the photos from our weekend. You have to see…',
  time: '9:41 AM',
  color: 'lilac',
}

const NEW_MESSAGE: Message = {
  id: 'leo',
  sender: 'Leo Park',
  initials: 'LP',
  subject: 'Quick question about Friday',
  preview: 'Are we still on for dinner? I can book the table…',
  time: 'Now',
  color: 'mint',
}

const OTHER_MESSAGES: Message[] = [
  {
    id: 'studio',
    sender: 'Field Notes Studio',
    initials: 'FN',
    subject: 'Your weekly inspiration',
    preview: 'A few things worth saving for later.',
    time: 'Yesterday',
    color: 'peach',
  },
  {
    id: 'sam',
    sender: 'Sam Rivera',
    initials: 'SR',
    subject: 'Re: Saturday plans',
    preview: 'Perfect. See you there!',
    time: 'Yesterday',
    color: 'blue',
  },
]

type Stage = 'ready' | 'countdown' | 'arrived' | 'blocked' | 'opened'
const COOLDOWN_MS = 2500
const COUNTDOWN_STEP_MS = 800

export function HeroDemo() {
  const [stage, setStage] = useState<Stage>('ready')
  const [openedMessage, setOpenedMessage] = useState<Message | null>(null)
  const [countdown, setCountdown] = useState(3)
  const countdownRef = useRef(3)
  const setupTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const arrivalTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function clearTimers() {
    if (setupTimer.current !== null) clearInterval(setupTimer.current)
    if (arrivalTimer.current !== null) clearTimeout(arrivalTimer.current)
    if (resetTimer.current !== null) clearTimeout(resetTimer.current)
    setupTimer.current = null
    arrivalTimer.current = null
    resetTimer.current = null
  }

  useEffect(
    () => () => {
      if (setupTimer.current !== null) clearInterval(setupTimer.current)
      if (arrivalTimer.current !== null) clearTimeout(arrivalTimer.current)
      if (resetTimer.current !== null) clearTimeout(resetTimer.current)
    },
    [],
  )

  function receiveMessage() {
    if (stage !== 'ready' && stage !== 'countdown') return
    if (setupTimer.current !== null) clearInterval(setupTimer.current)
    setupTimer.current = null
    arrivalTimer.current = null
    setStage('arrived')
    resetTimer.current = setTimeout(() => {
      setStage((current) => (current === 'arrived' ? 'ready' : current))
      resetTimer.current = null
    }, COOLDOWN_MS)
  }

  function startDemo() {
    if (stage !== 'ready') return
    countdownRef.current = 3
    setCountdown(3)
    setStage('countdown')
    setupTimer.current = setInterval(() => {
      countdownRef.current -= 1
      setCountdown(countdownRef.current)
      if (countdownRef.current === 0) {
        if (setupTimer.current !== null) clearInterval(setupTimer.current)
        setupTimer.current = null
        arrivalTimer.current = setTimeout(receiveMessage, 500)
      }
    }, COUNTDOWN_STEP_MS)
  }

  function replay() {
    clearTimers()
    setOpenedMessage(null)
    setStage('ready')
  }

  function handleBlocked() {
    clearTimers()
    setStage('blocked')
  }

  function openMessage(message: Message) {
    if (message.id === MAYA.id && stage === 'arrived') clearTimers()
    setOpenedMessage(message)
    setStage('opened')
  }

  const messages =
    stage === 'arrived' || stage === 'blocked' || stage === 'opened'
      ? [NEW_MESSAGE, MAYA, ...OTHER_MESSAGES]
      : [MAYA, ...OTHER_MESSAGES]

  return (
    <ActivationGuardProvider
      mode="enforce"
      policies={['age']}
      cooldownMs={COOLDOWN_MS}
      blockAnimation={false}
      onSuspect={handleBlocked}
    >
      <main className="landing">
        <section className="hero-copy" id="top" aria-labelledby="hero-title">
          <p className="eyebrow">
            <span className="eyebrow-dot" /> Let’s see what your tap finds
          </p>
          <h1 id="hero-title">
            You meant to open Maya’s message.
            <br />
            <span>Your inbox had other ideas.</span>
          </h1>
          <p className="hero-description">
            Open Maya’s message. But wait—a new one just arrived. See what happens when the inbox
            changes mid-tap.
          </p>
        </section>

        <section className="demo-stage" aria-label="Interactive inbox demo">
          <div className="demo-instructions" aria-live="polite">
            <div
              className={`instruction-icon ${stage === 'countdown' ? 'counting' : ''}`}
              aria-hidden="true"
            >
              {stage === 'countdown'
                ? countdown
                : stage === 'blocked'
                  ? '✳'
                  : stage === 'opened'
                    ? '↗'
                    : '↘'}
            </div>
            <div className="instruction-copy">
              <strong>
                {stage === 'ready' && 'Find Maya’s message'}
                {stage === 'countdown' &&
                  (countdown === 0 ? 'Go—open Maya’s message' : 'Get ready to open Maya’s message')}
                {stage === 'arrived' && 'Now open Maya’s message'}
                {stage === 'blocked' && 'Your tap was headed somewhere else'}
                {stage === 'opened' && 'Right where you meant to go'}
              </strong>
              <span>
                {stage === 'ready' && 'Start the demo. When the count ends, go for Maya’s message.'}
                {stage === 'countdown' &&
                  (countdown === 0
                    ? 'Now—open Maya’s message.'
                    : 'Get ready—open Maya’s message when the countdown ends.')}
                {stage === 'arrived' && 'Quick—tap where Maya was. The inbox just changed.'}
                {stage === 'blocked' &&
                  `${NEW_MESSAGE.sender} was too new to be the message you meant to open.`}
                {stage === 'opened' && `${openedMessage?.sender} · ${openedMessage?.subject}`}
              </span>
            </div>
            {(stage === 'blocked' || stage === 'opened') && (
              <button className="replay-button" type="button" onClick={replay} data-guard="off">
                Replay <span aria-hidden="true">↻</span>
              </button>
            )}
          </div>

          <div
            className={`mail-window ${stage === 'blocked' ? 'has-blocked' : ''} ${stage === 'opened' ? 'has-opened' : ''}`}
          >
            <div className="window-chrome" aria-hidden="true">
              <span className="chrome-dots">
                <i />
                <i />
                <i />
              </span>
              <span className="chrome-title">little things</span>
              <span className="chrome-action">•••</span>
            </div>
            <div className="mail-layout">
              <aside className="mail-rail" aria-hidden="true">
                <div className="mail-logo" aria-hidden="true">
                  ✳
                </div>
                <span className="rail-item selected">▤</span>
                <span className="rail-item">☆</span>
                <span className="rail-item">↗</span>
                <div className="rail-avatar">A</div>
              </aside>

              <div className="inbox-panel">
                <div className="inbox-heading">
                  <div>
                    <span className="inbox-kicker">YOUR PERSONAL INBOX</span>
                    <h2>
                      Inbox <span className="inbox-count">{messages.length}</span>
                    </h2>
                  </div>
                  <span className="compose-button" aria-hidden="true">
                    ＋
                  </span>
                </div>
                <div className="inbox-search">
                  <span aria-hidden="true">⌕</span> Search your mail
                </div>
                <div className="message-list" aria-label="Messages">
                  {messages.map((message) => (
                    <MessageRow
                      key={message.id}
                      message={message}
                      fresh={message.id === NEW_MESSAGE.id && stage === 'arrived'}
                      onOpen={() => openMessage(message)}
                    />
                  ))}
                </div>
                <div className="inbox-footnote">
                  <span className="sync-dot" />{' '}
                  {stage === 'arrived' || stage === 'blocked'
                    ? 'Inbox updated just now'
                    : 'All caught up'}
                </div>
              </div>

              <div className="message-preview" aria-live="polite">
                {openedMessage ? (
                  <div className="opened-message">
                    <div className={`avatar avatar-${openedMessage.color}`}>
                      {openedMessage.initials}
                    </div>
                    <span className="preview-label">MESSAGE OPENED</span>
                    <h3>{openedMessage.subject}</h3>
                    <p className="opened-by">From {openedMessage.sender}</p>
                    <div className="letter-rule" />
                    <p className="letter-copy">
                      {openedMessage.id === MAYA.id
                        ? 'I found the photos from our weekend by the water. It made me think how nice it would be to do it all again soon. Tell me when you’re free 💌'
                        : 'Are we still on for dinner Friday? I found a cozy place near the river and thought you might like it. Let me know!'}
                    </p>
                    <span className="sentiment">
                      Made it to the right place <span aria-hidden="true">♡</span>
                    </span>
                  </div>
                ) : (
                  <div className="preview-empty">
                    <div className="preview-orbit orbit-one" />
                    <div className="preview-orbit orbit-two" />
                    <div className="preview-envelope" aria-hidden="true">
                      ✉
                    </div>
                    <span>NOTHING OPENED YET</span>
                    <p>Pick a message to see it here.</p>
                  </div>
                )}
              </div>
            </div>
            <span className="window-glow glow-a" aria-hidden="true" />
            <span className="window-glow glow-b" aria-hidden="true" />
            {(stage === 'ready' || stage === 'countdown') && (
              <div
                className={`demo-overlay ${stage === 'countdown' ? 'is-counting' : ''}`}
                aria-live="polite"
              >
                <div className="overlay-card">
                  <span className="overlay-kicker">
                    {stage === 'countdown'
                      ? countdown === 0
                        ? 'OPEN MAYA’S MESSAGE NOW'
                        : 'GET READY · OPEN MAYA’S MESSAGE'
                      : 'A LIVE INBOX DEMO'}
                  </span>
                  <div className="overlay-count" aria-hidden="true">
                    {stage === 'countdown' ? (countdown === 0 ? 'GO' : countdown) : '✳'}
                  </div>
                  <h2>Open Maya’s message</h2>
                  <p>
                    {stage === 'countdown'
                      ? countdown === 0
                        ? 'New mail is popping in. Go for Maya’s message.'
                        : 'As soon as the count ends, tap the message you were aiming for.'
                      : 'A new message is about to arrive. See what happens to your tap.'}
                  </p>
                  {stage === 'ready' && (
                    <button
                      className="overlay-start"
                      type="button"
                      onClick={startDemo}
                      data-guard="off"
                    >
                      Start the demo <span aria-hidden="true">→</span>
                    </button>
                  )}
                  {stage === 'countdown' && (
                    <span className="overlay-count-label">
                      {countdown === 0 ? 'GO!' : `${countdown}…`}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          <div
            className={`outcome-note ${stage === 'blocked' ? 'outcome-blocked' : ''} ${stage === 'opened' && openedMessage?.id === MAYA.id ? 'outcome-success' : ''} ${stage === 'opened' && openedMessage?.id !== MAYA.id ? 'outcome-miss' : ''}`}
            aria-live="assertive"
          >
            {stage === 'blocked' && (
              <>
                <span className="outcome-check" aria-hidden="true">
                  ✓
                </span>
                <span className="outcome-copy">
                  <strong>Nice catch. Nothing opened.</strong>
                  Leo’s new message slid into Maya’s spot just before your tap landed. sparsh
                  stopped it because it was brand new. Maya’s message is still right below—go ahead
                  and open it.
                </span>
              </>
            )}
            {stage === 'opened' && openedMessage?.id === MAYA.id && (
              <>
                <span className="outcome-check" aria-hidden="true">
                  ♡
                </span>
                <span className="outcome-copy">
                  <strong>There she is.</strong>
                  Maya’s message opened because it stayed put. sparsh stays out of the way when
                  everything’s where you expect it.
                </span>
              </>
            )}
            {stage === 'opened' && openedMessage?.id !== MAYA.id && (
              <>
                <span className="outcome-check" aria-hidden="true">
                  ↗
                </span>
                <span className="outcome-copy">
                  <strong>{openedMessage?.sender} opened instead.</strong>
                  Maya moved after you decided to open her message. Hit Replay and see if sparsh
                  catches the mix-up next time.
                </span>
              </>
            )}
          </div>
        </section>

        <section className="closing-line" aria-label="What sparsh does">
          <span className="closing-star" aria-hidden="true">
            ✳
          </span>
          <p>
            When the page changes <em>while your tap is on its way</em>, sparsh helps it land where
            you meant.
          </p>
        </section>
      </main>
    </ActivationGuardProvider>
  )
}

function MessageRow({
  message,
  fresh,
  onOpen,
}: {
  message: Message
  fresh: boolean
  onOpen: () => void
}) {
  const { ref, isGuarded } = useActivationGuard()

  return (
    <button
      className={`message-row ${fresh ? 'message-fresh' : ''} ${isGuarded ? 'message-guarded' : ''}`}
      type="button"
      ref={ref}
      data-guard-key={message.id}
      onClick={onOpen}
      aria-label={`Open message from ${message.sender}: ${message.subject}`}
    >
      <span className={`avatar avatar-${message.color}`}>{message.initials}</span>
      <span className="message-content">
        <span className="message-meta">
          <strong>{message.sender}</strong>
          <time>{message.time}</time>
        </span>
        <span className="message-subject">{message.subject}</span>
        <span className="message-preview-text">{message.preview}</span>
      </span>
      {fresh && <span className="new-pill">NEW</span>}
      {isGuarded && (
        <span className="guard-ripple" aria-hidden="true">
          ✳
        </span>
      )}
    </button>
  )
}
