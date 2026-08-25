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

## Report-only by default — the philosophical core

Global input interception is a frightening thing to install. The failure mode — "my app randomly ignores
clicks" — gets a library deleted on first occurrence. So **the default does nothing**:

```ts
mode: 'report' | 'enforce'   // default: 'report'
```

In `report`, every policy still evaluates and fires `onDecision`, but **nothing is blocked**. Teams
instrument a bug class they currently *cannot even see*, look at real data from their own app, then enable
enforcement **per policy**. A team can enforce Continuity (near-zero false-positive risk) while leaving
Age in report mode (tuning-sensitive).

This is simultaneously:
- the **safety property** (installing sparsh can never break your app on day one), and
- the **adoption wedge** (it makes an invisible, self-blamed bug class *measurable*).

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
5. **Measure before enforce.** Report mode first, always.
