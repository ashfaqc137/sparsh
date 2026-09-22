import type { Decision } from '@sparsh/dom'
import { createGuard } from '@sparsh/dom'

const logEl = document.getElementById('log') as HTMLDivElement
const dangerBtn = document.getElementById('danger-btn') as HTMLButtonElement
const dangerCount = document.getElementById('danger-count') as HTMLSpanElement
const asyncBtn = document.getElementById('async-btn') as HTMLButtonElement
const asyncCount = document.getElementById('async-count') as HTMLSpanElement

let dangerFired = 0
let asyncFired = 0

function log(line: string): void {
  logEl.textContent = `${logEl.textContent ?? ''}${line}\n`
  logEl.scrollTop = logEl.scrollHeight
}

function decisionLine(d: Decision): string {
  const tag = d.allowed ? 'ALLOW' : d.enforced ? 'BLOCK' : 'FLAG '
  return `[${tag}] kind=${d.event.kind} phase=${d.event.phase}${d.policy ? ` policy=${d.policy}` : ''}${
    d.reason ? ` — ${d.reason}` : ''
  }`
}

// Real app "activation" handlers — what sparsh is protecting. If enforce mode + a policy blocks
// the activation, this must NOT fire.
dangerBtn.addEventListener('click', () => {
  dangerFired += 1
  dangerCount.textContent = String(dangerFired)
})
asyncBtn.addEventListener('click', () => {
  asyncFired += 1
  asyncCount.textContent = String(asyncFired)
})

let mode: 'report' | 'enforce' = 'report'
for (const radio of document.querySelectorAll<HTMLInputElement>('input[name="mode"]')) {
  radio.addEventListener('change', (e) => {
    mode = (e.target as HTMLInputElement).value as 'report' | 'enforce'
    log(`--- mode changed to ${mode} ---`)
  })
}

createGuard(document.body, {
  get mode() {
    return mode
  },
  onDecision: (d) => log(decisionLine(d)),
})

// --- Case 1: interstitial ---------------------------------------------------------------------
document.getElementById('arm-interstitial')?.addEventListener('click', () => {
  log('--- arming interstitial (mounts in 400ms) ---')
  setTimeout(() => {
    const target = document.getElementById('interstitial-target')
    if (target === null || document.getElementById('toast') !== null) return
    const toast = document.createElement('div')
    toast.id = 'toast'
    toast.textContent = 'Saved! (this pushed the button down)'
    target.prepend(toast)
    dangerBtn.style.marginTop = '2.75rem'
    log('--- toast mounted, displacing the button ---')
    setTimeout(() => {
      toast.remove()
      dangerBtn.style.marginTop = ''
      log('--- toast removed ---')
    }, 2000)
  }, 400)
})

// --- Case 4: async settle (disabled -> enabled) -----------------------------------------------
document.getElementById('arm-async')?.addEventListener('click', () => {
  asyncBtn.setAttribute('aria-disabled', 'true')
  log('--- async-btn disabled; will enable in 400ms ---')
  setTimeout(() => {
    asyncBtn.removeAttribute('aria-disabled')
    log('--- async-btn now enabled ---')
  }, 400)
})
