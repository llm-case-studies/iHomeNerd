# OpenCode Kickoff - Android Build Provenance Surface

You are implementing the next sprint in the `android-node-core` initiative.

## Read First

1. `docs/expert-briefs/README.md`
2. `docs/expert-briefs/initiatives/android-node-core/README.md`
3. `docs/expert-briefs/initiatives/android-node-core/INDEX.md`
4. `docs/expert-briefs/initiatives/android-node-core/active/2026-05-05_android-build-provenance-surface/01-brief.md`
5. `testing/initiatives/android-node-core/2026-05-05_android-build-provenance-surface/request.md`

## Branch

Start from current `origin/main` and create:

```bash
feature/android-node-core/build-provenance-surface
```

Do not work on `main`.

## Task

Expose Android build provenance and bundled-prerequisite truth in runtime JSON.

Primary targets:

- `mobile/android/ihn-home/app/build.gradle.kts`
- `mobile/android/ihn-home/app/src/main/java/com/ihomenerd/home/runtime/LocalNodeRuntime.kt`

Likely supporting targets:

- `mobile/android/ihn-home/app/src/main/java/com/ihomenerd/home/runtime/AndroidAsrEngine.kt`
- any minimal helper added near runtime code to detect asset presence

## Required outcome

Add a bounded provenance block that lets validators answer:

- what build/revision is this APK from?
- are bundled Command Center assets actually present?
- are major ASR prerequisites actually present?
- is this the same APK baseline or just the same semantic version string?

The changed surface should appear in:

- `GET /health`
- `GET /system/stats`

## Host split

- Implementation host: `Acer-HL`
- Build/deploy host: `iMac-macOS`
- Validation host: `iMac-Debian`

Before handoff, orchestrate Android build/deploy smoke on `iMac-macOS`.

## Result

Fill:

```text
testing/initiatives/android-node-core/2026-05-05_android-build-provenance-surface/result.md
```

Include:

- branch
- commit SHA
- changed files
- local checks run
- smoke status
- what still needs validation
