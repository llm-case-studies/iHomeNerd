# Results — Android Uniform Web Serving

**Date:** 2026-05-02  
**Branch:** `feature/android-uniform-web-serving`  
**Branch tip:** `759edd0`  
**Key implementation commit:** `2185c43`  
**Validation lane:** `wip/testing`  
**Build/deploy host:** `iMac-macOS`  
**Testing/evidence host:** `iMac-Debian`

## Verdict: PASS

The Android node serves the real bundled Command Center honestly. SPA routes
behave consistently. Missing assets fail clearly (404). Existing runtime and
setup endpoints show no regression.

## Device

- **Model:** motorola edge (2021)
- **Serial:** `ZY22GQPKG6`
- **Android version:** 12 (SDK 31)
- **Arch:** arm64-v8a
- **RAM:** ~7.7 GB
- **LAN IP:** `192.168.0.246`

## Validation results

| Path                          | Port | Status | Notes |
|-------------------------------|------|--------|-------|
| `/`                           | 17777| 200    | Real bundled Command Center `index.html` served. Identified by `<title>iHomeNerd — Command Center</title>` and real asset references (`/assets/index-CMo4JpaA.js`). NOT a synthetic or degraded page. |
| `/app`                        | 17777| 200    | Same real SPA `index.html` served via SPA fallback route. Content identical to `/`. |
| `/some/deep/link`             | 17777| 200    | Same real SPA `index.html` served via SPA fallback. `diff` confirms content identical to `/`. |
| `/assets/does-not-exist.js`   | 17777| 404    | Returns `Not found` with `Content-Type: text/plain; charset=utf-8`. Missing assets fail honestly — no synthetic placeholder or fake SPA fallback. |
| `/health`                     | 17777| 200    | Valid JSON. `ok: true`, runtime running. |
| `/discover`                   | 17777| 200    | Valid JSON. Node advertised with capabilities and network transport. |
| `/capabilities`               | 17777| 200    | Valid JSON with full `_detail` shape including capability metadata, backends, tiers. |
| `/setup/trust-status`         | 17778| 200    | Valid JSON. `status: trusted`, Home CA and server cert present. Bootstrap channel intact on `:17778`. |

All paths were verified both through `adb forward` (127.0.0.1:37779/37780) and
via direct LAN access (192.168.0.246:17777/17778). Results were identical.

## Ambiguity resolution: missing bundled assets → 503 or 200?

**The two code paths behave differently, and neither was directly observable
because assets ARE bundled in this build.** Here is the resolved answer based
on code inspection (`LocalNodeRuntime.kt` at `2185c43`):

| Endpoint type                     | When bundled assets missing | HTTP code | Response                          |
|-----------------------------------|----------------------------|-----------|-----------------------------------|
| `/` (root/index)                  | `commandCenterIndexResponse()` | **200** | `htmlResponse(degradedCommandCenterHtml())` — honest HTML page stating "Command Center Unavailable" |
| `/app`, `/some/deep/link` (SPA)   | `commandCenterRouteResponse()` | **503** | `textResponse(503, "Command Center not available - web assets not bundled")` — plain text error |

**Observed answer: it depends on the route.** The `/` endpoint degrades to HTTP
200 with an honest error page. SPA deep links return HTTP 503 with a plain-text
error. This is because `commandCenterRouteResponse()` performs a bundled-index
existence check before delegating to `commandCenterIndexResponse()` — and
returns 503 directly when the index is not found, while
`commandCenterIndexResponse()` itself uses `serveBundledCommandCenterAsset`
which falls through to `degradedCommandCenterHtml()` as a 200 response.

In the current build (assets bundled), all routes served the real SPA with 200.

## Regression check: `:17777` / `:17778`

No regression observed. Both ports serve correctly:
- `:17777` — real Command Center SPA + JSON endpoints (`/health`, `/discover`, `/capabilities`)
- `:17778` — setup/bootstrap endpoints (`/setup/trust-status`)

The serving contract change (commit `2185c43`) did not alter the port assignments
or disrupt any existing endpoint behavior.

## Build details

- **Build:** PASSED on iMac-macOS (`./gradlew assembleDebug`)
- **APK:** `app/build/outputs/apk/debug/app-debug.apk`
- **Install:** PASSED (`adb install -r` to ZY22GQPKG6)
- **Runtime launch:** PASSED (local runtime started via `am start --ez start_local_runtime true`)

## Summary

- Android serves the **real** bundled Command Center (not a synthetic placeholder)
- SPA deep links consistently return the same real SPA entry point
- Missing assets return honest 404 (not a fake SPA or silent degradation)
- `/` vs `/app` vs SPA deep links are all consistent when assets are present
- `:17777` and `:17778` remain healthy with no regression
- The "503 vs 200" ambiguity is resolved: it's both, depending on route type
