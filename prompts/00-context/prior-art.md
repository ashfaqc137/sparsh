# Prior art & precedent

Research date: **2026-08-19**. This file records what exists, what doesn't, and what to read before
writing each part. The gap is real: **nothing on npm addresses this category.**

## The npm gap

Closest existing packages are all narrow, and none address the unstable-target problem:

| Package | What it does | Why it's not this |
|---|---|---|
| `react-prevent-clickthrough` | Stops event propagation | Propagation only; no timing, no identity, no meaning |
| `use-mouse-action` | Correlates pointer for dropdowns | Dropdown-specific pointer bookkeeping |
| `react-native-button-wrapper` | Double-click debounce | "Debounce a button" — the *solved* subset |

**"Debounce a button" is solved. Everything else in the six-case family is not.**

Notably absent where it would matter most:

- **Radix `DismissableLayer`** manages `pointer-events` on open/close but has **no activation delay**. The
  community workaround is a `setTimeout` to defer opening by a cycle — a thread that itself calls the
  approach suboptimal.
- **`react-aria`'s `usePress`** is the best press primitive available (`shouldCancelOnPointerExit`,
  virtual-pointer discrimination) but has **no notion of an unstable target**.
- **Sonner / react-hot-toast** — nothing. Toasts mount live under the cursor; that's case 1 by design.

## The precedent: Chromium's InputEventActivationProtector

Chromium ships a partial internal version: `ui/views/input_event_activation_protector.{h,cc}`, used by
permission prompts, `BluetoothDevicePairConfirmView`, and the PWA install dialog. Reading the current
source, its design is richer than the commonly-cited "500ms":

- Cooldown is `GetDoubleClickInterval()` (**system-derived**), not a hardcoded constant.
- `IsPossiblyUnintendedInteraction()` early-returns for non-input events, and for key events when
  `allow_key_events` is set.
- Detection delegates to a list of pluggable **policies**; any policy flagging the event blocks it. (This
  is where sparsh's policy-pipeline shape comes from.)
- `VisibilityChanged()` arms/disarms; `OnWindowStationaryStateChanged()` resets so idle periods don't
  cause repeated blocking.

Chrome frames this as **security (tapjacking)**, not polish — cf. **CVE-2023-6206** (Firefox),
[crbug 40067456](https://issues.chromium.org/issues/40067456). That dual framing (security + UX) is the
adoption wedge.

### The critical lesson from crbug 40067456

Chromium's code *looked* like it covered mouse and touch, but only worked for mouse on some platforms.
**Touch is where these guards silently rot** — a mouse-only test suite passes while the guard does nothing
on a phone. This is why sparsh's rule #5 exists: **touch asserted independently, never inferred from
mouse.**

## Read-before-you-write list

- Before writing input **classification** (`02-policies/classification.md`): read react-aria's
  `usePress.ts` classification and [react-spectrum #3945](https://github.com/adobe/react-spectrum/issues/3945)
  (the virtual-vs-real pointer discrimination problem). Do not re-derive this from scratch.
- Before writing the **capture listener / blocking** (`02-policies` + dom host): read
  [Radix #1241](https://github.com/radix-ui/primitives/issues/1241) — stranded `pointer-events: none` on
  `<body>` left the whole page dead. This is why sparsh blocks at the *event layer*, not via
  `pointer-events`.
- Before writing **age/visibility** tracking: mirror Chromium's `VisibilityChanged()` semantics — arm on
  *visibility*, not mount. A surface rendered hidden then revealed must re-arm.

## The 500ms constant

The Age cooldown default is **500ms**. Two independent sources landed near it: Chromium's double-click
interval and the CLS `hadRecentInput` exclusion window. Treat this as a *reasonable default*, not gospel —
the stated motor-planning window is 150–300ms, so 500ms is deliberately generous to protect false
positives. It is configurable, and Age is report-mode by default precisely because it is the
tuning-sensitive policy.
