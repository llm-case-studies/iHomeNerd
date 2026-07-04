# Expert Brief — Android Normalize Pinyin Route

**Date:** 2026-05-03  
**Audience:** OpenCode coding agent on `Acer-HL` (`Minimax M2.5 Free`, `Qwen`, or `DeepSeek`)  
**Status:** bounded evening sprint

## Why this sprint exists

Android currently advertises `normalize_pinyin` as a real capability in:

- `/health`
- `/capabilities`
- `/v1/models`

But there is no matching HTTP route for it. There is only:

- `GET/POST /v1/pronunco/compare-pinyin`

That is a clean contract gap. It is small, real, and directly testable.

This sprint should close that gap without broadening into general PronunCo or
mobile UX redesign.

## Execution Fence

- Repo: `iHomeNerd`
- Host: `Acer-HL`
- Base branch: `origin/main`
- Working branch: `feature/android-normalize-pinyin-route`
- Merge target when validated: `main`
- Validation lane: `wip/testing`
- Android build/deploy host: `iMac-macOS`

## References

Read these first:

- `docs/expert-briefs/README.md`
- `docs/ANDROID_BUILD_HOST_IMAC_MACOS_2026-04-28.md`
- `docs/ANDROID_REAL_DEVICE_HANDOFF_2026-04-24.md`

Relevant Android sources:

- `mobile/android/ihn-home/app/src/main/java/com/ihomenerd/home/runtime/LocalNodeRuntime.kt`
- `mobile/android/ihn-home/app/src/main/java/com/ihomenerd/home/runtime/PronuncoPinyinTools.kt`
- `mobile/android/ihn-home/app/src/main/java/com/ihomenerd/home/runtime/LocalRuntimeClient.kt`

## Feature goal

Add a real Android runtime route for pinyin normalization.

Smallest acceptable shape:

- `POST /v1/pronunco/normalize-pinyin`
- `GET /v1/pronunco/normalize-pinyin?text=...`
- stable JSON response based on `PronuncoPinyinTools.normalize(...)`

Recommended response shape:

```json
{
  "product": "iHomeNerd",
  "tool": "pronunco-pinyin-tools",
  "input": "Nǐ hǎo",
  "normalized": "ni3 hao3",
  "syllables": ["ni3", "hao3"]
}
```

If you think a slightly different minimal JSON shape is cleaner, that is fine,
but it should stay obviously aligned with the existing compare endpoint.

## Acceptable implementation scope

Good changes:

- add GET/POST route handling in `LocalNodeRuntime.kt`
- add a small JSON builder helper for normalize output
- keep naming aligned with existing PronunCo helper routes
- add focused tests if practical in the current Android test setup
- update any local preview/help text only if it is tiny and directly relevant

Do **not** turn this into:

- broader PronunCo API redesign
- Android UI redesign
- pinyin scoring changes
- translation preview work
- capability model refactors

## Deliverables

Required:

1. implementation on `feature/android-normalize-pinyin-route`
2. concise result note using `02-result-template.md`
3. a concrete validator handoff at:
   - `mobile/testing/requests/ANDROID_NORMALIZE_PINYIN_ROUTE_TEST_REQUEST_2026-05-03.md`

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
   - `GET /v1/pronunco/normalize-pinyin`
   - `POST /v1/pronunco/normalize-pinyin`
   - `compare-pinyin` still works

Useful build/deploy commands:

```bash
ssh iMac-macOS
source ~/.local/share/ihomenerd-android/env.sh
cd ~/Projects/iHomeNerd/mobile/android/ihn-home
git fetch origin
git checkout feature/android-normalize-pinyin-route
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
