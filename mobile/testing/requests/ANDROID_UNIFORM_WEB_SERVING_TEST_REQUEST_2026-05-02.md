# Android Uniform Web Serving Test Request

**Date:** 2026-05-02  
**Requester:** Alex / Codex  
**Target branch:** `feature/android-uniform-web-serving`  
**Validation lane:** `wip/testing`  
**Primary build/deploy host:** `iMac-macOS`
**Implementation status:** committed, build passed, smoke PASSED on device

## Implementation summary (updated after rebase onto origin/main)

Changes applied to LocalNodeRuntime.kt (commit `2185c43` rebased):

1. **commandCenterIndexResponse()** — now uses `degradedCommandCenterHtml()` instead of the synthetic `commandCenterHtml()` which masqueraded as the real Command Center
2. **commandCenterRouteResponse()** — now checks for bundled `index.html` before serving SPA fallback; returns 503 with "Command Center not available - web assets not bundled" when assets missing
3. **degradedCommandCenterHtml()** — new honest error page that explicitly states "Command Center Unavailable"

The serving contract is tightened:
- Real bundled SPA path (`/index.html`) is the primary surface
- When bundled assets exist, they are served correctly
- When bundled assets are missing, an honest degraded page (HTTP 200 with clear message) is returned
- SPA deep links check for bundled index before falling back, fail honestly if missing
- `:17777` / `:17778` unchanged

## Current status

- **Branch**: `feature/android-uniform-web-serving` (rebased onto origin/main `cfb7bee`)
- **Build**: PASSED on iMac-macOS
- **APK**: `app/build/outputs/apk/debug/app-debug.apk` (589MB)
- **Smoke test**: PASSED on physical device (`ZY22GQPKG6` via iMac-macOS ADB)

## Smoke test results

The physical device validation confirms:

1. **`/`** and **`/app`** correctly serve the real bundled Command Center `index.html` when assets are present.
2. **SPA deep links** (e.g., `/some/deep/link`) correctly serve the `index.html`.
3. **Missing assets** (e.g., `/assets/does-not-exist.js`) correctly fail with `404 Not found` instead of returning a synthetic placeholder.
4. **Existing endpoints** (`/health`, `/discover`, `/capabilities`, `/setup/trust-status`) continue to function correctly and remain structurally unharmed.

*(Note: `curl -I` returns `404` for paths like `/` because `LocalNodeRuntime` only supports `GET`/`POST`/`OPTIONS`, not `HEAD`. Normal `GET` requests work exactly as specified.)*

## Expected results
All expectations met. Android serves the real bundled Command Center and missing asset behavior is strictly honest. No regressions found on JSON endpoints or setup port.