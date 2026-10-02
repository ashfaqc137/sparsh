// Tells React's `act()` that this jsdom environment is a supported test environment —
// silences "The current testing environment is not configured to support act(...)".
// biome-ignore lint/suspicious/noExplicitAny: global test flag, no typed global for it
;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true
