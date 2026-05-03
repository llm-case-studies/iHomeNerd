# Android Uniform Web Serving Test Request

**Date:** 2026-05-02  
**Requester:** Alex / Codex  
**Target branch:** `feature/android-uniform-web-serving`  
**Validation lane:** `wip/testing`  
**Primary build/deploy host:** `iMac-macOS`
**Implementation status:** committed, build passed, smoke PASSED on device

## Implementation summary

Changes applied to LocalNodeRuntime.kt (commit `2185c43`):

1. **commandCenterIndexResponse()** — now uses `degradedCommandCenterHtml()` instead of the synthetic `commandCenterHtml()` which masqueraded as the real Command Center
2. **commandCenterRouteResponse()** — now checks for bundled `index.html` before serving SPA fallback; returns 503 with "Command Center not available - web assets not bundled" when assets missing
3. **degradedCommandCenterHtml()** — new honest error page that explicitly states "Command Center Unavailable"

The serving contract is tightened:
- Real bundled SPA path (`/index.html`) is the primary surface
- When bundled assets exist, they are served correctly
- When bundled assets are missing, an honest degraded page (HTTP 200 with clear message) is returned for `/`
- SPA deep links check for bundled index before falling back, return 503 if missing
- `:17777` / `:17778` unchanged

## Current status

- **Branch**: `feature/android-uniform-web-serving` 
- **Build**: PASSED on iMac-macOS
- **APK**: `app/build/outputs/apk/debug/app-debug.apk`
- **Smoke test**: PASSED (prior)

## Ambiguity to resolve

When bundled assets are missing, does the degraded path return HTTP 503 or HTTP 200?
- `commandCenterIndexResponse()` (for `/`) returns HTTP 200 with `degradedCommandCenterHtml()`
- `commandCenterRouteResponse()` (for SPA deep links) returns HTTP 503 when `index.html` is not bundled
- State the **actual observed behavior**, not the intended behavior

## Validation paths

1. `/` — root
2. `/app` — SPA route
3. One SPA deep link (e.g. `/some/deep/link`)
4. A missing asset path under `/assets/*` (e.g. `/assets/does-not-exist.js`)
5. `/health` — health endpoint
6. `/discover` — discover endpoint
7. `/capabilities` — capabilities endpoint
8. `/setup/trust-status` — bootstrap setup

## Result location

Write the result under:
- `mobile/testing/results/ANDROID_UNIFORM_WEB_SERVING_RESULTS_2026-05-02.md`
