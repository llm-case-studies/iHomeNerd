# Result — Android Uniform Web Serving

**Date:** 2026-05-02  
**Branch:** `feature/android-uniform-web-serving` (rebased onto origin/main `cfb7bee`)  
**Commit:** `2185c43` (cherry-picked from local branch)  
**Host:** `Acer-HL` → `iMac-macOS`

## Summary

- branch: `feature/android-uniform-web-serving`
- commit: `2185c43` (rebased from `21f2bf2`)
- host: `Acer-HL` (code) / `iMac-macOS` (build)
- scope implemented: tightened Android web serving contract

## What changed

1. **commandCenterIndexResponse()** — now uses `degradedCommandCenterHtml()` instead of the synthetic `commandCenterHtml()` which masqueraded as the real Command Center
2. **commandCenterRouteResponse()** — now checks for bundled `index.html` before serving SPA fallback; returns 503 with "Command Center not available - web assets not bundled" when assets missing
3. **degradedCommandCenterHtml()** — new honest error page explicitly stating "Command Center Unavailable"

The serving contract is now honest:
- Real bundled SPA path (`/index.html` + `/assets/*`) is the primary surface
- When bundled assets are missing, returns explicit degraded page (not a fake Command Center)
- SPA deep links check for bundled index before falling back
- `:17777` / `:17778` serving unchanged

## Files touched

- `mobile/android/ihn-home/app/src/main/java/com/ihomenerd/home/runtime/LocalNodeRuntime.kt` — 41 insertions, 2 deletions

## What was intentionally not done

- No frontend redesign
- No new capability work beyond web serving contract
- No changes to setup/bootstrap channel (`:17778`)
- No modification to existing JSON endpoints

## Build and smoke notes

- **build status: PASSED**
- **smoke-tested device(s): BLOCKED** — adb not available on iMac-macOS
- **build/deploy host:** `iMac-macOS`
- **APK:** `app/build/outputs/apk/debug/app-debug.apk` (589MB)

The build passes. Smoke test requires manual validation with adb (not currently available on iMac).

## Testing request updated

Updated: `mobile/testing/requests/ANDROID_UNIFORM_WEB_SERVING_TEST_REQUEST_2026-05-02.md`

## Risks / open questions

- Smoke test must be run manually when device/adb is available
- The degraded page behavior should be verified (what shows when no bundled assets)
- When bundled Command Center IS present (future APK with real SPA), serving should be verified

## Branch state

```
Local (Acer-HL):  feature/android-uniform-web-serving -> origin/main (rebased)
Remote origin:      feature/android-uniform-web-serving -> cfb7bee (via SCP copy)
iMac-macOS:       feature/android-uniform-web-serving -> origin/main + LocalNodeRuntime.kt changes applied, build passed
```