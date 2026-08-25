# Input classification & the accessibility carve-out

**Read this before any policy.** Classification decides which policies even run. Getting it wrong doesn't
just weaken sparsh — it can *permanently break activation for assistive-technology users, app-wide*. That
is categorically worse than the bug sparsh fixes.

> Read react-aria's `usePress.ts` classification and
> [react-spectrum #3945](https://github.com/adobe/react-spectrum/issues/3945) before implementing. Do not
> re-derive this from first principles.

## The InputKind taxonomy

```ts
type InputKind = 'mouse' | 'touch' | 'pen' | 'virtual' | 'key'
```

- **mouse / touch / pen** — real pointer input, distinguished by `PointerEvent.pointerType`.
- **key** — keyboard activation (`keydown` Enter/Space that would trigger activation).
- **virtual** — programmatic or AT-driven activation: `.click()`, screen-reader "click", some automation.
  These arrive as a `click` event with **no preceding `pointerdown`**.

## How the dom host classifies (heuristics)

| Signal | Meaning |
|---|---|
| `PointerEvent.pointerType === 'mouse' \| 'touch' \| 'pen'` | the three real pointer kinds |
| `click` event with `event.detail === 0` | **virtual** (no real pointer sequence) |
| `click` event with empty/absent `pointerType` and no tracked pointerdown for it | **virtual** |
| `keydown` with `key === 'Enter' \| ' '` (Space) on an activatable element | **key** |

These are heuristics, not guarantees; when uncertain, **fail open** (treat as an input that should not be
blocked by pointer-only policies).

## The carve-out rule (the whole point of this file)

Keyboard activation, screen-reader clicks, and `.click()` produce **no `pointerdown` at all**. Therefore:

| Policy | mouse | touch | pen | key | virtual |
|---|---|---|---|---|---|
| **Age** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Continuity** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Semantics** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **DoubleFire** | ✅ | ✅ | ✅ | ❌ | ❌ |

- **Continuity requires an intent-phase `pointerdown`.** For `key`/`virtual` there is none, so Continuity
  **must not run** — running it would find no stored intent and (if implemented naively) block every AT
  activation forever.
- **Age applies to every kind, including `key`/`virtual`** (decision D12). A freshly-rendered control
  activated by keyboard within the cooldown *is* flagged — but Age is report-mode by default, so this is
  observable, not breaking, until a team opts in.
- **Semantics applies to every kind** — meaning changes matter regardless of modality. For `key`/`virtual`
  with no pointerdown, the "intent" snapshot for Semantics is taken at **first-visible** (the same anchor
  Age uses) rather than at pointerdown.

## Absolute prohibitions (any mode, any policy)

- **Never block `Escape`.** The user must always be able to dismiss.
- **Never block focus changes.** Tab/focus must always work.
- **Never block scroll.** Reading must always work.

The host filters these out *before* they ever reach the engine, and marks anything ambiguous with
`neverBlock: true`. The engine also defensively honors `neverBlock`.

## Implementation notes

- Classify **once**, at the host boundary, and put the result on `ActivationEvent.kind`. The engine trusts
  it and never re-sniffs.
- A `keydown` that would activate (Enter/Space) is the intent+activation for keyboard in one event for
  Space-on-button semantics; follow platform activation rules, but the key correctness point is: **route
  it to Age + Semantics only, and confirm it works normally after the cooldown window — never permanently
  blocked.**
- Pointer sequence bookkeeping (which `click` had a preceding tracked `pointerdown`) is what lets you tell
  a real click from a virtual one. Maintain it per `pointerId` and reconcile at `click` time.
