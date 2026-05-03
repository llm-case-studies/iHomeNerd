# Expert Brief — Android Model Catalog

**Date:** 2026-05-02  
**Audience:** OpenCode coding agent on `Acer-HL` (`Qwen` preferred for this sprint)  
**Status:** example reference sprint

## Why this sprint exists

Android now has a real local runtime, a `Models` tab, and mobile pack
load/unload endpoints. But it still lacks one clean, honest place to answer:

- what local model packs exist on this node?
- which ones are loaded right now?
- which capabilities are backed by which pack?
- which packs are only loadable / experimental?
- what should a client or tester call to get that inventory directly?

This sprint should tighten that seam instead of broadening into a full model
manager.

## Execution Fence

- Repo: `iHomeNerd`
- Host: `Acer-HL`
- Base branch: `origin/main`
- Working branch: `feature/android-model-catalog`
- Merge target when validated: `main`
- Validation lane: `wip/testing`
- Android build/deploy host: `iMac-macOS`

## References

Read these first:

- `docs/MOBILE_STRATEGY_2026-04-24.md`
- `docs/NODES_CONTROL_PLANE_SPEC_2026-04-23.md`
- `docs/ANDROID_BUILD_HOST_IMAC_MACOS_2026-04-28.md`
- `docs/ANDROID_REAL_DEVICE_HANDOFF_2026-04-24.md`
- `mobile/testing/protocols/MOBILE_CROSS_TESTING_PROTOCOL_2026-04-28.md`

Relevant Android sources:

- `mobile/android/ihn-home/app/src/main/java/com/ihomenerd/home/runtime/LocalNodeRuntime.kt`
- `mobile/android/ihn-home/app/src/main/java/com/ihomenerd/home/ui/IhnHomeApp.kt`
- `mobile/android/ihn-home/app/src/main/java/com/ihomenerd/home/runtime/LocalRuntimeClient.kt`
- `mobile/android/ihn-home/app/src/main/java/com/ihomenerd/home/ui/IhnHomeViewModel.kt`

## Feature goal

Add a first honest Android model catalog surface that a tester or local client
can probe directly.

The smallest acceptable shape is:

- a stable runtime endpoint such as `GET /v1/models`
- a truthful JSON response for local Android-hosted packs/models
- enough fields to distinguish:
  - loaded
  - loadable
  - unavailable
  - experimental
  - capability bindings / backend

If helpful, the Android `Models` tab can also be tightened to match the same
catalog more directly.

## Acceptable implementation scope

Choose the smallest sensible slice that creates real value. Good examples:

- add `GET /v1/models` on the Android runtime
- surface pack/model state with stable IDs and load state
- include capability bindings or current backend hints
- align the native `Models` tab wording with the runtime catalog

Do **not** turn this into:

- a full download manager
- a remote model marketplace
- a large UI redesign
- generic LLM benchmarking

## Deliverables

Required:

1. implementation on `feature/android-model-catalog`
2. concise result note using `02-result-template.md`
3. a concrete validator handoff at:
   - `mobile/testing/requests/ANDROID_MODEL_CATALOG_TEST_REQUEST_2026-05-02.md`

That testing request is mandatory. Leave the next tester exact steps.

## Build and smoke expectations

Before handing off to testing:

1. prove the branch builds
2. orchestrate Android build/deploy smoke on `iMac-macOS`
3. verify at minimum:
   - app installs
   - app launches
   - no immediate crash
   - existing runtime endpoints still respond
   - the new model catalog surface responds honestly

Useful build/deploy commands:

```bash
ssh iMac-macOS
source ~/.local/share/ihomenerd-android/env.sh
cd ~/Projects/iHomeNerd/mobile/android/ihn-home
git fetch origin
git checkout feature/android-model-catalog
./gradlew assembleDebug
adb devices
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

## Done means

This sprint is done when:

- the code is committed on the named branch
- the result note explains what changed
- the branch is build-ready and smoke-tested
- the testing request tells the next validator exactly what to try
