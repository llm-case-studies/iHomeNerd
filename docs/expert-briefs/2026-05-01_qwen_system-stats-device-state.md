# Qwen Assignment — Extend `/system/stats` with iOS device-state fields

**Date issued:** 2026-05-01
**Issued by:** Claude Opus 4.7 (Mac mini / iHomeNerd workspace)
**Target copilot:** Qwen (free chat tier)
**Repo branch context:** `feature/mlx-llm-engine` at `4f27f1b` or later
**Estimated work:** one focused session, ≤30 minutes of code edits + verification

---

## 0. Why you (and the leash that comes with it)

Picking you because your Round 1 review of BugWitness flagged *implementation scaffolding* and *concrete data-shape decisions* as your strengths. That's exactly what this is: a small, fully-specified field set with no architectural choices to make. Show off your discipline; don't show off your range.

We have a working pattern for these handoffs that **only fails when copilots widen scope**. Read §1 hard fence, §6 stop conditions, §7 communication convention, §8 PR template before doing anything else.

---

## 1. Hard fence

**Edit-allowed (the only file you may modify):**
- `mobile/ios/ihn-home/IhnHome/Runtime/NodeRuntime.swift`

**Read-only (use them to understand context, do not edit):**
- `mobile/ios/ihn-home/IhnHome/Runtime/MLXEngine.swift`
- `mobile/ios/ihn-home/IhnHome/Runtime/CapabilityHost.swift`
- `mobile/testing/requests/CROSS_PLATFORM_CHAT_PERF_COMPARE_2026-05-01.md` (this is the consumer of your work — read §1 "Publishability note" and the §4.3/§4.5 tables to see why these fields matter)

**Do not:**
- Touch any file outside the edit-allowed list above. No project.yml edits, no Info.plist, no other Runtime files.
- Add tests, README updates, or progress docs. (See §7 for the one allowed exception: a single technical-recipe doc *only if* you discover non-obvious platform IP.)
- Refactor `systemStatsJson` or `appResidentBytes`. Add fields; don't restructure.
- Change any other route handler, the listener setup, or any `@Published` property.
- Create a `PR_BODY.md` or any standalone PR-description file at repo root. PR description goes in the commit message body, period.
- Add a new dependency or `import` beyond what's already there (UIKit and Foundation are already imported in this file).

---

## 2. Goal in one sentence

Extend the `/system/stats` JSON response with four iOS device-state fields — `thermal_state`, `battery_level_percent`, `is_on_ac_power`, `low_power_mode_enabled` — so DeepSeek's cross-platform perf compare can capture publishable context (was the device thermal-throttled? on battery? in low-power mode?) alongside the tok/s numbers.

---

## 3. The current shape (don't break it)

Existing builder, `NodeRuntime.swift` around line 672:

```swift
nonisolated private static func systemStatsJson(_ s: RuntimeSnapshot) -> [String: Any] {
    let uptime = max(0, Date().timeIntervalSince(s.startedAt))
    return [
        "uptime_seconds": round(uptime * 100) / 100,
        "session_count": 0,
        "app_memory_pss_bytes": appResidentBytes(),
        "connected_apps": [] as [String],
        "hostname": s.hostname,
        "product": product,
        "version": version,
    ]
}
```

The existing seven fields are part of an established contract DeepSeek's tests already assert on. Do not rename, retype, or remove any of them. Your work is **purely additive**.

---

## 4. The fields to add

Add exactly these four fields, with these names, types, and semantics. Do not invent additional fields. Do not "round up" related stats while you're in there.

### 4.1 `thermal_state` — string, never null

Map `ProcessInfo.processInfo.thermalState` to one of these four exact strings:

| `ProcessInfo.ThermalState` | JSON value |
|---|---|
| `.nominal` | `"nominal"` |
| `.fair` | `"fair"` |
| `.serious` | `"serious"` |
| `.critical` | `"critical"` |

If a future iOS version adds a case Apple hasn't defined yet, return `"unknown"`. Use a `switch` so the compiler tells you when this happens.

### 4.2 `battery_level_percent` — `Int` (0–100) or `NSNull`

`UIDevice.current.batteryLevel` returns a `Float` between 0.0 and 1.0 — but only if **battery monitoring is enabled**. If monitoring is off, it returns `-1.0` (sentinel for "unknown").

- If the value is `< 0`, emit `NSNull()` in the JSON.
- Otherwise emit `Int(round(level * 100))`.

You'll need to enable battery monitoring once. Do that **inside `start()`** (the existing method — early in it, before the listener kicks off):

```swift
UIDevice.current.isBatteryMonitoringEnabled = true
```

That's the only line you should add to `start()`. Don't reorganize anything else there.

### 4.3 `is_on_ac_power` — `Bool` or `NSNull`

Derived from `UIDevice.current.batteryState`:

| `UIDevice.BatteryState` | JSON value |
|---|---|
| `.charging` | `true` |
| `.full` | `true` |
| `.unplugged` | `false` |
| `.unknown` | `NSNull()` |

If a future case is added, return `NSNull()`.

### 4.4 `low_power_mode_enabled` — `Bool`, never null

```swift
ProcessInfo.processInfo.isLowPowerModeEnabled
```

Direct, always available, no battery-monitoring prerequisite.

---

## 5. The thread/actor question

`systemStatsJson` is `nonisolated private static`. `UIDevice.current` and `ProcessInfo.processInfo` are accessible from any thread, and the four properties used here are documented as thread-safe.

You do **not** need to:
- Hop to MainActor.
- Wrap in `Task { @MainActor in ... }`.
- Add `@MainActor` annotations.

If Swift's strict concurrency checker complains about `UIDevice.current` access in a non-isolated context, that's a known noisy diagnostic — and one of these will silence it without changing semantics:
- Read each property into a local at the top of `systemStatsJson` (idiomatic).
- Or factor a small `nonisolated private static func deviceStateFields() -> [String: Any]` helper.

Either is fine. Pick the smaller diff.

---

## 6. Stop conditions

**Stop and return what you have if any of these happen:**
- The fix needs to touch any file outside §1's edit-allowed list. Push back; don't expand scope.
- Strict concurrency complaints can't be silenced without an `@MainActor` annotation. Stop and report — don't change the function's isolation.
- `UIDevice` or `ProcessInfo` access throws a runtime error in your testing. Stop, report what you saw.

**Stop and ship the PR when all of these are true:**
- `NodeRuntime.swift` compiles cleanly under the existing project.
- `systemStatsJson` returns 11 fields total: the original 7 plus the new 4.
- Battery monitoring is enabled exactly once, in `start()`.
- A test call to `GET https://<iphone-ip>:17777/system/stats` (after you toggle Node hosting on) returns the new fields with sensible values. (You can't run this yourself — the build/install/test happens on the Mac mini after you push. Just verify your code looks right.)

---

## 7. Communication convention

When you reply, please structure your output with these section headers exactly. This separates streams that otherwise get conflated in the IDE chat pane:

```
## For You — Run This
<exact commands or actions Alex/Claude should perform; nothing else here>

## My Reasoning
<your thinking, design choices, references to docs you consulted>

## What I Built
<the diff or full file content>

## Notes / Open Questions
<anything that didn't fit; explicit "none" if none>
```

If you discover a non-obvious platform behavior worth recording (the way Kimi K2.6 documented `MLX.Memory.clearCache()` semantics in `docs/MLX_MODEL_SWITCH_MEMORY_RECIPE.md`), you may add **one** file: `docs/IOS_BATTERY_THERMAL_TELEMETRY_RECIPE.md`. Skip it if you didn't actually find anything non-obvious — empty recipe docs are worse than no recipe doc.

---

## 8. PR template

Branch off `feature/mlx-llm-engine`. Branch name: `qwen/system-stats-device-state`.

Commit subject: `iOS /system/stats: add thermal, battery, AC, low-power-mode fields`

Commit message body:
```markdown
## What

Adds four iOS device-state fields to /system/stats so DeepSeek's
cross-platform perf compare can capture publishable context
alongside tok/s measurements.

New fields:
- thermal_state: string (nominal/fair/serious/critical/unknown)
- battery_level_percent: int 0-100 or null
- is_on_ac_power: bool or null
- low_power_mode_enabled: bool

## Why

Without these fields, "iPhone got 12 tok/s" is uninterpretable.
A throttled or battery-saver run is fundamentally different from
a cool-on-AC run, and we need that context to publish numbers.

## What I touched

- mobile/ios/ihn-home/IhnHome/Runtime/NodeRuntime.swift
  - systemStatsJson: 4 new fields, all additive
  - start(): one line to enable UIDevice battery monitoring

## What I deliberately did not touch

<list the read-only files from §1; confirm you stayed in the fence>

## Notes

<any non-obvious thing about the implementation, or "none">
```

---

## 9. Returning the work

Push the branch and either open a PR against `feature/mlx-llm-engine` or paste the diff in chat. Either is fine. Build/install/live verification happens on the Mac mini (Claude or Alex will handle it).

If you got stuck, return what you have anyway with notes on where you stopped. Half-finished with clear notes is more useful than silence.
