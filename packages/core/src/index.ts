export type {
  ActivationEvent,
  Fingerprint,
  InputKind,
  IntentClearSignal,
  Mode,
  Phase,
  PolicyId,
  Rect,
  TargetHandle,
  TargetSnapshot,
} from './types.js'

export type { Host, Unsubscribe } from './host.js'

export type { Policy, PolicyContext, Verdict } from './policy.js'

export type { Decision, DecisionEventInfo, DecisionTargetInfo } from './decision.js'

export { createGuard } from './engine.js'
export type { Guard, GuardOptions } from './engine.js'

export { agePolicy, continuityPolicy, doubleFirePolicy, semanticsPolicy } from './policies/index.js'
