# Android Build Host: iMac macOS

**Date:** 2026-04-28  
**Host:** `iMac-macOS.local`  
**Purpose:** physical-device Android build/deploy bench for iHomeNerd

## Current state

The iMac is now set up as a lean command-line Android build host for the
Android node-class app under:

- repo: `~/Projects/iHomeNerd`
- Android project: `~/Projects/iHomeNerd/mobile/android/ihn-home`
- user-space JDK: `~/.local/share/ihomenerd-android/jdks/temurin-17`
- user-space SDK root: `~/.local/share/ihomenerd-android/toolchain/android-sdk`
- repo-local toolchain symlink:
  `~/Projects/iHomeNerd/mobile/android/toolchain -> ~/.local/share/ihomenerd-android/toolchain`

## Installed components

- Temurin OpenJDK `17.0.19`
- Android SDK Platform `36`
- Android SDK Build-Tools `36.0.0`
- Android SDK Platform-Tools `37.0.0`

## Verification

Verified on-host over SSH:

- `adb version` works
- `./gradlew assembleDebug` succeeds in
  `mobile/android/ihn-home`
- output APK:
  `app/build/outputs/apk/debug/app-debug.apk`

Build completed successfully on `2026-04-28`.

## Environment helper

Local helper script on the iMac:

- `~/.local/share/ihomenerd-android/env.sh`

It exports:

```bash
export JAVA_HOME="$HOME/.local/share/ihomenerd-android/jdks/temurin-17/Contents/Home"
export ANDROID_SDK_ROOT="$HOME/.local/share/ihomenerd-android/toolchain/android-sdk"
export PATH="$JAVA_HOME/bin:$ANDROID_SDK_ROOT/platform-tools:$PATH"
```

Use:

```bash
source ~/.local/share/ihomenerd-android/env.sh
cd ~/Projects/iHomeNerd/mobile/android/ihn-home
./gradlew assembleDebug
```

## Notes

- This is intentionally a **physical-device host first**, not an emulator-first
  workstation.
- No Homebrew dependency was required for the initial setup.
- The repo was synced from the Linux box over `rsync`; a future `git pull`
  workflow is fine once the local checkout is in regular use.
- The iMac is a good fit for Android work because it has more stable desk
  space and USB capacity than the Dell laptop.

## Next useful step

When a device is attached to the iMac:

```bash
source ~/.local/share/ihomenerd-android/env.sh
cd ~/Projects/iHomeNerd/mobile/android/ihn-home
./gradlew assembleDebug
adb devices
adb install -r app/build/outputs/apk/debug/app-debug.apk
```
