# Android Server Profile Surface Test Request

**Date:** 2026-05-02  
**Requester:** Alex / Codex  
**Target branch:** `feature/android-server-profile-surface`  
**Validation lane:** `wip/testing`  
**Primary build/deploy host:** `iMac-macOS`

## Goal

Validate the first Android "server profile" surface intended to make Android
node-class devices more honest and useful as semi-headless iHN nodes.

## Candidate devices

- `Galaxy Z Fold6`
- `Moto-Razr`
- fallback / comparison: `M-E-21`

## Preconditions

- target branch is available on the Android build/deploy host
- device is attached and visible through `adb`
- app can be rebuilt and reinstalled from `iMac-macOS`

Reference:

- `docs/ANDROID_BUILD_HOST_IMAC_MACOS_2026-04-28.md`

## Build / deploy path

```bash
ssh alex@192.168.0.117
source ~/.local/share/ihomenerd-android/env.sh
cd ~/Projects/iHomeNerd/mobile/android/ihn-home
./gradlew assembleDebug
adb devices
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

If multiple devices are connected, use serial-targeted installs.

## Exact steps

1. Build the APK from `feature/android-server-profile-surface`.
2. Install it on at least one target Android device.
3. Launch the app and let the runtime come up.
4. Check the native UI for the new "server profile" / "server readiness"
   surface.
5. Probe:
   - `/health`
   - `/capabilities`
   - `/system/stats`
6. Verify whether the new surface tells the truth about:
   - charging / plugged-in status
   - battery / thermal state if exposed
   - runtime readiness
   - network-serving readiness
   - any semi-headless / travel-node guidance
7. Record whether the surface is actually useful for a damaged-screen or
   travel-node scenario.

## Expected results

- Android exposes a clear, truthful readiness surface either in native UI,
  `/system/stats`, or both
- the information is specific to iHN node hosting, not generic Android fluff
- no regression to serving behavior on `:17777` / `:17778`

## Capture back

- screenshots of the native Android surface
- `/system/stats` excerpt
- `/health` and `/capabilities` excerpts if relevant
- device model / Android version
- any runtime or serving regressions

## Pass / fail rule

Pass if:

- the new surface exists
- it is understandable
- it reflects real device/runtime state
- it helps judge whether the device is ready for node duty

Fail if:

- it is missing
- it is misleading
- it depends on guessed data
- or it breaks serving/runtime behavior

## Result location

Write the result under:

- `mobile/testing/results/`

Suggested filename:

- `ANDROID_SERVER_PROFILE_SURFACE_RESULTS_2026-05-02.md`

