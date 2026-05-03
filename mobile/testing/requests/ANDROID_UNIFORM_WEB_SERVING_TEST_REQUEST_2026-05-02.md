# Android Uniform Web Serving Test Request

**Date:** 2026-05-02  
**Requester:** Alex / Codex  
**Target branch:** `feature/android-uniform-web-serving`  
**Validation lane:** `wip/testing`  
**Primary build/deploy host:** `iMac-macOS`

## Goal

Validate that the Android runtime serves the Command Center web UI honestly and
uniformly.

The important truth to validate is:

- does `/` serve the real bundled Command Center rather than a synthetic fake?
- do SPA routes behave consistently?
- do missing asset paths fail clearly instead of silently degrading into a fake app?
- are `:17777` and `:17778` still healthy after the serving change?

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
- `docs/ANDROID_REAL_DEVICE_HANDOFF_2026-04-24.md`

## Build / deploy path

```bash
ssh alex@192.168.0.117
source ~/.local/share/ihomenerd-android/env.sh
cd ~/Projects/iHomeNerd/mobile/android/ihn-home
git fetch origin
git checkout feature/android-uniform-web-serving
./gradlew assembleDebug
adb devices
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

If multiple devices are connected, use serial-targeted installs.

## Exact steps

### 1. Build and install

Build the APK from `feature/android-uniform-web-serving` and install it on at
least one target Android device.

### 2. Launch the app and start the runtime

1. Open the app on the device.
2. Start the Android local runtime if it is not already running.
3. Confirm serving is up on `:17777` and bootstrap still works on `:17778`.

### 3. Probe primary web routes

Using adb forward or LAN, probe:

```bash
adb -s <serial> forward tcp:37779 tcp:17777
adb -s <serial> forward tcp:37780 tcp:17778

curl -skI https://127.0.0.1:37779/
curl -skI https://127.0.0.1:37779/app
curl -skI https://127.0.0.1:37779/some/deep/link
curl -skI https://127.0.0.1:37779/assets/
```

Check whether:

- `/` serves the real bundled SPA entry
- `/app` serves the same SPA entry or the intended canonical entry
- SPA deep links resolve consistently
- `/assets/*` serves real bundled assets

### 4. Check asset behavior explicitly

Probe a real bundled asset path from the HTML if visible, and also probe an
intentionally missing asset path:

```bash
curl -skI https://127.0.0.1:37779/assets/does-not-exist.js
curl -sk https://127.0.0.1:37779/assets/does-not-exist.js | head
```

The runtime should fail honestly. It should not silently return a fake
Command Center page for missing asset files.

### 5. Check setup/bootstrap path

```bash
curl -s http://127.0.0.1:37780/setup/trust-status | python3 -m json.tool
curl -sI http://127.0.0.1:37780/setup/ca.crt
```

Verify the bootstrap/setup channel still behaves correctly and is not confused
with the main SPA surface.

### 6. Browser/manual check

From a browser on the LAN, open:

- `https://<device-ip>:17777/`

Verify:

- the real Command Center loads
- not a synthetic placeholder page
- no obvious broken-asset white screen
- if a degraded page is used, it is honest and explicit

### 7. Regression check on existing JSON endpoints

Verify these still respond correctly:

```bash
curl -s --insecure https://127.0.0.1:37779/health | python3 -m json.tool
curl -s --insecure https://127.0.0.1:37779/discover | python3 -m json.tool
curl -s --insecure https://127.0.0.1:37779/capabilities | python3 -m json.tool
```

## Expected results

- Android serves the real bundled Command Center when assets are present
- SPA routes are consistent
- missing asset behavior is honest
- bootstrap remains on `:17778`
- no regression to existing runtime behavior on `:17777` / `:17778`

## Capture back

- status codes and notes for `/`, `/app`, a deep link, and a missing asset path
- whether the page is clearly the real SPA or a fallback/degraded page
- browser screenshot if the result is visually important
- device model / Android version
- any regression on runtime or setup endpoints

## Pass / fail rule

Pass if:

- the Android node serves the real web UI honestly
- SPA routes behave consistently
- missing assets fail clearly
- existing runtime/setup endpoints still work

Fail if:

- a synthetic placeholder still masquerades as the real Command Center
- deep links or assets behave inconsistently
- missing assets silently degrade into a fake app surface
- or the serving change breaks existing endpoints

## Result location

Write the result under:

- `mobile/testing/results/`

Suggested filename:

- `ANDROID_UNIFORM_WEB_SERVING_RESULTS_2026-05-02.md`
