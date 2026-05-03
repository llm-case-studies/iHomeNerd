# Test Request — iOS Uniform Web Serving

**Date issued:** 2026-05-03 (stub — implementer should refine before handoff)
**Branch:** `feature/ios-uniform-web-serving`
**Validator host:** `iMac-Debian` / `wip/testing`
**Target device:** iPhone 12 PM (`192.168.0.220:17777`) — must be on LAN with Hosting toggle on

## What you're validating

That the iOS NodeRuntime now serves the real Command Center SPA at `/` (when bundled), serves `/assets/*` correctly, falls through SPA-style for non-API paths, and degrades honestly when bundled assets are missing.

## Prerequisites on the iPhone

1. Install the build from `feature/ios-uniform-web-serving`.
2. Open the app, toggle **Hosting iHN node** on (or — if Auto-resume is working — confirm hosting started automatically).
3. Confirm `/health` answers: `curl -sk https://192.168.0.220:17777/health | python3 -m json.tool`.
4. Two test scenarios:
   - **A. Bundled assets present** — implementer confirms the build included `Resources/Console/`. The result note should say so.
   - **B. Bundled assets missing** — implementer confirms a build was made without `Resources/Console/`, or the implementer can describe how to reproduce locally.

## Probe checklist

```bash
export IHN_IOS=https://192.168.0.220:17777

# Scenario A — assets present
curl -sk -o /tmp/index.html -w '%{http_code} %{content_type}\n' "$IHN_IOS/"
# expect: 200 text/html; first 100 bytes should match backend/app/static/index.html

curl -sk -o /tmp/asset.js -w '%{http_code} %{content_type}\n' "$IHN_IOS/assets/<a-real-bundled-asset>"
# expect: 200 application/javascript or text/css per the file extension

curl -sk -w '%{http_code}\n' "$IHN_IOS/some-deep-spa-path"
# expect: 200 — SPA fallback returns index.html so React Router can take over

# Scenario B — assets missing
curl -sk "$IHN_IOS/" | head -20
# expect: an honest degraded page mentioning "Console assets not bundled"
# NOT a synthetic dashboard pretending to be the real thing
```

## Regression checklist (must remain green)

```bash
curl -sk "$IHN_IOS/v1/chat" -X POST -H 'Content-Type: application/json' -d '{"prompt":"hi"}' | python3 -m json.tool
curl -sk "$IHN_IOS/v1/models" | python3 -m json.tool
curl -sk "$IHN_IOS/capabilities" | python3 -m json.tool
curl -sk "$IHN_IOS/system/stats" | python3 -m json.tool
curl -sk "http://192.168.0.220:17778/setup/trust-status" | python3 -m json.tool
```

## Pass criteria

- Scenario A: `/` returns the SPA, `/assets/<file>` returns assets, SPA-fallback works.
- Scenario B: `/` returns an honest degraded page; no synthetic dashboard.
- Regression: all `/v1/*`, `/capabilities`, `/system/stats`, `/setup/trust-status` continue to respond as they did pre-sprint.

## Fail criteria

- Any of the existing endpoints regresses.
- Scenario B falls back to a synthetic placeholder.
- App crashes when assets are missing.
- MIME types wrong (e.g., JS served as `text/plain`).

## What to record

- Output of every command above in the result file under `mobile/testing/results/`.
- Diffs vs. backend's `/` response (the canonical SPA bytes are in `backend/app/static/index.html`).
- Any unexpected MIME types or routing surprises.

## Next-step hint if validation fails

- Tighten `serveBundledConsoleAsset` MIME-type table.
- Re-check `Bundle.main.url(forResource:withExtension:subdirectory:)` casing.
- Verify Xcode target actually copies `Resources/Console/` into the bundle (XcodeGen `project.yml` may need `directoryReferences: true`).
