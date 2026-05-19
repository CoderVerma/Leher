# Counter App

A React Native counter with two swappable implementations — one built entirely in JavaScript, one backed by a C++ TurboModule via JSI. Both share the same UI and expose the same behaviour: bonus increments, a floor at zero, idle auto-decrement, animated reset, long-press fast-counting, and a recent-value history log.

---

## Screenshots

<!-- Replace the URL below with your actual screenshot -->
![App Screenshot](https://drive.google.com/file/d/1w_AAZgrYJnddcZGqAQM5zOLsiIgeYrE_/view?usp=sharing)

---
## How the logic is structured

The app is split into three layers.

### UI layer — shared by both modes

```
CounterScreen
  ├─ JsCounterContainer     → useCounter()       → CounterView
  └─ NativeCounterContainer → useNativeCounter() → CounterView
```

`CounterScreen` owns a single boolean (`useNative`) and mounts one of two thin container components based on it. Swapping containers is necessary because React's rules forbid calling hooks conditionally. Each container calls its own hook and passes the result to `CounterView`, which is a pure presentation component — it renders whatever props it receives and knows nothing about where those props came from.

`CounterButton` is wrapped in `React.memo`. Its props are stable `useCallback` references, so the buttons do not re-render during count animations — only when `isResetting` changes.

### Logic layer — two hooks, same contract

Both `useCounter` and `useNativeCounter` return an identical object shape:

```ts
{
  count, pressCount, isResetting, isIdle, stepsUntilBonus, history,
  increment, decrement, reset, startFastIncrement, stopFastIncrement
}
```

`useCounter` owns all state in JavaScript. `useNativeCounter` delegates mutations to C++ and only manages timers, history, and React render state in JS.

### Native layer — C++ business logic + platform wrappers

`cpp/CounterCore.cpp` implements the counter rules (bonus, floor, reset) once. iOS wraps it in an Objective-C++ `@implementation`; Android re-implements the same rules in Kotlin using `AtomicInteger`. Both register under the name `"NativeCounter"` so the JS spec file resolves to whichever platform is running.

---

## Where the state is stored and why

### JavaScript mode (`useCounter`)

| What | Kind | Why |
|---|---|---|
| `count` | `useState` | Drives the counter display — must trigger re-renders |
| `pressCount` | `useState` | Drives the hint text — must trigger re-renders |
| `isResetting` | `useState` | Disables buttons and shows "Resetting…" |
| `isIdle` | `useState` | Shows the idle hint |
| `history` | `useState` | Drives the chip row |
| `countRef` | `useRef` | Interval callbacks need the current count without a stale closure; also guards `reset` and `decrement` no-ops at 0 |
| `pressCountRef` | `useRef` | Rapid taps increment this synchronously before React flushes `setPressCount`, so the bonus threshold is always computed against the real press count |
| `isUserActionRef` | `useRef` | Flags whether the next `count` change should push to history. A ref avoids the extra render that a boolean state would cause |
| Timer refs | `useRef` | Timer handles must survive renders without triggering them |
| `scheduleRef` | `useRef` | The reset interval calls `scheduleIdleTimer` on completion — a ref ensures it always points to the current closure rather than a stale one |

React state is the **display** source of truth; refs are the **computation** source of truth. They stay in sync — every `setCount` functional updater writes `countRef.current = next` before returning.

### Native mode (`useNativeCounter`)

| What | Lives in | Why |
|---|---|---|
| Counter value | C++ `std::atomic<int>` / Kotlin `AtomicInteger` | Business rules (bonus, floor) are enforced here; JS reads the result, never computes it |
| `pressCount` | C++ / Kotlin | Needed inside the bonus rule — must be co-located with `value` |
| React render state (`count`, `pressCount`) | `useState` in JS | React must own the display; updated via the `onCounterChange` event |
| `isIdle` | `useState` in JS | Timer decision is JS-side; native doesn't know about idle |
| `history` | `useState` in JS | UI concern only — not reflected in native |
| Timer handles | `useRef` in JS | Same reason as JS mode |

---

## How the TurboModule is implemented

### TypeScript spec (`src/native/NativeCounter.ts`)

This file is the single source of truth that Codegen reads to generate platform glue code:

```ts
export interface Spec extends TurboModule {
  increment(): number;   // plain number = synchronous JSI call
  decrement(): number;
  reset(): number;
  getValue(): number;
  addListener(eventName: string): void;
  removeListeners(count: number): void;
}
export default TurboModuleRegistry.getEnforcing<Spec>('NativeCounter');
```

Returning `number` (not `Promise<number>`) tells Codegen these are **synchronous** methods. Codegen uses this file to auto-generate an Objective-C protocol on iOS and a Java abstract class on Android. You never write those files by hand.

### iOS (`ios/Leher/NativeCounterModule.mm`)

- Extends `RCTEventEmitter` (gives it `sendEventWithName:` and listener lifecycle methods).
- Holds a `CounterCore _counter` instance as a member variable.
- `RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD` runs on the JS thread and returns the value directly through JSI — no async overhead.
- On init, registers a C++ lambda as the `CounterCore` onChange callback. When C++ mutates state, the lambda calls `sendEventWithName:@"onCounterChange"` to push the new value to JS.

### Android (`android/app/src/main/java/com/leher/NativeCounterModule.kt`)

- Extends the codegen-generated `NativeCounterSpec` abstract class.
- Re-implements the same business rules using Kotlin's `AtomicInteger` (the shared C++ object is not linked on Android — the logic is duplicated in Kotlin instead).
- Emits events via `RCTDeviceEventEmitter`, React Native's internal Android event bus.
- Registered through `NativeCounterPackage`, which is added to the host app's package list in `MainApplication.kt`.

---

## How data flows between native and JavaScript

### Mutation (JS → Native → JS)

```
User taps "Increment"
  │
  ▼
CounterButton.onPress
  │
  ▼
useNativeCounter.increment()
  │
  ▼  [synchronous JSI call — no bridge queue, no async]
NativeCounter.increment()
  │
  ├─ iOS:     CounterCore::increment()  →  std::atomic fetch_add
  └─ Android: AtomicInteger.addAndGet()
  │
  ▼  [onChange callback / RCTDeviceEventEmitter]
"onCounterChange" event  { value, pressCount }
  │
  ▼  [NativeEventEmitter listener in useNativeCounter]
setCount(event.value)  →  React re-render  →  screen updates
```

The round trip is synchronous on the call side (increment returns immediately with the new value) and event-driven on the display side (the screen updates when the event arrives).

### Read-only sync (`getValue`)

When the hook mounts, it seeds React state from native:

```ts
const [count, setCount] = useState(() => NativeCounter.getValue());
```

This handles the case where native state persists across a JavaScript fast-refresh reload — the UI starts from the real value rather than 0.

### Event subscription lifecycle

```
useNativeCounter mounts
  → emitter.addListener('onCounterChange', handler)
  → startObserving() called on iOS / listenerCount++ on Android

useNativeCounter unmounts
  → sub.remove()
  → stopObserving() called on iOS / listenerCount-- on Android
```

The native side checks `_hasListeners` / `listenerCount > 0` before emitting, so events are not dispatched when nothing is subscribed.

---

## Key differences between the JavaScript and native implementations

| Concern | JavaScript (`useCounter`) | Native (`useNativeCounter` + C++/Kotlin) |
|---|---|---|
| **State ownership** | All state in React `useState` / `useRef` | Counter value and pressCount live in C++ / Kotlin; JS holds only display copies |
| **Bonus rule** | `pressCountRef.current % 5 === 0` computed in JS before `setCount` | Computed inside `CounterCore::increment` / Kotlin `increment()` before the atomic add |
| **Floor at zero** | `Math.max(0, prev - 1)` in a `setCount` updater | CAS loop in C++ / `compareAndSet` in Kotlin — retries until the decrement wins or current is already 0 |
| **Reset animation** | 80 ms `setInterval` ticks down by 1 — gives a visible wind-down animation | `NativeCounter.reset()` sets both atomics to 0 instantly — no animation |
| **Synchrony** | All mutations are async state updates; UI reflects them on the next render | Mutations are synchronous JSI calls; the return value is available immediately in the same JS expression |
| **Event model** | State changes propagate through React's scheduler | State changes propagate through `NativeEventEmitter` / `RCTDeviceEventEmitter`; React scheduler still handles the final re-render |
| **Thread safety** | JS is single-threaded — no data races possible | C++ uses `std::atomic` for value/pressCount and `std::mutex` for the callback; Kotlin uses `AtomicInteger` |
| **History recording** | A `useEffect` on `count` checks `isUserActionRef` and appends | `recordHistory(newValue)` is called explicitly with the synchronous return value of each JSI call |
| **isResetting** | `true` during the animated step-down; buttons disabled | Always `false` — native reset is instant |

---

## Challenges and tradeoffs

**Stale closures in intervals.** `setInterval` callbacks capture variables at creation time. Reading `count` inside an interval sees the creation-time value. Refs solve this for synchronous reads; functional `setCount(prev => ...)` updaters solve it for mutations — they always receive the latest committed state as `prev`.

**Rapid-tap correctness.** If the user taps faster than React flushes renders, `pressCount` state lags behind. `pressCountRef.current += 1` is synchronous, so the 5th physical tap always computes step = 5 even if React is still rendering tap 3. In native mode this problem doesn't exist — the atomic increment and the modulo check happen together inside the C++/Kotlin method.

**History recording without an extra state variable.** `setHistory` cannot be called inside a `setCount` updater. A separate boolean state would trigger an extra render on every action. `isUserActionRef` (a plain ref) is set in the handler and read in a `useEffect([count])` — no extra render, no nesting. In native mode there is no such problem because the new value is available synchronously as the JSI return value, so `recordHistory(newValue)` is a direct call.

**Decrement guard at zero.** A naive implementation sets `isUserActionRef = true` then calls `setCount(Math.max(0, 0 - 1))`. Because count does not change, the `useEffect` never fires and the flag stays dirty — the next unrelated count change would falsely push a history entry. Guarding with `if (countRef.current === 0) return` eliminates this. In native mode the C++ CAS loop and the Kotlin `compareAndSet` both return 0 without emitting a change event when already at the floor, so the JS history handler simply records 0 without any dirty-flag problem.

**Codegen and dual platform maintenance.** Returning `number` instead of `Promise<number>` in the spec is what buys synchronous JSI calls — but it requires the platform implementations to run on the JS thread. iOS achieves this with `RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD`. Android's TurboModule spec enforces it automatically. The tradeoff is that any heavy computation in those methods would block the JS thread; for a simple counter this is fine. The larger maintenance tradeoff is that Android reimplements the business logic in Kotlin rather than sharing the C++ object — keeping the two implementations in sync is a manual responsibility.

**Long-press history.** Recording every fast-increment tick would flood the chip row. `stopFastIncrement` pushes a single entry for the final burst value when the finger lifts, using `countRef.current` (JS mode) or `NativeCounter.getValue()` (native mode).

---


## Running the app

> Ensure you have completed the [Set Up Your Environment](https://reactnative.dev/docs/set-up-your-environment) guide first.

**Start Metro:**
```sh
npm start
```

**Run on Android:**
```sh
npm run android
```

**Run on iOS** (first run: install pods):
```sh
bundle install
bundle exec pod install
npm run ios
```
