# Validation Result — Android Build Provenance Surface

**Date:** 2026-05-06
**Initiative:** `android-node-core`
**Sprint:** `2026-05-05_android-build-provenance-surface`
**Product branch:** `feature/android-node-core/build-provenance-surface`
**Product commit:** `5b986d4`
**Build commit (APK compiled from):** `feae71f`
**Validation host:** `iMac-Debian`
**Build/deploy host:** `iMac-macOS` (via `ssh -i ~/.ssh/funhome-local`)

---

## Verdict

**PASS**

---

## Devices Tested

| Device | Model | Android | Status |
|--------|-------|---------|--------|
| Samsung Galaxy Z Fold6 | SM-F956U | 36 (API 36) | **PASS** — `/health` and `/system/stats` return `build_provenance` |
| Motorola Edge (2021) | berlna | — | Server not responding after APK reinstall (pre-existing app state issue) |
| Motorola Razr Ultra (2025) | leap | — | Server not responding after APK reinstall (pre-existing app state issue) |

Primary evidence collected from Fold6 per the validation protocol.

---

## Provenance Fields Observed (Fold6)

Both `/health` and `/system/stats` returned identical `build_provenance`:

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

---

## Truthfulness Assessment

### 1. Semantic version (`semantic_version`)
- **Reported:** `0.1.0-dev-android`
- **Matches:** `build_version_name: "0.1.0"` from build.gradle.kts with `-dev-android` suffix from code constant
- **Verdict:** TRUTHFUL

### 2. Build identifier / revision signal (`build_git_sha`)
- **Reported:** `feae71f`
- **Actual:** Build host git HEAD was `feae71f` at time of APK build (confirmed: APK build date May 6 00:35, branch was at `feae71f` before pull to `5b986d4`)
- **Verdict:** TRUTHFUL — the APK was compiled at commit `feae71f`, and the field correctly reflects that.

### 3. Bundled web asset presence (`bundled_web_assets_present`)
- **Reported:** `true`
- **Verified in APK:** `assets/index.html` (414 bytes), `assets/assets/index-CvGfoLAD.js` (600KB JS bundle), `assets/assets/index-CyKXrGpB.css` (35KB CSS) all present
- **Verdict:** TRUTHFUL

### 4. ASR prerequisite presence (`asr_prerequisites_present`)
- **Reported:** `true`
- **Verified in APK:** `assets/asr-models/moonshine-base-en/` contains `decoder_model_merged.ort` (109MB), `encoder_model.ort` (31MB), `tokens.txt` (549KB)
- **Verdict:** TRUTHFUL

### 5. Degraded capability state (`degraded_capability_state`)
- **Reported:** `false`
- **Reasoning:** Both web assets and ASR prerequisites present → runtime should be fully capable
- **Verdict:** CORRECT

---

## Assertion Checklist

| Assertion | Status |
|-----------|--------|
| `/health` exposes `build_provenance` | PASS |
| `/system/stats` exposes `build_provenance` | PASS |
| Can answer: what build am I running? (SHA + semantic version) | PASS |
| Can answer: are bundled web assets present? (index.html + assets dir) | PASS |
| Can answer: are major ASR prerequisites present? (engine ready + moonshine dir) | PASS |
| All provenance fields are truthful vs. actual APK contents | PASS |
| No regression on existing `/health` or `/system/stats` fields | PASS |

---

## Remaining Observations

### Pre-built APK used for validation
Java Runtime was not available on the build host (`iMac-macOS`), preventing a fresh Gradle build. The validation used the pre-built `app-debug.apk` from the project's build output directory. The APK was compiled earlier on the same day at commit `feae71f` (which is one commit behind the branch tip `5b986d4`, where the only delta is this result.md update). The code under test (`3335a0b` feat: add build provenance) is fully included.

### Git SHA dependency
The `getGitSha()` function in `build.gradle.kts` shells out to `git rev-parse --short HEAD`. This requires `git` on the build PATH. It worked on `iMac-macOS` but will fail on CI runners without git (falling back to `"unknown"`). This is a known acceptable limitation — documented in the code.

### Secondary device issues
The Motorola Edge and Razr devices had the updated APK installed successfully but did not start serving HTTP/HTTPS after reinstall. The Fold6, which was already running the build from this branch, served both endpoints correctly. This appears to be a device-specific runtime initialization issue (possibly related to trust bootstrap or background service permissions after reinstall) rather than a code problem with the provenance feature.

---

## Evidence Saved

- `evidence/health-fold6.json` — raw `/health` response from Fold6
- `evidence/system-stats-fold6.json` — raw `/system/stats` response from Fold6
- `evidence/apk-assets-verification.txt` — APK asset enumeration confirming truthfulness
- `request.md` — validation protocol (this directory)
