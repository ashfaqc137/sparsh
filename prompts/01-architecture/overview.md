# Architecture overview

## Shape in one picture

```
                      ┌──────────────────────────────────────────────┐
                      │                @sparsh/core                   │
                      │  (pure, ZERO DOM, framework-agnostic)         │
                      │                                              │
   ActivationEvent ──▶│  Engine.decide(event)                        │
                      │    per-pointerId in-flight state             │
                      │    ┌───────── policy pipeline ─────────┐     │
                      │    │ classify → age → continuity →     │     │
                      │    │ semantics → double-fire           │     │──▶ Decision
                      │    └───────────────────────────────────┘     │    (onDecision)
                      │                                              │
                      │  depends ONLY on Host ports (interfaces)     │
                      └───────────────▲──────────────────────────────┘
                                      │ implements ports
              ┌───────────────────────┴───────────────────────┐
              │                  @sparsh/dom                   │
              │  capture-phase listener, target resolution,    │
              │  rect/fingerprint reads, IO/MO age tracking,   │
              │  block() = preventDefault + stopPropagation    │
              │  ALSO: createGuard(root, opts) vanilla entry   │
              └───────────────────────▲───────────────────────┘
                                      │ uses
              ┌───────────────────────┴───────────────────────┐
              │                 @sparsh/react                  │
              │  <ActivationGuardProvider>  useActivationGuard │
              └────────────────────────────────────────────────┘
```

## The two seams that matter

1. **The platform (host) seam** — between `core` and `dom`. `core` never touches the DOM; it talks to a
   `Host` interface (ports). `dom` implements those ports for browsers. A future React Native host would
   implement the same ports. **This is the seam that makes sparsh portable.** It is *not* a framework
   seam.

2. **The framework (binding) seam** — between `dom`+`core` and `react`. A binding contributes only
   *lifecycle* (attach in effect, destroy on cleanup) and *config plumbing* (context, refs). It is
   intentionally thin. **There is deliberately no shared "framework adapter" package** — that abstraction
   has one provider and one consumer and would become a leaky lowest-common-denominator. Each future
   framework binding is thin and independent over `core` + `dom`.

## Why core-first / framework-agnostic

The goal is a **UX philosophy adopted across frameworks**, React first (it also gives us the live demo).
So `@sparsh/core`'s public API *is the product* — it's the contract we're asking Vue/Svelte/Angular
authors to build against. It gets designed as a stable contract, versioned carefully, and kept DOM-free so
its correctness is provable without a browser.

## Why `@sparsh/dom` is a real package (not premature)

Every *web* framework binding shares the same browser host. So `dom` has multiple real consumers
(`react`, and future `vue`/`svelte`), plus it doubles as the **vanilla / no-framework entry point**
(`createGuard(root, opts)`). That is a genuine reason to exist today — unlike a framework-adapter package,
which is not built.

## Event-driven, not enumeration-driven (the zero-per-component property)

sparsh **never builds a registry of interactive elements**. One capture listener above the tree inspects
`event.target` at activation time and asks the policy questions about *that* node. A page with 300
interactive elements costs the same as one with 3, because work is **per-interaction, not per-element**.
The `MutationObserver`/`IntersectionObserver` side is equally flat — added/visible nodes get a `WeakMap`
timestamp as they arrive; no subscriptions, no registration calls, no tree walks.

## SSR & lifecycle

- **SSR-safe:** no DOM access during render. The host attaches in an effect / explicit `createGuard` call.
- **Arm on visibility, not mount** (Chromium `VisibilityChanged()` semantics). A hidden-then-revealed
  surface must re-arm. Do not assume mount === visible.
- **One listener on the provider root**, not `document` (avoids the Radix #1241 class of "whole page
  dead" bug and swallowing unrelated input).

## What lives where (summary — details in `packages.md`)

| Concern | Package |
|---|---|
| Types, `Decision`, engine, policy pipeline, `Host` port interface | `core` |
| Capture listener, target resolution, rect/fingerprint reads, age tracking, `block()` | `dom` |
| Provider, hook, React lifecycle, `data-guard*` React ergonomics | `react` |
| Vanilla `createGuard(root, opts)` | `dom` |
