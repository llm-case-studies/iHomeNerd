# iHN Home for Android

This is the first real native Android implementation of the iHomeNerd node-class app.

It is based on the strongest Claude Design concept so far:
- Android acts as a portable node host
- the native shell handles trust, hotspot/client state, models, and quick actions
- the full dense Command Center is served locally by the node runtime on `:17777`

## Current scope

This app now covers:
- Compose-based app shell
- bottom navigation
- `This node`, `Trust`, `Models`, and `Session` screens
- live gateway/node data when pointed at an existing iHN gateway
- a local Android runtime service that serves the main runtime over `https://:17777`
- a lightweight HTTP setup/bootstrap port on `http://:17778`
- the real built Command Center web app served from packaged assets on `https://:17777`
- a generated Android Home CA plus signed server certificate persisted on-device
- CA download and trust-status endpoints on the setup port
- local model-pack state for:
  - `pronunco-pinyin-tools`
  - `android-tts-local`
  - `android-gemma-chat-local`
  - `android-asr-local`
  - `translate-small-preview`
- real local PronunCo helper endpoints for pinyin normalization and comparison
- real local Android TTS endpoints for:
  - `POST /v1/synthesize-speech`
  - `GET /v1/voices`
- real local Android ASR endpoint for:
  - `POST /v1/transcribe-audio`
- optional local Android Gemma chat endpoint for:
  - `POST /v1/chat`
- live runtime performance metrics exposed through `GET /system/stats` for:
  - app CPU %
  - app memory (PSS)
  - battery temperature
  - thermal status
  - last chat duration / prompt size / reply size / backend / model
  - last ASR duration / size / backend / language
  - last TTS duration / size / voice / language
- a lightweight local Mandarin translation preview endpoint
- persisted pack-load state across app/service restarts
- remote-client telemetry from the Android-hosted runtime
- richer capability reporting with:
  - flat booleans for simple client gating
  - detailed per-capability backend, load-state, offline/streaming, and latency metadata
  - node-level `fast` / `balanced` / `deep` quality-profile hints based on device class
- stronger LAN serving metadata with:
  - preference for the active Wi-Fi / hotspot IPv4 when advertising the node
  - all detected LAN IPv4s included in the Android HTTPS certificate SANs
  - transport and reachability hints exposed in runtime JSON and the local preview pages
- Android mDNS advertisement for `_ihomenerd._tcp`
- automatic runtime restart when Android reports a meaningful network change
- a native Travel Mode card with Android-managed network-settings handoff
- checked-in Gradle wrapper
- successful local debug APK build and emulator run

## What it is not yet

- not yet backed by full QR pairing and handoff flows
- not yet able to switch hotspot on or off programmatically
- not yet running a full on-device dialogue/translation/LLM stack by default
- local Gemma chat now runs through `LiteRT-LM` with sideloaded `.litertlm` models on the Motorola Edge 2021
- English and Spanish local chat are verified on-device; broader multilingual behavior still needs more benchmarking
- browser `Talk` now routes local chat + TTS by recognized conversation language rather than by the browser UI locale
- not yet backing every dense Command Center tab with real Android-local endpoints
- not yet packaged for Play release

## Local toolchain

This repo now has a local Android toolchain under:

- `mobile/android/toolchain/android-sdk/`
- `mobile/android/toolchain/gradle/`

The toolchain is intentionally local-only and should stay gitignored.

Build command:

```bash
cd mobile/android/ihn-home
./scripts/fetch_android_asr_prereqs.sh
ANDROID_SDK_ROOT=/media/alex/LargeStorage/Projects/iHomeNerd/mobile/android/toolchain/android-sdk ./gradlew assembleDebug
```

If you want to prepare for local Gemma chat testing on Android, place a supported
`.litertlm` or `.task` model file into the app's `llm/` directory on the device
before launch:

```bash
cd mobile/android/ihn-home
./scripts/push_android_llm_model.sh /path/to/gemma-4-E2B-it-int4.litertlm
```

The runtime currently looks for local chat models in:
- `/sdcard/Android/data/com.ihomenerd.home/files/llm/`
- the app's internal `files/llm/`
- `/data/local/tmp/llm/`

If the web Command Center changed, rebuild its static bundle first:

```bash
cd frontend
npm run build
```

The Android app packages the same built files the desktop FastAPI backend serves from `backend/app/static/`.

Output:

```text
app/build/outputs/apk/debug/app-debug.apk
```

## Real-device deployment

Development deployment to a physical Android device uses the standard Android path:
- regular Android phone or tablet is fine
- no root or jailbreak is needed
- enable `Developer options`
- enable `USB debugging` or `Wireless debugging`
- use `adb` or Android Studio to install the debug APK

Current app/runtime requirements:
- Android 9+ (`minSdk 28`)
- enough free storage for the app and local model packs
- reliable Wi-Fi if the device will act as a travel node or hotspot host
- foreground-service support (standard on normal Android devices)

Example local install flow:

```bash
cd mobile/android/ihn-home
./scripts/fetch_android_asr_prereqs.sh
./gradlew assembleDebug
/media/alex/LargeStorage/Projects/iHomeNerd/mobile/android/toolchain/android-sdk/platform-tools/adb install -r app/build/outputs/apk/debug/app-debug.apk
```

Example launch flow during development:

```bash
/media/alex/LargeStorage/Projects/iHomeNerd/mobile/android/toolchain/android-sdk/platform-tools/adb shell am start -n com.ihomenerd.home/.MainActivity --ez start_local_runtime true --es gateway_url http://127.0.0.1:17778
```

For end users:
- no extra tools are needed if the app is distributed through Google Play
- sideloaded preview builds would require allowing installs from that source on the device

## What the local runtime serves today

The Android node runtime currently serves:
- `GET /`, `GET /app`, and `/assets/*` for the packaged Command Center on `https://:17777`
- `GET /setup` on `http://:17778`
- `POST /v1/synthesize-speech` returning real `audio/wav` from Android TextToSpeech
- `GET /v1/voices` returning the Android TTS voice inventory
- `POST /v1/transcribe-audio` routing uploaded browser audio into local Sherpa ONNX Moonshine ASR
  - supports explicit backend selection across installed local ASR packs
  - currently exposes `Auto`, `Moonshine English`, and `Moonshine Spanish` choices to the web UI
- `POST /v1/chat` routing message history into a local Gemma LiteRT-LM model when the pack is loaded and a compatible sideloaded model is present
- `GET /system/stats` returning node load and recent-TTS performance fields
- `GET /setup/ca.crt`
- `GET /health`
- `GET /discover`
- `GET /cluster/nodes`
- `GET /capabilities`
- `GET /system/stats`
- `GET /setup/trust-status`
- `GET /v1/mobile/model-packs`
- `POST /v1/mobile/model-packs/load`
- `POST /v1/mobile/model-packs/unload`
- `GET/POST /v1/pronunco/compare-pinyin`
- `GET /v1/translate-small/preview`

`/system/stats` now includes:
- battery, RAM, and storage telemetry
- network transport, preferred IP, and all advertised IPv4s
- `connected_apps`
- `connected_clients`
- `remote_client_count`
- `performance.asr` for last local ASR duration / payload size / backend / language
- `performance.chat` for last local chat duration / prompt size / reply size / backend / model
- `performance.tts` for last local TTS duration / payload size / voice / language

`/capabilities` now includes:
- flat booleans for legacy/simple callers
- detailed `_detail.capabilities.*` objects with:
  - implementation/backend identity
  - load state and pack ownership
  - offline/streaming flags
  - latency class
  - quality-mode hints
  - language scope where relevant
  - installed ASR backend choices for explicit app-side routing

## Design source

Main design seed:
- `mobile/design/claude/2026-04-24-initial-concepts/html/ui_kits/ui_kits/android_node/`

Supporting docs:
- `docs/MOBILE_STRATEGY_2026-04-24.md`
- `docs/HOME_AND_MOBILE_VISION_ROADMAP_2026-04-24.md`
- `docs/CLASS_AND_TAKE_HOME_FLOW_2026-04-24.md`

## Next implementation steps

1. Add QR pairing and handoff flows.
2. Benchmark local Gemma chat latency, memory pressure, and multilingual behavior on real Android devices.
3. Add launcher icons and Play-ready resources.
4. Support shared Home CA import/export across Android and larger home nodes.
5. Expand Travel Mode from telemetry plus settings handoff into actual client onboarding flows.

See also:
- `docs/ANDROID_LITERT_LM_MIGRATION_CHECKLIST_2026-04-26.md`
