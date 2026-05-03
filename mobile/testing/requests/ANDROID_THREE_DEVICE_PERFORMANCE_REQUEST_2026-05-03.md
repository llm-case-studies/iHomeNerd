# Android Three-Device Performance Comparison Request

**Date:** 2026-05-03  
**Requester:** Alex / Codex  
**Target branch:** `main`  
**Validation lane:** `wip/testing`  
**Primary build/deploy host:** `iMac-macOS`

## Goal

Compare the current canonical Android APK across the three attached Android
devices and record:

- what is identical because the APK is the same
- what differs because of device hardware, OS/vendor behavior, runtime state,
  or per-device setup
- which device is the strongest practical Android node right now

This is a **same-artifact comparison**, not a branch-validation sprint.

## Canonical artifact under test

- source commit: `ecc5832`
- APK path on build host:
  - `~/Projects/iHomeNerd/mobile/android/ihn-home/app/build/outputs/apk/debug/app-debug.apk`
- APK sha256:
  - `454214da41f0d4792727d6958e96f307f64579d15ab6634ebefc38673a0b6fc8`

All three devices are expected to be running this exact APK. If anything looks
materially inconsistent, reinstall this canonical APK before continuing.

## Devices under test

| Device | Serial | Android | Expected role |
|---|---|---:|---|
| Galaxy Z Fold6 | `RFCXA1X0AVY` | 16 | strong-tier Android benchmark |
| Motorola Edge 2021 | `ZY22GQPKG6` | 12 | baseline Android reference |
| Moto-Razr Ultra 2025 | `ZY22LPN2KG` | 16 | high-RAM experimental Android node |

## Scope

Test and compare:

1. runtime identity and readiness
2. core runtime endpoint truth
3. web-serving behavior
4. lightweight local workload latency
5. any clear device-specific capability gaps

Keep scope bounded. Do not turn this into a new implementation sprint.

## Preconditions

- all three devices are attached to `iMac-macOS`
- `adb devices -l` shows all three serials
- `iHN Home` is installed on all three devices
- runtime is started on each device before probing

Host roles:

- `iMac-macOS` = Android build/deploy + `adb`
- `iMac-Debian` = testing/evidence lane

Reference:

- `docs/ANDROID_BUILD_HOST_IMAC_MACOS_2026-04-28.md`

## Suggested forwarded ports

Use stable per-device local forwards from `iMac-macOS`:

| Device | Runtime HTTPS | Setup HTTP |
|---|---:|---:|
| Fold6 | `37779` | `37780` |
| M-E-21 | `37781` | `37782` |
| Moto-Razr | `37783` | `37784` |

Example:

```bash
ssh iMac-macOS
source ~/.local/share/ihomenerd-android/env.sh

adb -s RFCXA1X0AVY forward tcp:37779 tcp:17777
adb -s RFCXA1X0AVY forward tcp:37780 tcp:17778

adb -s ZY22GQPKG6 forward tcp:37781 tcp:17777
adb -s ZY22GQPKG6 forward tcp:37782 tcp:17778

adb -s ZY22LPN2KG forward tcp:37783 tcp:17777
adb -s ZY22LPN2KG forward tcp:37784 tcp:17778
```

## Exact checks

### 1. Runtime identity and readiness

For each device, capture:

- `GET /health`
- `GET /system/stats`
- `GET /discover`
- `GET /setup/trust-status`

Minimum fields to compare:

- hostname
- Android/network identity
- `server_readiness`
- `battery_optimization_exempt`
- `readiness_level`
- `battery_percent`
- `battery_temp_c`
- `thermal_status`
- `app_memory_pss_bytes`
- `process_cpu_percent`
- `total_ram_bytes`
- `quality_profiles`

### 2. Model/runtime truth

For each device, capture:

- `GET /v1/models`
- `GET /capabilities`
- `GET /v1/voices`

Compare:

- loaded vs loadable vs unavailable packs
- whether `chat` is available-to-load
- whether `transcribe_audio` is loaded, available, or runtime-unavailable
- whether the capability/model story is internally consistent

### 3. Web-serving behavior

For each device, probe:

- `GET /`
- `GET /app`
- one deep link such as `GET /some/deep/link`
- one missing asset such as `GET /assets/does-not-exist.js`

Record:

- HTTP status
- whether `/` and `/app` serve the real bundled SPA or an honest degraded page
- whether missing assets fail honestly with `404`

### 4. Lightweight local workload latency

Run the same small workload set on all three devices and compare the observed
latency and output.

#### 4a. Compare Pinyin

```bash
curl -sk -w '\nHTTP %{http_code} TIME %{time_total}\n' \
  https://127.0.0.1:<runtime-port>/v1/pronunco/compare-pinyin \
  -H 'Content-Type: application/json' \
  -d '{"expected":"ni3 hao3","actual":"ni3 hao2"}'
```

Capture:

- latency
- similarity
- tone mismatches
- syllable distance

#### 4b. TTS

```bash
curl -sk -o /tmp/ihn-tts.wav -w 'HTTP %{http_code} TIME %{time_total} BYTES %{size_download}\n' \
  https://127.0.0.1:<runtime-port>/v1/synthesize-speech \
  -H 'Content-Type: application/json' \
  -d '{"text":"Hello from iHomeNerd.","targetLang":"en-US"}'
```

Capture:

- latency
- response size
- whether output is valid WAV

#### 4c. ASR (conditional)

Only run this if the device reports `transcribe_audio` as actually available in
runtime surfaces.

Use fixture:

- `testing/fixtures/audio/en-001-short-greeting.wav`

Example:

```bash
AUDIO_B64=$(base64 < testing/fixtures/audio/en-001-short-greeting.wav | tr -d '\n')

curl -sk -w '\nHTTP %{http_code} TIME %{time_total}\n' \
  https://127.0.0.1:<runtime-port>/v1/transcribe-audio \
  -H 'Content-Type: application/json' \
  -d "{\"audioBase64\":\"$AUDIO_B64\",\"mimeType\":\"audio/wav\",\"language\":\"en-US\"}"
```

Capture:

- latency
- transcript
- backend / backend_id
- whether the device is actually able to run ASR now

### 5. Cross-device interpretation

Answer explicitly:

- which device is the strongest practical Android node today
- which device is the cleanest stable reference
- which device is the best experimental local-model candidate
- what meaningful differences remain even with the same APK

## Suggested output structure

Include:

1. device table
2. runtime/readiness comparison table
3. web-serving comparison table
4. model catalog comparison table
5. workload latency table
6. short conclusion with recommendations

## Expected results

- all three devices respond on the core runtime surfaces
- the same APK produces a comparable feature set, but device/setup differences
  are visible
- Fold6 and Moto-Razr should rank above M-E-21 for stronger-node potential
- any remaining differences should be explained as:
  - runtime state
  - bundled asset presence
  - ASR prerequisite state
  - battery policy
  - OS/vendor behavior

## Pass / fail rule

Pass if:

- all three devices are probed
- the report clearly compares them on the same artifact baseline
- the report distinguishes code/artifact differences from device/runtime-state
  differences

Fail if:

- device provenance is uncertain
- one or more devices are skipped without explanation
- or the report does not actually compare runtime behavior across devices

## Result location

Write the result under:

- `mobile/testing/results/`

Suggested filename:

- `ANDROID_THREE_DEVICE_PERFORMANCE_RESULTS_2026-05-03.md`
