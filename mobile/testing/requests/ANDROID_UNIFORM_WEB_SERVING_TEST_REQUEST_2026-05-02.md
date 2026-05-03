# Android Uniform Web Serving Test Request

**Date:** 2026-05-02  
**Requester:** Alex / Codex  
**Target branch:** `feature/android-uniform-web-serving`  
**Validation lane:** `wip/testing`  
**Primary build/deploy host:** `iMac-macOS`
**Implementation status:** committed, build passed, smoke blocked (needs adb)

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
- **Smoke test**: BLOCKED (adb not available on iMac)

## Manual smoke test required

Due to adb unavailability on iMac-macOS, manual validation required. Run these steps:

```bash
# 1. Install APK (manually or via Android Studio)
adb install -r app/build/outputs/apk/debug/app-debug.apk

# 2. Start runtime, then probe:
adb forward tcp:37779 tcp:17777
adb forward tcp:37780 tcp:17778

curl -skI https://127.0.0.1:37779/
curl -skI https://127.0.0.1:37779/app
curl -skI https://127.0.0.1:37779/some/deep/link -  # Should get honest fail if no bundled assets
curl -skI https://127.0.0.1:37779/assets/does-not-exist.js -  # Should 404

# Setup channel still works:
curl -s http://127.0.0.1:37780/setup/trust-status | python3 -m json.tool
curl -s --insecure https://127.0.0.1:37779/health | python3 -m json.tool

# Check that degraded page shows "Command Center Unavailable" when no bundled assets:
curl -sk https://127.0.0.1:37779/ | grep -i "unavailable"
```

## Expected results

- `/` serves bundled index.html if present, degraded page if not - both honest
- `/app` same as `/`
- Missing assets return 404 (not a fake SPA)
- `:17777` serves web, `:17778` serves setup - unchanged
- `/health`, `/discover`, `/capabilities`, `/setup/trust-status` still work