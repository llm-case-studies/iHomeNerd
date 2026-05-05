# Expert Brief - Android Build Provenance Surface

**Date:** 2026-05-05
**Initiative:** `android-node-core`
**Status:** active sprint
**Audience:** OpenCode implementer on `Acer-HL`

## Why This Sprint Exists

Recent Android validation exposed a core truthfulness gap.

Three devices could all claim to be:

- `0.1.0-dev-android`

while still differing materially on:

- bundled Command Center assets
- ASR prerequisite assets
- effective behavior and available capabilities

The operator-side workflow is now better, but the product still hides this
difference. Testers and client apps need a first-class provenance signal.

## Execution Fence

- Repo: `iHomeNerd`
- Base branch: `origin/main`
- Working branch: `feature/android-node-core/build-provenance-surface`
- Merge target: `main` after validation
- Implementation host: `Acer-HL`
- Build/deploy host: `iMac-macOS`
- Validation host: `iMac-Debian`

## References

Read these first:

- `docs/expert-briefs/initiatives/android-node-core/README.md`
- `docs/expert-briefs/initiatives/android-node-core/INDEX.md`
- `docs/expert-briefs/initiatives/android-node-core/active/2026-05-05_android-build-provenance-surface/README.md`
- `mobile/android/ihn-home/app/build.gradle.kts`
- `mobile/android/ihn-home/app/src/main/java/com/ihomenerd/home/runtime/LocalNodeRuntime.kt`

## Product Goal

Add a compact, honest build provenance surface to Android runtime JSON so
operators and tests can distinguish:

- same semantic app version
from
- same actual APK/build baseline

and can also see whether major bundled prerequisites are present.

## Required Runtime Shape

Add a new nested object such as `build_provenance` or similarly clear naming to:

- `/health`
- `/system/stats`

It should include enough information to answer:

1. what build/revision produced this APK?
2. what human-readable app version is this?
3. are bundled Command Center assets present?
4. are major ASR assets present?
5. is the runtime in a degraded capability state because required assets are
   absent?

The shape does not need to be huge. It does need to be explicit and stable.

## Strong Candidate Fields

These are not mandatory exact names, but the branch should expose equivalents:

- semantic version
- Android versionCode/versionName or equivalent build identifiers
- build revision / git SHA / source revision when available
- bundled web assets present: true/false
- one or two concrete web-asset hints:
  - `index.html` present
  - assets directory present
- ASR prerequisite present: true/false
- one or two concrete ASR hints:
  - expected model asset directory present
  - required runtime support present if observable at runtime

If the git SHA cannot be embedded cleanly right now, do not fake it. Surface the
best honest provenance available and document the gap.

## Likely Implementation Direction

This sprint probably needs both:

1. build-time metadata exposure
2. runtime asset presence detection

The simplest honest path may be:

- add build metadata through Gradle/BuildConfig
- add runtime checks in `LocalNodeRuntime.kt` for:
  - bundled `index.html` / assets presence
  - Android ASR model asset directory presence

Do not over-engineer this into a generic asset scanner.

## Out Of Scope

- changing the canonical APK build workflow itself
- redesigning `/health`
- redesigning `/system/stats`
- Android NSD/mDNS work
- new client app features
- provider selection changes
- frontend redesign

## Done Means

- `/health` contains explicit Android build provenance information
- `/system/stats` contains the same or a superset of that provenance
- bundled web asset presence is visible
- major ASR prerequisite presence is visible
- branch builds on `iMac-macOS`
- app installs and launches on at least one Android device
- smoke confirms the provenance fields are truthful
- result.md is filled and branch is pushed
