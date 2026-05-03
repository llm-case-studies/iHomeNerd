# Expert Brief — Android Uniform Web Serving

**Date:** 2026-05-02  
**Audience:** OpenCode coding agent on `Acer-HL` (`Minimax M2.5 Free` preferred for this sprint)  
**Status:** example reference sprint

## Why this sprint exists

Android now serves the real bundled Command Center SPA from the runtime, which
is good. But the runtime still contains an older synthetic fallback HTML path.

That creates a remaining honesty problem:

- when the real web UI is available, the Android node should serve the real web UI
- when the bundled assets are missing or broken, it should fail or explain that
  honestly
- it should not quietly pretend a placeholder page is the same thing as the real
  Command Center

This sprint should tighten that serving contract instead of redesigning the app.

## Execution Fence

- Repo: `iHomeNerd`
- Host: `Acer-HL`
- Base branch: `origin/main`
- Working branch: `feature/android-uniform-web-serving`
- Merge target when validated: `main`
- Validation lane: `wip/testing`
- Android build/deploy host: `iMac-macOS`

## References

Read these first:

- `docs/ANDROID_REAL_DEVICE_HANDOFF_2026-04-24.md`
- `docs/CURRENT_STATE_AND_NEXT_MOVES_2026-04-24.md`
- `docs/ANDROID_BUILD_HOST_IMAC_MACOS_2026-04-28.md`
- `mobile/testing/protocols/MOBILE_CROSS_TESTING_PROTOCOL_2026-04-28.md`

Relevant Android sources:

- `mobile/android/ihn-home/app/src/main/java/com/ihomenerd/home/runtime/LocalNodeRuntime.kt`
- `mobile/android/ihn-home/app/src/main/java/com/ihomenerd/home/ui/IhnHomeApp.kt`

## Feature goal

Make Android web serving more honest and uniform for the local runtime.

The smallest acceptable shape is:

- keep the real bundled `index.html` + `/assets/*` path as the primary web UI
- reduce or remove synthetic fallback behavior that imitates the Command Center
- make missing/broken web assets fail clearly or degrade explicitly
- leave a clear, testable route contract for:
  - `/`
  - `/app`
  - SPA deep links
  - `/assets/*`
  - unknown asset paths

If helpful, you may also expose a small runtime status note or native UI hint
about what web surface is actually being served.

## Acceptable implementation scope

Choose the smallest sensible slice that creates real value. Good examples:

- tighten `commandCenterIndexResponse()` and route handling
- replace synthetic fallback HTML with an explicit honest error/degraded page
- add a small serving-status helper if needed for testing or UI clarity
- clarify SPA routing vs missing asset behavior

Do **not** turn this into:

- a full frontend redesign
- new product copy everywhere
- a broad HTTP server rewrite
- unrelated Android capability work

## Deliverables

Required:

1. implementation on `feature/android-uniform-web-serving`
2. concise result note using `02-result-template.md`
3. a concrete validator handoff at:
   - `mobile/testing/requests/ANDROID_UNIFORM_WEB_SERVING_TEST_REQUEST_2026-05-02.md`

That testing request is mandatory. Leave the next tester exact steps.

## Build and smoke expectations

Before handing off to testing:

1. prove the branch builds
2. orchestrate Android build/deploy smoke on `iMac-macOS`
3. verify at minimum:
   - app installs
   - app launches
   - runtime starts
   - `/` serves correctly
   - `/app` or equivalent SPA entry serves correctly
   - missing asset behavior is honest
   - existing endpoints on `:17777` / `:17778` still respond

Useful build/deploy commands:

```bash
ssh iMac-macOS
source ~/.local/share/ihomenerd-android/env.sh
cd ~/Projects/iHomeNerd/mobile/android/ihn-home
git fetch origin
git checkout feature/android-uniform-web-serving
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
