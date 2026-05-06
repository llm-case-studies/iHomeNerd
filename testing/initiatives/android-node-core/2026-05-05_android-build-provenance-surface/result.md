# Validation Result - Android Build Provenance Surface

**Date:** 2026-05-05
**Initiative:** `android-node-core`
**Sprint:** `2026-05-05_android-build-provenance-surface`

## Verdict

Blocked / Incomplete

## Implementation Done
- Added `buildConfig = true` and `GIT_SHA` injection via `ProcessBuilder` in `build.gradle.kts`.
- Added `buildProvenanceJson()` to `LocalNodeRuntime.kt` to check assets.
- Injected `build_provenance` into `/health` and `/system/stats`.

## Blocker

Smoke test could not be completed because SSH to `iMac-macOS` failed:
`ssh: connect to host 192.168.0.117 port 22: No route to host`

## Required Next Steps
- Verify network connectivity to `iMac-macOS` (192.168.0.117).
- Run `gradlew assembleDebug` on `iMac-macOS`.
- Install APK to a real device.
- Verify `build_provenance` fields on `/health` and `/system/stats`.
