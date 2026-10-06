import { ActivationGuardProvider } from '@sparsh/react'
import { useState } from 'react'

/**
 * Placeholder hero demo (T-website-01). Proves the `@sparsh/react` wiring works end-to-end;
 * the real eye-catching scenario (repro + suspect log) gets designed next.
 */
export function HeroDemo() {
  const [blockedCount, setBlockedCount] = useState(0)

  return (
    <ActivationGuardProvider onSuspect={() => setBlockedCount((n) => n + 1)}>
      <section className="hero-demo">
        <p>Blocked activations: {blockedCount}</p>
        <button type="button">Try clicking me rapidly</button>
      </section>
    </ActivationGuardProvider>
  )
}
