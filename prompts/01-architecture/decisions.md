# Decision log (ADR-style)

Append-only. Each entry records a decision that is **settled** — do not re-open without a new entry that
supersedes the old one. This file exists so a fresh LLM does not re-litigate hard-won tradeoffs.

Format: `ID · Decision · Status · Rationale · Consequences`.

---

### D1 · Name is `sparsh` · Accepted
**Rationale:** "sparsh" (touch, Hindi/Sanskrit) frames the project as *sensory / trustworthy touch*, not a
defensive "guard". Better fit for a UX-philosophy positioning. Supersedes the earlier working name
`activation-guard`.
**Consequences:** npm scope `@sparsh/*` (`core`, `dom`, `react`). Verify scope availability at scaffolding;
fallback to unscoped `sparsh` / `sparsh-dom` / `sparsh-react`. Repo name `sparsh`.

### D2 · Framework-agnostic core is the product · Accepted
**Rationale:** the goal is a UX philosophy adopted across many frameworks (React first). The core API is
what other framework authors build against.
**Consequences:** `@sparsh/core` is DOM-free and versioned as a stable contract. Correctness provable
without a browser.

### D3 · Three packages: core / dom / react · Accepted
**Rationale:** `core` = contract; `dom` = shared browser host + vanilla entry (real multiple consumers);
`react` = first binding + demo.
**Consequences:** Publish all three from day one. `dom` is justified now; a framework-adapter package is
**not** (see D4).

### D4 · No shared "framework adapter" package · Accepted
**Rationale:** a layer between core and each framework would have one provider and one consumer today, and
framework idioms (React refs/context vs Vue composables vs Svelte stores) don't factor into a clean shared
abstraction — it becomes leaky lowest-common-denominator. The real reusable seam is the **platform host
port**, not framework glue.
**Consequences:** each framework binding is thin and independent over `core` + `dom`.

### D5 · The reusable seam is the platform (host) port · Accepted
**Rationale:** variation across platforms (DOM vs native) is the thing worth abstracting; it also keeps
core DOM-free and unlocks a future native host without touching core.
**Consequences:** `core` defines `Host`; `dom` implements it. All measurement (incl. age heuristic) lives
behind the port.

### D6 · Report-only by default; enforcement is per-policy · Accepted
**Rationale:** installing global input interception must never break an app on day one; also the adoption
wedge (measure first). Continuity is near-zero false-positive and can be enforced early; Age is
tuning-sensitive and stays report by default.
**Consequences:** default `mode` is `'report'` for all policies. `onDecision` fires in both modes.

### D7 · Fail open everywhere · Accepted
**Rationale:** false positives (a real click ignored) are existential; false negatives (a rare mistap) are
tolerable.
**Consequences:** unknown age ⇒ treated as old; thrown errors ⇒ allowed; missing signals never block.

### D8 · Pointer Events only; no legacy `mouse*`/`touch*` · Accepted
**Rationale:** Pointer Events are universal in 2026; duplicating paths reproduces the mouse/touch
divergence of crbug 40067456.
**Consequences:** intercept `pointerdown`/`pointerup`/`click`/`keydown` (Enter/Space); track per
`pointerId`; clear on `pointercancel`/`lostpointercapture`.

### D9 · Never block via `pointer-events: none` · Accepted
**Rationale:** it makes the target transparent so the click falls *through* to what's underneath — turning
one accidental activation into another (Radix #1241 class of bug).
**Consequences:** block at the event layer: capture-phase `preventDefault` + `stopPropagation`.

### D10 · One listener on the provider root, not `document` · Accepted
**Rationale:** listening on `document` risks swallowing unrelated input and the "whole page dead" failure.
React 17+ delegates at its root container, so a capture listener above it fires before synthetic handlers.
**Consequences:** provider obtains a root node; blocking is scoped to the guarded subtree.

### D11 · Accessibility carve-out is mandatory · Accepted
**Rationale:** keyboard/screen-reader/`.click()` produce no `pointerdown`; applying Continuity to them
would permanently break activation for AT users, app-wide.
**Consequences:** classify inputs; route `virtual`/`key` to Age + Semantics only. Never block Escape,
focus, or scroll in any mode.

### D12 · AgePolicy applies to ALL interaction kinds (incl. keyboard/virtual) · Accepted
**Rationale:** decision by project owner. Keeps the model uniform; perception matters regardless of input
modality. The nuance (fast keyboard/AT users hitting a freshly-focused control within the cooldown) is
handled at implementation time, and is already absorbed by Age being **report-mode by default** (D6).
**Consequences:** Age evaluates for `key`/`virtual` too. Watch for false positives on fast keyboard users;
this is a tuning concern, not an architectural one. (Continuity remains pointer-only per D11.)

### D13 · Age is measured from PERCEIVABILITY, not DOM insertion · Accepted
**Rationale:** the predicate is about perception. Raw `MutationObserver` insertion time ≠ visible time
(hidden-then-revealed, tab panels). Chromium arms on `VisibilityChanged()`.
**Consequences:** the dom host derives `ageMs` from `IntersectionObserver` first-visible (combined with
insertion stamp); unknown ⇒ `Infinity` (old / fail open). Known blind spots (`opacity:0`, occlusion)
documented and improvable inside the host without touching core.

### D14 · Semantics `textContent` diffing is opt-in / scoped · Accepted
**Rationale:** live text (counters, "2m ago") on otherwise-stable controls would cause false positives.
The `disabled`→enabled transition is the high-value, near-free check.
**Consequences:** default Semantics checks `disabled` + `aria-label` + `href/value` + `guardKey`; raw
`text` comparison is opt-in/scoped. See `02-policies/semantics.md`.

### D15 · Entity identity for list reorder is opt-in via `data-guard-key` · Accepted
**Rationale:** row 3 becoming a different invoice is invisible to any DOM fingerprint. Honest layering,
not pretend-automatic. Consumers already have `key={id}`.
**Consequences:** case 5 is only covered when `data-guard-key` is present. Documented as such.

### D16 · Hook, not HOC, for the React escape hatch · Accepted
**Rationale:** the guard needs a real DOM node; HOC ref-plumbing breaks on class/`memo`/ref-swallowing
components.
**Consequences:** `useActivationGuard()` returns `{ ref, isGuarded }`.

### D17 · Native (Android/iOS/RN) deferred, not precluded · Accepted
**Rationale:** the mechanism (global capture listener, retained-mode tree inspection, `getBoundingClientRect`,
Mutation/Intersection observers) does not port to immediate-mode Compose/SwiftUI; those would be genuinely
different implementations sharing only the *conceptual* policy model. Web value is also unproven.
**Consequences:** v1 is web only. The host-port design (D5) keeps native possible at zero extra cost now.
Do not distort the web core for a hypothetical native target beyond keeping DOM access behind the port.

### D18 · Monorepo: pnpm workspaces + turbo + changesets · Superseded by D20
**Rationale:** co-released public packages; turbo caching pays off once Playwright + demo are in the graph;
changesets for public semver. nx is heavier than needed at this size.
**Consequences:** pnpm workspaces; `packages/{core,dom,react}` + `apps/demo` + `e2e/`; tsup for bundling;
tsconfig project references; a lint fence keeping core DOM-free.
**Update:** the turbo portion of this decision is superseded by D20 — pnpm workspaces + changesets +
tsconfig project references stand as originally decided.

### D19 · Perf budget is a release blocker · Accepted
**Rationale:** a guard that adds latency gets removed; users dislike lag more than occasional mistaps.
**Consequences:** target < 1ms added per interaction on the interaction path, **plus** a separately
measured Mutation/Intersection background budget under a virtualized 10k-row list. Regression blocks
release.

### D20 · Drop turbo; run tasks with plain `pnpm -r` + `tsc -b` · Accepted
**Rationale:** at the current repo size (one implemented package, two placeholders), turbo's value —
build caching and task-graph orchestration — isn't paying for itself. `pnpm -r run <script>` already
executes in topological (dependency-graph) order natively, and `tsc -b` (tsconfig project references)
already gives fast, correctly-ordered typechecking across the graph. Turbo added a devDependency and a
config surface with no measurable benefit yet.
**Consequences:** `turbo.json` removed; `turbo` removed from root devDependencies; root scripts
(`build`, `test`, `typecheck`) now call `pnpm -r run ...` / `tsc -b` directly (see `tooling.md`). No
caching layer exists today — full rebuilds/tests run every time. **Revisit** once `apps/demo` (T20) and
the Playwright suite (T21) make the build graph heavy enough that uncached runs are a real cost; at that
point turbo (or nx) can be reintroduced with a new ADR without any change to package boundaries or code.
