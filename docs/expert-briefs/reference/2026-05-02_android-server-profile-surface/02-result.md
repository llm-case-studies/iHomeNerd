# Result — Android Server Profile Surface

## Summary

- branch: `feature/android-server-profile-surface`
- host: `Acer-HL` (code) / `iMac-macOS` (build + smoke)
- scope implemented: server readiness JSON in `/system/stats` + `/health`, native UI card in "This node" tab
- **build status: build-ready and smoke-tested on `M-E-21` (Motorola Edge 2021)**

## What changed

- **`LocalNodeRuntime.kt`**: Added `isCharging`, `chargingSource`, `isBatteryOptimizationExempt` fields to `LocalRuntimeState`. Added `detectCharging()`, `detectChargingSource()`, `detectBatteryOptimizationExempt()` detection methods. Added `serverReadinessJson()` builder method. Injected `server_readiness` block into `systemStatsJson()` and `healthJson()`. Populated charging/power state at `start()` and cleared it at `stop()`.

- **`IhnHomeApp.kt`**: Added `ServerReadinessCard` composable displaying four readiness chips (Charging, Network, Serving, Battery Opt) with color-coded indicators and contextual warning text. Added `ReadinessChip` helper composable. Card appears in the "This node" tab between `LocalRuntimeCard` and the gateway section.

- **`IhnGatewayRepository.kt`** (new): Created the missing `com.ihomenerd.home.data` package with all data classes and repository previously missing from this branch. This was a pre-existing gap on the branch that blocked compilation.

- **`ANDROID_SERVER_PROFILE_SURFACE_TEST_REQUEST_2026-05-02.md`**: Refined with exact probing commands, JSON schema for `server_readiness`, truthfulness test steps (plug/unplug device), battery optimization test steps, and detailed pass/fail criteria.

## Files touched

- `.gitignore` — added exception so the `data/` Java package is not blocked by the root `data/` gitignore rule
- `mobile/android/ihn-home/app/src/main/java/com/ihomenerd/home/runtime/LocalNodeRuntime.kt`
- `mobile/android/ihn-home/app/src/main/java/com/ihomenerd/home/ui/IhnHomeApp.kt`
- `mobile/android/ihn-home/app/src/main/java/com/ihomenerd/home/data/IhnGatewayRepository.kt` (new — recovered from iMac build host)
- `mobile/testing/requests/ANDROID_SERVER_PROFILE_SURFACE_TEST_REQUEST_2026-05-02.md`
- `docs/expert-briefs/reference/2026-05-02_android-server-profile-surface/02-result.md` (this file)

## Build and smoke test results

### Build

- **Host**: `iMac-macOS` (192.168.0.117)
- **Command**: `./gradlew assembleDebug`
- **Result**: `BUILD SUCCESSFUL` in 21s, 36 actionable tasks
- **Warnings**: only pre-existing Kotlin deprecation/unnecessary-safe-call warnings, none from this sprint

### Pre-existing build blocker fixed

The `com.ihomenerd.home.data` package (containing `GatewaySnapshot`, `IhnGatewayRepository`, `DiscoveryInfo`, etc.) was missing from this branch. It existed on the iMac from a prior rsync but was never committed to git. The package was recreated from the iMac copy and committed as part of this sprint.

### Smoke test

- **Device**: `M-E-21` (Motorola Edge 2021, `ZY22GQPKG6`, Android 12, arm64-v8a, 7.7 GB RAM)
- **Install**: `adb install -r` succeeded
- **Launch**: App started, runtime came up, serving on :17777 and :17778
- **`/health`**: Returns `ok: true` with full `server_readiness` block containing:
  - `is_charging: true`, `charging_source: "usb"` (correct — connected via USB to iMac)
  - `battery_percent: 81`, `battery_temp_c: 24`
  - `battery_optimization_exempt: false`
  - `readiness_level: "degraded"` (correct — battery optimization not exempted)
  - `readiness_notes: ["Battery optimization is not exempted for this app..."]`
  - `runtime_running: true`, `ports_serving: [17777, 17778]`, `network_ready: true`
- **`/system/stats`**: Includes same `server_readiness` block
- **`/capabilities`**, **`/discover`**, **`/setup/trust-status`**: All respond correctly — no regression
- **No crash** observed on launch or during endpoint probing

## What was intentionally not done

- No new endpoints were added. Server readiness is exposed within existing `/system/stats` and `/health`.
- No periodic background polling of battery/charging state. State is captured at runtime start and on each API request.
- No modifications to the Android manifest (no new permissions required).
- No changes to `NodeRuntimeService` or the foreground service behavior.
- No UI changes to Trust, Models, or Session tabs.

## Testing request prepared

Updated at:
- `mobile/testing/requests/ANDROID_SERVER_PROFILE_SURFACE_TEST_REQUEST_2026-05-02.md`

The test request now includes exact `curl` commands, the `server_readiness` JSON schema, plug/unplug truthfulness steps, battery optimization verification steps, and regression checks for `:17777` / `:17778`. The testing lane is `iMac-Debian` / `wip/testing`; the branch is smoke-ready for handoff.

## Risks / open questions

- Battery optimization exemption status may read as `null` on API levels where `PowerManager.isIgnoringBatteryOptimizations()` behaves differently (should report correctly on API 23+).
- `detectCharging()` and `detectChargingSource()` register a null BroadcastReceiver for the sticky `ACTION_BATTERY_CHANGED` intent. This is the same pattern already used by `detectBatteryTemperatureC()` and is safe.
- The server readiness card reads from `LocalRuntimeState` which is captured at runtime start. If charging state changes while the runtime is running (e.g., user unplugs cable), the UI won't update until the runtime is restarted or the screen is revisited. A future enhancement could add periodic state refresh.
- The `sherpa-onnx-1.12.40.aar` file is gitignored and not in the repo. The iMac build used a stub AAR created on-the-fly to satisfy the Gradle dependency. Real ASR functionality needs the actual AAR file placed in `libs/` for production builds. This is a pre-existing gap, not introduced by this sprint.
