# Expert Brief — iOS Uniform Web Serving

**Date:** 2026-05-03
**Audience:** OpenCode coding agent (`Qwen` and `DeepSeek` are both reasonable candidates; pick at handoff time based on availability)
**Status:** active sprint

## Why this sprint exists

The iOS NodeRuntime currently serves an 8-line stub HTML at `/`:

```swift
nonisolated private static func indexHTML(_ s: RuntimeSnapshot) -> String { ... }
// returns about 6 lines of "iOS NodeRuntime stub. Try /discover · /health."
```

That's wrong for a node whose product surface is the Command Center SPA. A household device opening `https://<iphone-ip>:17777/` should land on the real SPA, not a debug page.

Android landed bundled-SPA serving on 2026-05-02 (`feature/android-uniform-web-serving` → main as `2185c43`). This sprint brings iOS to parity.

This sprint should tighten the iOS serving contract instead of redesigning the app.

## Execution Fence

- Repo: `iHomeNerd`
- Implementation host: `Acer-HL` (or any host with Swift-aware tooling; Xcode not required just to edit)
- Base branch: `origin/main`
- Working branch: `feature/ios-uniform-web-serving`
- Merge target when validated: `main`
- Validation lane: `wip/testing`
- iOS build/deploy host: `mac-mini` (has Xcode, has iPhone 12 PM paired at `192.168.0.220`)

## References

Read these first:

- `docs/ARCHITECTURE_NODE_PARITY.md` (on `feature/uniform-web-ui`) — §2 (menu vs lab), §6 (per-platform state)
- `docs/expert-briefs/examples/2026-05-02_android-uniform-web-serving/` — the Android analogue this sprint mirrors
- `docs/expert-briefs/README.md` — sprint workflow rules
- `docs/MOBILE_STRATEGY_2026-04-24.md`

Relevant iOS sources:

- `mobile/ios/ihn-home/IhnHome/Runtime/NodeRuntime.swift` — primary file. Routing dispatch is around lines 340–395; current stub `indexHTML` is around line 840.
- `mobile/ios/ihn-home/IhnHome/Resources/Info.plist` — bundle resources are declared / picked up here
- `mobile/ios/ihn-home/project.yml` — XcodeGen project spec; Resources path lives under `IhnHome/`

The frontend bundle (the canonical SPA) is at `backend/app/static/{index.html, assets/*}`. The build pipeline that copies this into iOS Resources is a separate concern owned by Codex on `iMac-macOS` (sprint pending). For this sprint, assume the bundled assets will live at `IhnHome/Resources/Console/{index.html, assets/*}` and write the serving code against that contract.

## Feature goal

Make iOS web serving uniform with Android.

Smallest acceptable shape:

- when bundled SPA assets are present at `IhnHome/Resources/Console/`:
  - `GET /` → return `Console/index.html`
  - `GET /index.html` → same
  - `GET /assets/<path>` → return the matching file from `Console/assets/<path>`, with correct MIME type
  - `GET <other-non-api-path>` → SPA fallback, return `Console/index.html` (so React Router can take over)
- when bundled SPA assets are **missing** (e.g., the build pipeline hasn't run):
  - return an honest degraded page that says "Console assets not bundled in this build" — do not fall back to a synthetic "looks like the real thing" placeholder
- existing routes remain untouched: `/discover`, `/health`, `/capabilities`, `/system/stats`, `/v1/*`, `/setup/*` (the last on the bootstrap port `:17778`)

If helpful, you may also expose a small `/lab/dashboard` route returning the platform-specific iOS info (loaded models, MLX memory state) — this matches the menu-vs-lab framing in the architecture doc, but is **not required** for this sprint. Stay narrow if unsure.

## Acceptable implementation scope

Choose the smallest sensible slice that creates real value. Good examples:

- new helper `serveBundledConsoleAsset(path:)` in `NodeRuntime.swift` that reads from `Bundle.main.url(forResource: path, withExtension: nil, subdirectory: "Console")` and returns 200 with the right MIME type, or `nil` if not found
- routing tweak in `respond(to:snapshot:)` so that `GET /` and SPA-fallback paths go through the new helper before the stub fallback
- explicit honest degraded HTML for the missing-assets case
- a small comment near the route table noting the precedence: bundled-asset → API-namespace → SPA-fallback → 404

Do **not** turn this into:

- a Swift package extraction
- a generic webserver refactor
- new SwiftUI screens (this is HTTP-side; iOS native UI is out of scope for this sprint)
- adding `/v1/*` endpoints
- model / chat / Whisper changes

## Build and smoke expectations

Before handing off to testing:

1. branch builds (`xcodebuild -scheme IhnHome -destination "generic/platform=iOS Simulator"` is sufficient as a sanity check; full device build optional)
2. orchestrate iOS build/deploy on `mac-mini` if you want a real-device smoke pass
3. verify at minimum:
   - app installs / launches
   - runtime starts on `:17777`
   - `GET /` returns the SPA HTML when `Console/index.html` is present in the bundle
   - `GET /` returns the honest degraded page when `Console/` is empty / missing
   - `GET /assets/<known-asset>` returns 200 with correct MIME type
   - `GET /v1/chat` and other API endpoints unchanged
   - `GET /setup/*` on `:17778` unchanged

Useful build/deploy commands:

```bash
ssh mac-mini-m1
cd ~/Projects/iHomeNerd/mobile/ios/ihn-home
git fetch origin
git checkout feature/ios-uniform-web-serving
xcodebuild -project IhnHome.xcodeproj -scheme IhnHome \
  -destination "generic/platform=iOS Simulator" \
  -configuration Debug -derivedDataPath ./build -skipMacroValidation build
# device install: see docs/development/IOS_DEVICE_INSTALL_*.md if present
```

To set up bundled SPA assets for the build (since the pipeline sprint is independent):

```bash
# from repo root, after a frontend build has been run:
mkdir -p mobile/ios/ihn-home/IhnHome/Resources/Console
cp -R backend/app/static/. mobile/ios/ihn-home/IhnHome/Resources/Console/
# then add Resources/Console to the Xcode target via project.yml or Xcode UI
```

## Deliverables

Required:

1. implementation on `feature/ios-uniform-web-serving`
2. concise result note using `02-result-template.md`
3. a concrete validator handoff at:
   - `mobile/testing/requests/IOS_UNIFORM_WEB_SERVING_TEST_REQUEST_2026-05-03.md`

If you choose **not** to bundle SPA assets in this sprint (because the build pipeline sprint hasn't landed yet), ship the serving code anyway — the missing-assets fallback path is half the contract, and once the pipeline lands the serving code lights up automatically.

## Done means

- code committed on the named branch
- result note explains what changed and what was deliberately left for the build-pipeline sprint
- branch is build-ready (simulator-build green at minimum)
- testing request tells the next validator exactly what to try, including how to set up bundled assets manually for testing if the build pipeline isn't in place yet

## If you think the approach is wrong

We genuinely want pushback on:

- whether the missing-assets fallback should be a degraded HTML page or a 503
- whether `Console/` is the right Resources subdirectory name (matches Android's `assets/console/` convention)
- whether SPA-fallback for unknown GET paths is right, or if it should 404 (lean: fallback, but if your read of `react-router` says otherwise, tell us)
- whether the optional `/lab/dashboard` route should be in this sprint or its own follow-up

Reply on the branch with your judgment before implementing if any of those land as substantively wrong.
