# Result — Android Uniform Web Serving

**Date:** 2026-05-02  
**Branch:** `feature/android-uniform-web-serving`  
**Commit:** `21f2bf2` (committed locally, pushed to iMac via SCP)  
**Host:** `Acer-HL` → `iMac-macOS`

## Summary

- branch: `feature/android-uniform-web-serving`
- commit: `21f2bf2`
- host: `Acer-HL` (code) / `iMac-macOS` (build)
- scope implemented: tightened Android web serving contract

## What changed

1. **commandCenterIndexResponse()** — now uses `degradedCommandCenterHtml()` instead of the synthetic `commandCenterHtml()` which masqueraded as the real Command Center
2. **commandCenterRouteResponse()** — now checks for bundled `index.html` before serving SPA fallback; returns 503 with "Command Center not available - web assets not bundled" when assets are missing
3. **degradedCommandCenterHtml()** — new honest error page that explicitly states "Command Center Unavailable" and explains the bundled web interface is not present

The serving contract is now honest:
- Real bundled SPA path (`/index.html` + `/assets/*`) is the primary surface when available
- When bundled assets are missing, returns an explicit degraded page (not a fake Command Center)
- SPA deep links (`/app`, `/some/deep/link`) check for bundled index existence; fail honestly if missing
- Keep `:17777` / `:17778` serving intact

## Files touched

- `mobile/android/ihn-home/app/src/main/java/com/ihomenerd/home/runtime/LocalNodeRuntime.kt` — 41 insertions, 2 deletions

## What was intentionally not done

- No frontend redesign (per brief constraint)
- No new capability work beyond web serving contract
- No changes to setup/bootstrap channel (`:17778`)
- No modification to existing JSON endpoints

## Build and smoke notes

- build status: **BLOCKED — pre-existing broken UI code** (IhnHomeApp.kt, IhnHomeViewModel.kt reference fields that don't exist on origin/main)
- smoke-tested device(s): none (build failed)
- build/deploy host: `iMac-macOS`
- testing host: N/A (build blocked)

**Note:** Build fails due to pre-existing broken code in `IhnHomeApp.kt:1851-1863` (references to `gpuName`, `models`, `batteryPercent`, `totalStorageBytes` that don't exist in current source tree) and `IhnHomeViewModel.kt` (missing GatewaySnapshot, IhnGatewayRepository imports). This is unrelated to the web serving changes in LocalNodeRuntime.kt.

## Testing request prepared

Updated: `mobile/testing/requests/ANDROID_UNIFORM_WEB_SERVING_TEST_REQUEST_2026-05-02.md`

The implementation is committed and code changes are pushed to iMac-macOS.

## Risks / open questions

- Build must pass before smoke testing can proceed
- Pre-existing UI code breakage must be resolved on origin/main first
- When bundled Command Center assets ARE present (future: with real SPA), the serving behavior should be verified by the next tester