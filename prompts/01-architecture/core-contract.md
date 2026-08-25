# The core contract (`@sparsh/core`)

This is **the stable public API** — the thing every framework binding and every host implements against.
Treat changes here as semver-significant. Everything is DOM-free and browser-free.

> The types below are the **normative reference**. Implementers should keep the real `.ts` in sync with
> this doc; if they diverge, update this doc in the same change.

## Enums / unions

```ts
export type Mode = 'report' | 'enforce'

export type PolicyId = 'age' | 'continuity' | 'semantics' | 'doubleFire'

// How the activation was produced. Drives which policies apply (see 02-policies/classification.md).
export type InputKind = 'mouse' | 'touch' | 'pen' | 'virtual' | 'key'

// intent   = the moment intent is formed (pointerdown, or first-visible for age on a fresh element)
// activation = the moment the action would commit (pointerup / click / key-activate)
export type Phase = 'intent' | 'activation'
```

## Normalized input event (host → engine)

The host normalizes raw platform events into this shape. The engine never sees a DOM event.

```ts
export interface ActivationEvent {
  phase: Phase
  kind: InputKind
  /** present for pointer inputs; absent for key/virtual */
  pointerId?: number
  /** opaque handle the host understands; engine treats it as a token */
  target: TargetHandle
  /** monotonic ms (host clock) */
  timeStamp: number
  /** escape hatch: true for events the host says must never be blocked (esc/focus/scroll already filtered upstream) */
  neverBlock?: boolean
}

/** Opaque to the engine. In @sparsh/dom this wraps an Element. */
export type TargetHandle = { readonly __brand: 'TargetHandle' }
```

## Target snapshot (host-provided reads)

The engine asks the host for a snapshot of a target at a given moment. **The host owns all measurement**,
including the age heuristic — so age can be refined inside `dom` without touching `core` or any binding.

```ts
export interface Rect { x: number; y: number; w: number; h: number }

export interface Fingerprint {
  disabled: boolean
  /** trimmed textContent — OPT-IN / scoped; see semantics.md for the live-text false-positive caveat */
  text?: string
  ariaLabel?: string
  /** href for links, value for inputs, etc. */
  role?: string
  hrefOrValue?: string
  /** data-guard-key, if present — the only reliable signal for case 5 (list reorder) */
  guardKey?: string
}

export interface TargetSnapshot {
  /** stable identity token for equality comparison across time (host decides how) */
  identity: unknown
  rect: Rect
  fingerprint: Fingerprint
  /** ms since the element became PERCEIVABLE (visible), per the host's age heuristic. Unknown => Infinity (old). */
  ageMs: number
  /** data-guard="off" — opt-out escape hatch */
  guardOff: boolean
}
```

## The Host port (implemented by `@sparsh/dom`, future RN host, and test fakes)

```ts
export type Unsubscribe = () => void

export interface Host {
  /** Subscribe to normalized activation events. Host is responsible for capture-phase, pointer-id, cleanup. */
  onActivationEvent(cb: (e: ActivationEvent) => void): Unsubscribe

  /** Resolve a raw platform target to the interactive element handle, or null if none. */
  resolveTarget(raw: unknown): TargetHandle | null

  /** Read a target at "now". */
  snapshot(target: TargetHandle): TargetSnapshot

  /** Prevent the activation from committing. In dom: preventDefault + stopPropagation in capture phase. */
  block(e: ActivationEvent): void

  /** Monotonic clock. */
  now(): number
}
```

## Engine options & construction

```ts
export interface GuardOptions {
  /** Global mode, or per-policy override. Default: 'report' for ALL policies. */
  mode?: Mode | Partial<Record<PolicyId, Mode>>

  /** Age cooldown. Default 500. */
  cooldownMs?: number

  /** Continuity rect-movement tolerance in px. Default: small, e.g. 4. */
  rectThresholdPx?: number

  /** Which policies run. Default: all four. */
  policies?: PolicyId[]

  /** Fires for EVERY decision — allow and block — in BOTH report and enforce. This is the instrumentation hook. */
  onDecision?: (d: Decision) => void
}

export interface Guard {
  destroy(): void
  /** Was the most recent activation for this handle blocked? Powers React's isGuarded. */
  isGuarded(target: TargetHandle): boolean
}

export function createGuard(host: Host, opts?: GuardOptions): Guard
```

## Decision (engine → consumer)

```ts
export interface DecisionEventInfo { kind: InputKind; phase: Phase }

export interface DecisionTargetInfo {
  identity: unknown
  ageMs: number
  guardKey?: string
}

export interface Decision {
  /** policy verdict: would this be allowed if enforced? */
  allowed: boolean
  /** did sparsh ACTUALLY block it (i.e. verdict was untrusted AND that policy is in enforce mode)? */
  enforced: boolean
  /** which policy produced the verdict (undefined when allowed by all) */
  policy?: PolicyId
  /** human-readable reason, e.g. "target younger than cooldown (120ms < 500ms)" */
  reason?: string
  event: DecisionEventInfo
  target: DecisionTargetInfo
}
```

> `onSuspect` (used loosely in earlier drafts) is just `onDecision` filtered to `allowed === false`.
> Bindings may expose a convenience `onSuspect` that forwards those.

## Policy interface (internal, but part of the contract for extensibility)

```ts
export interface PolicyContext {
  now: number
  cooldownMs: number
  rectThresholdPx: number
}

export interface Verdict {
  allowed: boolean
  reason?: string
}

export interface Policy {
  id: PolicyId
  /** Does this policy apply to this input kind? (e.g. continuity: pointer only) */
  appliesTo(kind: InputKind): boolean
  /**
   * Evaluate at activation. `intent` is the snapshot captured at intent-phase for this interaction
   * (may be undefined for key/virtual with no pointerdown). `activation` is the snapshot at now.
   */
  evaluate(
    intent: TargetSnapshot | undefined,
    activation: TargetSnapshot,
    ctx: PolicyContext,
  ): Verdict
}
```

## Engine responsibilities (what `createGuard` wires up)

1. Subscribe to `host.onActivationEvent`.
2. On **intent-phase** events (`pointerdown`), resolve target and store `{ identity, snapshot }` keyed by
   `pointerId`. Clear on `pointercancel` / `lostpointercapture` (host emits those as intent-clearing —
   see dom host spec).
3. On **activation-phase** events (`pointerup` / `click` / key-activate), resolve target, take a fresh
   snapshot, look up the stored intent snapshot (if any), run the applicable policies in order.
4. First policy returning `allowed:false` wins. Compute `enforced = !allowed && modeFor(policy) ===
   'enforce'`. If `enforced`, call `host.block(e)`.
5. Emit `onDecision` **always**.
6. Respect `neverBlock` and `guardOff` — short-circuit to allowed, no block, but may still emit a decision
   for observability (with `enforced:false`).

## Invariants the engine must uphold

- **Never** block when `mode` for the deciding policy is `report`.
- **Never** block a `neverBlock` event or a `guardOff` target.
- **Fail open:** any thrown error inside a policy or snapshot is caught and treated as `allowed:true`.
- Applicable-policy gating happens **before** evaluation (Continuity must not even look at key/virtual).
