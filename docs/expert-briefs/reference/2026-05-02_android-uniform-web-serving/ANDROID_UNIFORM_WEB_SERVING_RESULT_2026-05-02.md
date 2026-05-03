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
- **smoke-tested device(s): PASSED** — physical device `ZY22GQPKG6` via `iMac-macOS` ADB
- **build/deploy host:** `iMac-macOS`
- **APK:** `app/build/outputs/apk/debug/app-debug.apk` (589MB)

The build passes and smoke test is fully verified on-device.

### Smoke test verification:
1. `curl -sk https://127.0.0.1:37779/` serves the real bundled Command Center `index.html`
2. `curl -sk https://127.0.0.1:37779/app` and `curl -sk https://127.0.0.1:37779/some/deep/link` successfully return the `index.html` via SPA fallback
3. `curl -sk https://127.0.0.1:37779/assets/does-not-exist.js` accurately returns `404 Not found` (preventing fake SPA behavior on missing assets)
4. `curl -sk https://127.0.0.1:37779/health` and `curl -sk https://127.0.0.1:37779/setup/trust-status` still function and return correct JSON.

## Testing request updated

Updated: `mobile/testing/requests/ANDROID_UNIFORM_WEB_SERVING_TEST_REQUEST_2026-05-02.md`

## Risks / open questions

- When bundled Command Center assets are missing (e.g., failed build step), the exact rendering of `degradedCommandCenterHtml()` should be manually confirmed by the next tester. Current testing validated the happy path where bundled assets were successfully found.
- Note: `curl -I` returns `404` for the primary paths since `LocalNodeRuntime` does not actively implement the `HEAD` HTTP method. Normal `GET` commands respond appropriately.

## Branch state

```
Local (Acer-HL):  feature/android-uniform-web-serving -> origin/main (rebased)
Remote origin:      feature/android-uniform-web-serving -> cfb7bee (via SCP copy)
iMac-macOS:       feature/android-uniform-web-serving -> origin/main + LocalNodeRuntime.kt changes applied, build passed
```