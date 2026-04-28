# Android

This subtree holds the native Android work for iHomeNerd.

Initial target:
- Kotlin
- Jetpack Compose
- local discovery
- trust bootstrap guidance
- Home overview
- node actions

Primary app:
- `ihn-home/`

Local toolchain:
- `toolchain/android-sdk/`
- `toolchain/gradle/`

Current state:
- project-local Gradle wrapper is present
- repo-local Android SDK is installed for API 36
- emulator package and a Google APIs x86_64 system image are installed locally
- `ihn-home` builds successfully as a debug APK
- `ihn-home` runs in the local emulator as a real Android node shell
- the app can host a Home-CA-backed local iHN runtime on `https://:17777`
- the app exposes an HTTP bootstrap/setup port on `http://:17778`
- the app exposes native Travel Mode controls and runtime-side remote-client telemetry
- current physical-device target is a normal Android phone or tablet with no root required

This should become the reference implementation for:
- travel brain support
- QR pairing
- trust verification
- gateway and node control

Recent handoff notes:
- [docs/ANDROID_REAL_DEVICE_HANDOFF_2026-04-24.md](/media/alex/LargeStorage/Projects/iHomeNerd/docs/ANDROID_REAL_DEVICE_HANDOFF_2026-04-24.md)
- [docs/ANDROID_BUILD_HOST_IMAC_MACOS_2026-04-28.md](/media/alex/LargeStorage/Projects/iHomeNerd/docs/ANDROID_BUILD_HOST_IMAC_MACOS_2026-04-28.md)
