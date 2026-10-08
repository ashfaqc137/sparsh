# Philosophy & positioning

## The name

**sparsh** (स्पर्श) means *touch* in Hindi/Sanskrit. The name is deliberately **sensory**, not defensive.
Earlier the project was called `activation-guard`; we moved away from "guard" because the value is not a
security wall bolted on — it is making *touch itself trustworthy*. sparsh is about the relationship
between what the user perceived and what the system did with their intent.

Tagline: **trustworthy touch.**

## The unifying idea

> An activation is trustworthy **iff** the target was **perceivable long enough** to form intent, and its
> **identity and meaning are unchanged** from intent-formation through activation.

Three orthogonal policies over one shared listener implement that sentence:

- **Age** — was it perceivable long enough? (*perception*)
- **Continuity** — did identity/position hold *during* the press? (*in-flight stability*)
- **Semantics** — did meaning hold from intent to activation? (*meaning*)

Plus **DoubleFire** for the residual-event case, and a **classification** layer that decides which
policies even apply to a given input kind.

## Enforcement by default; report mode remains available

Global input interception needs an observable, predictable contract. sparsh defaults to **enforce mode**
so its protective behavior is active immediately; teams can choose report mode while tuning policies:

```ts
mode: 'report' | 'enforce'   // default: 'enforce'
```

In `report`, every policy still evaluates and fires `onDecision`, but **nothing is blocked**. Teams can
use report mode globally or per policy to inspect decisions without blocking; Age can be set to report
while tuning its cooldown.

`onDecision` keeps enforcement observable, and report mode supports policy tuning when an application
needs that additional control.

## Why this is hard to sell — and the answer

sparsh prevents a bug that **users blame on themselves** and **developers never instrument**. Invisible
infrastructure is hard to sell. The answer is `onDecision` in report mode: let teams *measure* the bug in
their own product before asking them to trust enforcement.

The likelier adoption wedge is **security framing**, not UX polish. These accidental activations are the
benign face of **tapjacking**. Chromium ships an internal partial version of exactly this idea framed as
security (see `prior-art.md`), and there are CVEs. "You have an un-instrumented tapjacking surface" opens
doors that "your buttons feel slightly off" does not.

## A block must be legible

Silently swallowing input reads as a broken app. The guard should be **invisible when input was correct**
and **legible when it wasn't**. `isGuarded` / `onDecision` exist so consumers can render *"This just
changed — tap again to confirm."* A block with no explanation is a worse experience than the original
mistap. This is a product requirement, not a nicety.

## Design values (in priority order)

1. **No false positives.** A correct click must always work. Everything below yields to this.
2. **Zero per-component cost.** No component needs modification to be protected. If adoption required
   annotating each control, sparsh would fail at exactly the unpredictable cases that motivate it.
3. **Framework-agnostic by construction.** The philosophy should outlive React. `core` is the contract we
   want Vue/Svelte/Angular authors to build against.
4. **Legibility over silence.** Explain blocks.
5. **Make protection observable.** Every decision fires `onDecision`, whether allowed or blocked.
