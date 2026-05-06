# Validation Result - Android Build Provenance Surface

**Date:** 2026-05-06
**Initiative:** `android-node-core`
**Sprint:** `2026-05-05_android-build-provenance-surface`
**Validator branch:** `feature/android-node-core/build-provenance-surface`

## Verdict

Pass

## Implementation Done
- Added `buildConfig = true` and injected `GIT_SHA` via a `ProcessBuilder` in `build.gradle.kts`.
- Added `buildProvenanceJson()` to `LocalNodeRuntime.kt` to check assets.
- Injected `build_provenance` into `/health` and `/system/stats`.

## Smoke Validation

- **Host:** `iMac-macOS`
- **Device Model:** Samsung Galaxy Z Fold6 (`sm-f956u`)
- **Status:** Both `/health` and `/system/stats` endpoints respond with the new `build_provenance` field.

### Exact Provenance Fields Observed

```json
"build_provenance": {
  "semantic_version": "0.1.0-dev-android",
  "build_version_code": 1,
  "build_version_name": "0.1.0",
  "build_git_sha": "feae71f",
  "bundled_web_assets_present": true,
  "web_asset_hints": {
    "index_html_present": true,
    "assets_dir_present": true
  },
  "asr_prerequisites_present": true,
  "asr_asset_hints": {
    "asr_engine_ready": true,
    "moonshine_en_dir_present": true
  },
  "degraded_capability_state": false
}
```

### Truthfulness Check
- ✅ Git SHA was properly populated as `feae71f`.
- ✅ Bundled Command Center web assets were correctly marked present.
- ✅ Android ASR assets (Moonshine EN) were correctly marked present.
- ✅ Degraded state was accurately calculated as `false` given that the prerequisite assets are available.

## Remaining Ambiguity
- The Git SHA extraction requires `git` availability during Gradle builds on the build host. This works well on `iMac-macOS` but relies on system dependencies being present for CI flows.
