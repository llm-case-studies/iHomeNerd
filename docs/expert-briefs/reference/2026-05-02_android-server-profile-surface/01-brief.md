# Expert Brief — Android Server Profile Surface

**Date:** 2026-05-02  
**Audience:** OpenCode coding agent on `Acer-HL`  
**Status:** example reference sprint

## Why this sprint exists

New Android devices are being prepared to act more like portable iHN nodes:

- `M-E-21`
- `Galaxy Z Fold6`
- `Moto-Razr` with visible screen-risk

The Android app already serves a real local runtime. What is missing is a clear
surface for "server readiness" and semi-headless survivability.

This sprint is intentionally small. It should establish the work pattern, not
solve the entire Android roadmap.

## Execution Fence

- Repo: `iHomeNerd`
- Host: `Acer-HL`
- Base branch: `origin/main`
- Working branch: `feature/android-server-profile-surface`
- Merge target when validated: `main`
- Validation lane: `wip/testing`
- Android build/deploy host: `iMac-macOS`

## References

Read these first:

- `docs/MOBILE_STRATEGY_2026-04-24.md`
- `docs/CURRENT_STATE_AND_NEXT_MOVES_2026-04-24.md`
- `docs/ANDROID_BUILD_HOST_IMAC_MACOS_2026-04-28.md`
- `docs/ANDROID_REAL_DEVICE_HANDOFF_2026-04-24.md`
- `mobile/testing/protocols/MOBILE_CROSS_TESTING_PROTOCOL_2026-04-28.md`

Relevant Android sources:

- `mobile/android/ihn-home/app/src/main/java/com/ihomenerd/home/runtime/LocalNodeRuntime.kt`
- `mobile/android/ihn-home/app/src/main/java/com/ihomenerd/home/runtime/NodeRuntimeService.kt`
- `mobile/android/ihn-home/app/src/main/java/com/ihomenerd/home/MainActivity.kt`

## Feature goal

Add a first honest Android "server profile" surface that helps answer:

- is the phone charging?
- should it stay awake while charging?
- is battery optimization likely to interfere?
- is the runtime currently running and network-serving?
- does the device look ready for semi-headless node use?

The exact UI can stay minimal. The important part is a truthful, testable
surface.

## Acceptable implementation scope

Choose the smallest sensible slice that creates real value. Good examples:

- add `server_profile` or `server_readiness` fields to `/system/stats`
- add a native Android card showing charging / battery / runtime readiness
- expose whether the app is running in a state appropriate for node hosting
- add notes/hints when the device is not ready for travel-node duty

Do **not** turn this into:

- a full device-management dashboard
- generic Android settings spelunking
- a large refactor unrelated to Android node hosting

## Deliverables

Required:

1. implementation on `feature/android-server-profile-surface`
2. concise result note using `02-result-template.md`
3. a concrete validator handoff at:
   - `mobile/testing/requests/ANDROID_SERVER_PROFILE_SURFACE_TEST_REQUEST_2026-05-02.md`

That testing request is mandatory. Leave the next tester exact steps.

## Validation expectations

Your code should be shaped so another person can validate it on the Android
build/deploy bench described in:

- `docs/ANDROID_BUILD_HOST_IMAC_MACOS_2026-04-28.md`

Useful iMac build/deploy commands:

```bash
ssh alex@192.168.0.117
source ~/.local/share/ihomenerd-android/env.sh
cd ~/Projects/iHomeNerd/mobile/android/ihn-home
./gradlew assembleDebug
adb devices
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

If your change needs a device-specific test note, write it into the testing
request rather than burying it in the result summary.

## Done means

This sprint is done when:

- the code is committed on the named branch
- the result note explains what changed
- the testing request tells the next validator exactly what to try

