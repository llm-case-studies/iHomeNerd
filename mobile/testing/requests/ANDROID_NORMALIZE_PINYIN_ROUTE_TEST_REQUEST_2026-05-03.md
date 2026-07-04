# Android Normalize Pinyin Route Test Request

**Date:** 2026-05-03  
**Requester:** Alex / Codex  
**Target branch:** `feature/android-normalize-pinyin-route`  
**Validation lane:** `wip/testing`  
**Primary build/deploy host:** `iMac-macOS`

## Goal

Validate that Android now exposes `normalize_pinyin` as a real runtime route
instead of only advertising it as a capability.

This sprint should add:

- `GET /v1/pronunco/normalize-pinyin?text=...`
- `POST /v1/pronunco/normalize-pinyin`

The important truth to validate is:

- the route exists
- it returns stable normalization output
- it agrees with the existing `PronuncoPinyinTools.normalize(...)` behavior
- it does not break the existing `compare-pinyin` helper

## Candidate devices

- `Galaxy Z Fold6`
- `Moto-Razr`
- fallback: `M-E-21`

One device is enough for a pass if the smoke/build path is clean.

## Preconditions

- target branch is available on the Android build/deploy host
- device is attached and visible through `adb`
- app can be rebuilt and reinstalled from `iMac-macOS`

Reference:

- `docs/ANDROID_BUILD_HOST_IMAC_MACOS_2026-04-28.md`

## Build / deploy path

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

If multiple devices are connected, use serial-targeted installs.

## Exact steps

### 1. Build and install

Build the APK from `feature/android-normalize-pinyin-route` and install it on
at least one target Android device.

### 2. Launch the app and start the runtime

1. Open the app on the device.
2. Start the Android local runtime if it is not already running.
3. Confirm existing serving still works on `:17777` / `:17778`.

### 3. Probe the new normalize route

Use both GET and POST.

#### GET

```bash
adb -s <serial> forward tcp:37779 tcp:17777

curl -s --insecure \
  'https://127.0.0.1:37779/v1/pronunco/normalize-pinyin?text=N%C7%90%20h%C7%8Eo' \
  | python3 -m json.tool
```

Expected minimum truth:

- HTTP 200
- `normalized` should be equivalent to `ni3 hao3`

#### POST

```bash
curl -s --insecure \
  -X POST https://127.0.0.1:37779/v1/pronunco/normalize-pinyin \
  -H 'Content-Type: application/json' \
  -d '{"text":"lü4 se4"}' \
  | python3 -m json.tool
```

Expected minimum truth:

- HTTP 200
- normalized output is stable and deterministic

### 4. Cross-check compare-pinyin regression

The existing helper must still work.

```bash
curl -s --insecure \
  -X POST https://127.0.0.1:37779/v1/pronunco/compare-pinyin \
  -H 'Content-Type: application/json' \
  -d '{"expected":"ni3 hao3","actual":"ni3 hao2"}' \
  | python3 -m json.tool
```

Verify:

- HTTP 200
- similarity / tone mismatch output still looks normal

### 5. Regression check on existing endpoints

Verify existing runtime endpoints still respond correctly:

```bash
curl -s --insecure https://127.0.0.1:37779/health | python3 -m json.tool
curl -s --insecure https://127.0.0.1:37779/capabilities | python3 -m json.tool
curl -s --insecure https://127.0.0.1:37779/v1/models | python3 -m json.tool
curl -s http://127.0.0.1:37780/setup/trust-status | python3 -m json.tool
```

## Expected results

- Android exposes a real normalize route
- GET and POST both work
- output is deterministic and credible
- `compare-pinyin` is unaffected
- no regression on `:17777` / `:17778`

## Capture back

- GET normalize response excerpt
- POST normalize response excerpt
- compare-pinyin response excerpt
- device model / Android version
- any runtime or serving regressions

## Pass / fail rule

Pass if:

- normalize route exists for GET and POST
- output is stable and useful
- compare route still works
- existing runtime endpoints are intact

Fail if:

- normalize route is missing
- output is obviously inconsistent with advertised capability
- or the change breaks serving/runtime behavior

## Result location

Write the result under:

- `mobile/testing/results/`

Suggested filename:

- `ANDROID_NORMALIZE_PINYIN_ROUTE_RESULTS_2026-05-03.md`
