import type { Decision, Guard, Mode, PolicyId } from '@sparsh/dom'
import { createGuard } from '@sparsh/dom'

const logEl = document.getElementById('log') as HTMLDivElement

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

// --- Guard lifecycle: config (mode/cooldown/threshold) is constructor-time, so "Apply" tears
// down and recreates the guard rather than mutating it in place. ------------------------------

const POLICY_IDS: PolicyId[] = ['age', 'continuity', 'semantics', 'doubleFire']

const perPolicyModeSelects = new Map<PolicyId, HTMLSelectElement>()
const perPolicyContainer = document.getElementById('per-policy-modes') as HTMLDivElement
for (const id of POLICY_IDS) {
  const label = document.createElement('label')
  label.textContent = `${id}: `
  const select = document.createElement('select')
  select.dataset.testid = `mode-${id}`
  for (const value of ['inherit', 'report', 'enforce']) {
    const opt = document.createElement('option')
    opt.value = value
    opt.textContent = value
    select.appendChild(opt)
  }
  label.appendChild(select)
  perPolicyContainer.appendChild(label)
  perPolicyModeSelects.set(id, select)
}

const globalModeRadios = document.querySelectorAll<HTMLInputElement>('input[name="global-mode"]')
const cooldownInput = document.getElementById('cooldown-input') as HTMLInputElement
const rectThresholdInput = document.getElementById('rect-threshold-input') as HTMLInputElement
const applyButton = document.getElementById('apply-config') as HTMLButtonElement

function globalMode(): Mode {
  for (const r of globalModeRadios) if (r.checked) return r.value as Mode
  return 'report'
}

function buildModeOption(): Mode | Partial<Record<PolicyId, Mode>> {
  const overrides: Partial<Record<PolicyId, Mode>> = {}
  let anyOverride = false
  for (const [id, select] of perPolicyModeSelects) {
    if (select.value === 'inherit') continue
    overrides[id] = select.value as Mode
    anyOverride = true
  }
  if (!anyOverride) return globalMode()
  // Fill the rest with the global mode so unset policies still follow the global toggle.
  const g = globalMode()
  for (const id of POLICY_IDS) if (overrides[id] === undefined) overrides[id] = g
  return overrides
}

let guard: Guard
function recreateGuard(): void {
  guard?.destroy()
  guard = createGuard(document.body, {
    mode: buildModeOption(),
    cooldownMs: Number(cooldownInput.value) || 500,
    rectThresholdPx: Number(rectThresholdInput.value) || 4,
    onDecision: (d) => log(decisionLine(d)),
  })
  log(
    `--- guard (re)created: mode=${JSON.stringify(buildModeOption())} cooldownMs=${cooldownInput.value} rectThresholdPx=${rectThresholdInput.value} ---`,
  )
}
recreateGuard()
applyButton.addEventListener('click', recreateGuard)
for (const r of globalModeRadios) r.addEventListener('change', recreateGuard)
for (const select of perPolicyModeSelects.values()) select.addEventListener('change', recreateGuard)

// Real app "activation" handlers below — what sparsh is protecting. If enforce mode + a policy
// blocks the activation, these must NOT fire.

function wireCount(targetId: string, countId: string, onFire?: () => void): void {
  const target = document.getElementById(targetId) as HTMLButtonElement
  const countEl = document.getElementById(countId) as HTMLSpanElement
  let n = 0
  target.addEventListener('click', () => {
    n += 1
    countEl.textContent = String(n)
    onFire?.()
  })
}

// --- Case 1a: interstitial (occlusion) ----------------------------------------------------------
wireCount('case-1a-target', 'case-1a-count')
document.getElementById('case-1a-arm')?.addEventListener('click', () => {
  log('--- [1a] arming occlusion (toast covers target in 400ms) ---')
  const slot = document.getElementById('case-1a-slot') as HTMLDivElement
  setTimeout(() => {
    if (document.getElementById('case-1a-toast') !== null) return
    const toast = document.createElement('div')
    toast.id = 'case-1a-toast'
    toast.className = 'toast'
    toast.innerHTML = '<span>Updated!</span>'
    const dismiss = document.createElement('button')
    dismiss.textContent = 'Confirm'
    dismiss.id = 'case-1a-dismiss-target'
    dismiss.dataset.testid = 'case-1a-dismiss-target'
    toast.appendChild(dismiss)
    slot.appendChild(toast)
    wireCount('case-1a-dismiss-target', 'case-1a-count')
    log('--- [1a] toast now fully covers the original button (no reflow) ---')
    setTimeout(() => {
      toast.remove()
      log('--- [1a] toast removed ---')
    }, 5000)
  }, 400)
})

// --- Case 1b: interstitial (mid-press identity swap) --------------------------------------------
wireCount('case-1b-target', 'case-1b-count')
document.getElementById('case-1b-arm')?.addEventListener('click', () => {
  log('--- [1b] arming mid-press swap (toast covers target in 400ms; hold the button now) ---')
  const slot = document.getElementById('case-1b-slot') as HTMLDivElement
  setTimeout(() => {
    if (document.getElementById('case-1b-toast') !== null) return
    const toast = document.createElement('div')
    toast.id = 'case-1b-toast'
    toast.className = 'toast'
    const swap = document.createElement('button')
    swap.textContent = 'Confirm'
    swap.id = 'case-1b-swap-target'
    swap.dataset.testid = 'case-1b-swap-target'
    toast.appendChild(swap)
    slot.appendChild(toast)
    wireCount('case-1b-swap-target', 'case-1b-count')
    log('--- [1b] toast mounted mid-press; release now lands on a different element ---')
    setTimeout(() => {
      toast.remove()
      log('--- [1b] toast removed ---')
    }, 2000)
  }, 400)
})

// --- Case 2: layout shift ------------------------------------------------------------------------
wireCount('case-2-target', 'case-2-count')
document.getElementById('case-2-arm')?.addEventListener('click', () => {
  log('--- [2] arming layout shift (content pushes button down in 400ms) ---')
  const pushZone = document.getElementById('case-2-push-zone') as HTMLDivElement
  setTimeout(() => {
    if (pushZone.children.length > 0) return
    const banner = document.createElement('div')
    banner.textContent = 'New content loaded above (this pushed the button down via normal flow)'
    banner.style.padding = '0.6rem'
    banner.style.background = '#fde68a'
    banner.style.borderRadius = '6px'
    banner.style.marginBottom = '0.5rem'
    pushZone.appendChild(banner)
    log('--- [2] button displaced downward via reflow (same identity, rect moved) ---')
    setTimeout(() => {
      pushZone.innerHTML = ''
      log('--- [2] banner removed ---')
    }, 2000)
  }, 400)
})

// --- Case 3: late render --------------------------------------------------------------------------
let case3Fired = 0
document.getElementById('case-3-arm')?.addEventListener('click', () => {
  log('--- [3] arming late render (control materializes in 600ms; aim at the empty slot now) ---')
  const slot = document.getElementById('case-3-slot') as HTMLDivElement
  setTimeout(() => {
    if (document.getElementById('case-3-target') !== null) return
    const btn = document.createElement('button')
    btn.id = 'case-3-target'
    btn.dataset.testid = 'case-3-target'
    btn.textContent = 'Buy now'
    btn.addEventListener('click', () => {
      case3Fired += 1
      ;(document.getElementById('case-3-count') as HTMLSpanElement).textContent = String(case3Fired)
    })
    slot.appendChild(btn)
    log('--- [3] control materialized; a press starting now lands fully on it ---')
  }, 600)
})

// --- Case 4: async settle (disabled -> enabled) -----------------------------------------------
wireCount('case-4-target', 'case-4-count')
document.getElementById('case-4-arm')?.addEventListener('click', () => {
  const target = document.getElementById('case-4-target') as HTMLButtonElement
  target.setAttribute('aria-disabled', 'true')
  log('--- [4] target disabled; will enable in 400ms ---')
  setTimeout(() => {
    target.removeAttribute('aria-disabled')
    log('--- [4] target now enabled ---')
  }, 400)
})

// --- Case 5: list reorder (data-guard-key vs. without) ------------------------------------------
interface Row {
  domId: string
  entity: string
  hasGuardKey: boolean
}
let rows: Row[] = [
  { domId: 'row-a', entity: 'invoice-1', hasGuardKey: true },
  { domId: 'row-b', entity: 'invoice-2', hasGuardKey: false },
]
const listEl = document.getElementById('case-5-list') as HTMLUListElement

function renderRows(): void {
  listEl.innerHTML = ''
  for (const row of rows) {
    const li = document.createElement('li')
    li.id = row.domId
    li.dataset.testid = row.domId
    if (row.hasGuardKey) li.dataset.guardKey = row.entity
    const label = document.createElement('span')
    label.textContent = `${row.domId} → entity: ${row.entity}${row.hasGuardKey ? ' (guard-key)' : ' (no guard-key)'}`
    const btn = document.createElement('button')
    btn.textContent = 'Open'
    btn.addEventListener('click', () => {
      log(`[row-click] ${row.domId} opened entity=${row.entity}`)
    })
    li.append(label, btn)
    listEl.appendChild(li)
  }
}
renderRows()

document.getElementById('case-5-arm')?.addEventListener('click', () => {
  // Same DOM nodes (row-a stays row-a, row-b stays row-b) — only the underlying entity changes,
  // simulating a virtualized/recycled list re-sort. No insertion/removal/reflow at all.
  rows = rows.map((r) => ({
    ...r,
    entity: r.entity.endsWith('-1') ? r.entity.replace('-1', '-9') : r.entity.replace('-2', '-8'),
  }))
  renderRows()
  log('--- [5] entities swapped under the same DOM nodes (no DOM mutation visible) ---')
})

// --- Case 6: double-fire ---------------------------------------------------------------------
let case6Fired = 0
function renderCase6(): void {
  const slot = document.getElementById('case-6-slot') as HTMLDivElement
  slot.innerHTML = ''
  const confirmBtn = document.createElement('button')
  confirmBtn.id = 'case-6-confirm'
  confirmBtn.dataset.testid = 'case-6-confirm'
  confirmBtn.textContent = 'Confirm (closes + residual click underneath)'
  confirmBtn.addEventListener('click', () => {
    confirmBtn.remove()
    const underneath = document.createElement('button')
    underneath.id = 'case-6-underneath'
    underneath.dataset.testid = 'case-6-underneath'
    underneath.textContent = 'Underneath control'
    underneath.addEventListener('click', () => {
      case6Fired += 1
      ;(document.getElementById('case-6-count') as HTMLSpanElement).textContent = String(case6Fired)
    })
    slot.appendChild(underneath)
    log('--- [6] confirm collapsed; underneath control now occupies the same pixel ---')
    // Dispatch a synthetic residual pointer sequence immediately, simulating a ghost/repeat event
    // landing on the newly-exposed element right after the real activation committed.
    const rect = underneath.getBoundingClientRect()
    const opts = { bubbles: true, cancelable: true, clientX: rect.x + 5, clientY: rect.y + 5 }
    underneath.dispatchEvent(new PointerEvent('pointerdown', { ...opts, pointerId: 1 }))
    underneath.dispatchEvent(new PointerEvent('pointerup', { ...opts, pointerId: 1 }))
    underneath.dispatchEvent(new MouseEvent('click', opts))
  })
  slot.appendChild(confirmBtn)
}
renderCase6()
document.getElementById('case-6-arm')?.addEventListener('click', () => {
  case6Fired = 0
  ;(document.getElementById('case-6-count') as HTMLSpanElement).textContent = '0'
  renderCase6()
  log('--- [6] reset ---')
})

// --- Stable control (negative case) ------------------------------------------------------------
wireCount('case-stable-target', 'case-stable-count')
