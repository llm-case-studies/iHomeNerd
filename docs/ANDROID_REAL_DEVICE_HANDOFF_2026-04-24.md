# Android Real-Device Handoff

**Status:** working notes  
**Date:** 2026-04-24  
**Purpose:** resume Android/iHN work cleanly after reboot or pause

---

## 1. Short answer

Yes, this work can continue after a reboot.

What persists:
- repo files and Android project changes
- built APK
- Android SDK / emulator images stored under `/home/alex/.local/share/ihomenerd-android`
- Chromium NSS certificate imports
- app installs on real Android devices
- on-device generated Home CA and server certs

What does **not** persist:
- running emulator
- Gradle daemons
- `adb forward` port mappings
- currently connected USB devices
- ephemeral local runtime sessions

---

## 2. Current Android state

The Android app is at:
- [mobile/android/ihn-home](/media/alex/LargeStorage/Projects/iHomeNerd/mobile/android/ihn-home/README.md)

It currently supports:
- native `This node`, `Trust`, `Models`, and `Session` screens
- local Android-hosted runtime
- `https://:17777` main runtime
- `http://:17778` setup/bootstrap
- generated Home CA and signed server cert on device
- `PronunCo Pinyin Tools`
- `Translate Small (preview)`
- remote-client telemetry in `/system/stats`
- Travel Mode card with network-settings handoff

Current APK:
- [app-debug.apk](/media/alex/LargeStorage/Projects/iHomeNerd/mobile/android/ihn-home/app/build/outputs/apk/debug/app-debug.apk)

Build command:

```bash
cd /media/alex/LargeStorage/Projects/iHomeNerd/mobile/android/ihn-home
./gradlew assembleDebug
```

---

## 3. Real-device results

### 3.1 Fake "S23 Ultra"

Connected serial:
- `0123456789ABCDEF`

Reality:
- not a real Samsung S23 Ultra
- Android `8.1.0`
- SDK `27`
- spoofed identity
- `mt6580`
- `armeabi-v7a`

Result:
- not a serious iHN target
- install failed with `INSTALL_FAILED_OLDER_SDK`
- do not spend more time on this phone

### 3.2 Samsung A11

Connected serial:
- `R95N70NCMAZ`

Device:
- `SM_A115A`
- Android `10`
- SDK `29`
- `armeabi-v7a`
- about `1.9 GB` RAM
- about `16 GB` free storage

Result:
- install succeeded
- local runtime succeeded
- good as a light real-device proof node
- not a strong travel-brain candidate

Live LAN IP during this session:
- `192.168.0.171`

Verified endpoints:
- `http://192.168.0.171:17778/setup/trust-status`
- `https://192.168.0.171:17777/health`

### 3.3 Motorola Edge 2021

Connected serial:
- `ZY22GQPKG6`

Device:
- `motorola_edge__2021_`
- Android `12`
- SDK `31`
- `arm64-v8a`
- about `7.7 GB` RAM
- about `204 GB` free storage

Result:
- install succeeded
- local runtime succeeded
- best current Android travel-node candidate

Live LAN IP during this session:
- `192.168.0.246`

Verified endpoints:
- `http://192.168.0.246:17778/setup/trust-status`
- `https://192.168.0.246:17777/health`

Update on `2026-04-25`:
- rebuilt and reinstalled the latest Android debug APK on the Motorola
- verified direct Wi-Fi LAN access from the Dell laptop without `adb forward`
- runtime now advertises the active Wi-Fi / hotspot IPv4, includes all detected LAN IPv4s in server-cert SANs, and exposes network transport hints in runtime JSON

Live Wi-Fi IP during this validation:
- `10.0.0.199`

Verified direct LAN endpoints from the Dell:
- `http://10.0.0.199:17778/setup/trust-status`
- `https://10.0.0.199:17777/health`

Observed `/health` highlights:
- `ok: true`
- `binding: 0.0.0.0`
- `network_transport: wifi`
- `network_ips: ["10.0.0.199"]`

Observed `/system/stats` highlights:
- `remote_client_count: 1`
- Dell laptop recorded as remote client `10.0.0.38`
- `connected_apps` included `Remote client traffic`

Update on `2026-04-25` after switching the Motorola to `llm-case-studies` Wi-Fi:
- confirmed the runtime restarts cleanly on the new Wi-Fi identity after reinstall/relaunch
- direct LAN endpoints now reflect the new Wi-Fi address instead of the old `10.0.0.x` address
- Android now advertises `_ihomenerd._tcp` via mDNS / Avahi

Live Wi-Fi IP after the switch:
- `192.168.0.246`

Verified direct LAN endpoints after the switch:
- `http://192.168.0.246:17778/setup/trust-status`
- `https://192.168.0.246:17777/health`

Observed Avahi advertisement from the Dell:
- service name: `iHomeNerd on motorola-edge-2021`
- service type: `_ihomenerd._tcp`
- TXT:
  - `version=0.1.0-dev-android`
  - `role=brain`
  - `hostname=motorola-edge-2021.local`

Observed browser-extension result on the Dell:
- shared iHomeNerd Bridge LAN scan found the Motorola node
- `Test Connection` succeeded
- node appeared as:
  - hostname label: `motorola-edge-(2021)`
  - URL: `http://Android.local:17778`
  - roles: `travel-node`, `light-specialist`, `pronunco-helper`
  - model summary: `Ollama offline · 1 models`

Important remaining mismatch:
- discovery and connection now work, but the extension still prefers the Android setup URL on `http://...:17778`
- Android DNS-SD advertisement is not the same as a guaranteed browser-resolvable friendly `.local` hostname
- peer-discovered Android nodes should prefer IP for transport and keep hostname as display metadata unless hostname resolution is proven
- next UX/protocol fix is to prefer the trusted Android main runtime on `https://<android-ip>:17777` after bootstrap succeeds, then optionally upgrade to a hostname only if it resolves consistently

Update on `2026-04-25` after LAN discovery stabilization:
- the Android app now packages the real built Command Center assets from `backend/app/static` into the APK
- the Android HTTPS runtime now serves bundled `index.html` and `/assets/*` from the APK instead of the placeholder preview page
- `./gradlew assembleDebug` succeeds with the packaged Command Center build
- APK contents confirm:
  - `assets/index.html`
  - `assets/assets/index-*.js`
  - `assets/assets/index-*.css`
- live device verification of the real Command Center serving is still pending the next Motorola reconnect/install cycle

Update on `2026-04-26` after reconnecting the Motorola:
- reinstalled the fresh APK and relaunched `com.ihomenerd.home`
- `NodeRuntimeService` is running in the foreground on the phone
- device-local socket check shows both listeners are up:
  - `*:17777`
  - `*:17778`
- direct device-local HTTP probe to `127.0.0.1:17778/setup/trust-status` returns `HTTP/1.1 200` with:
  - `status: trusted`
  - `lanIp: 192.168.0.246`
  - SANs covering `motorola-edge-2021.local`, `127.0.0.1`, and `192.168.0.246`
- this confirms the new runtime starts cleanly after the real Command Center asset packaging change
- unresolved environment issue:
  - from this Codex shell, direct host-side fetches to `192.168.0.246:17777/17778` still failed even though the phone is listening
  - that looks like host/network reachability from this session, not an Android runtime crash

Update later on `2026-04-26` after browser confirmation and capability-gating cleanup:
- user manually confirmed the real Command Center loads from the Motorola at `https://192.168.0.246:17777`
- Android is therefore serving the standard web UI, not the placeholder HTML
- the frontend was then tightened so real hosted nodes no longer invent missing backends:
  - synthetic mock fallbacks remain only for frontend dev ports like `3000`, `4173`, and `5173`
  - Android-hosted `Chat`, `Talk`, and `Translate` now read the node capability map and say `not installed on this node yet` when the backend is missing
  - hardcoded labels like `gemma4:e2b`, `whisper-small-int8`, and `translategemma-4b` were removed from those panels unless the capability map actually reports a backend
- rebuilt frontend bundle:
  - `backend/app/static/assets/index-AiKbtWQI.js`
  - `backend/app/static/assets/index-C16WbhlK.css`
- rebuilt APK and reinstalled it on the Motorola after the gating changes
- next Android implementation step is now cleanly defined:
  - wire the first real local backend through the existing pack/capability system
  - likely first target: `Kokoro` TTS or a real Android ASR runtime
  - current Android app still has no ONNX / TTS dependency and no real `synthesize_speech` pack yet

Update later on `2026-04-26` after the first real Android backend landed:
- added a real local `android-tts-local` service pack
- added live Android endpoints:
  - `POST /v1/synthesize-speech`
  - `GET /v1/voices`
- the backend uses Android `TextToSpeech`, not browser TTS and not ONNX
- verified from the laptop over live HTTPS on the Motorola:
  - `GET /capabilities` now reports `synthesize_speech: true`
  - capability detail reports:
    - `implementation: android_text_to_speech`
    - `backend: android_tts_service`
    - `tier: tts`
  - `GET /v1/voices` returns a large real voice inventory including `en-US`, `zh-CN`, `zh-TW`, `es`, `fr`, `de`, and `ru`
  - `POST /v1/synthesize-speech` returns real `audio/wav`
  - verified response headers and size:
    - `Content-Type: audio/wav`
    - `Content-Length: 93710`
- current Android reality is now:
  - real local helper tools: yes
  - real local TTS: yes
  - real local ASR: not yet
  - real local dialogue LLM: not yet
  - real local translation model: not yet

Update later on `2026-04-26` after metrics + voice-selection pass:
- `GET /system/stats` now exposes live load metrics from the Motorola:
  - `process_cpu_percent`
  - `app_memory_pss_bytes`
  - `battery_temp_c`
  - `thermal_status`
  - `performance.tts.last_duration_ms`
  - `performance.tts.last_audio_bytes`
  - `performance.tts.last_voice`
  - `performance.tts.last_language_tag`
- browser `System` tab now shows a `Node Load` section with those fields
- browser `Talk` tab now loads `GET /v1/voices` and exposes a voice selector
- browser `Talk` still shows the TTS-only sample path when ASR is absent
- live verification after reinstall:
  - idle node load reported roughly:
    - app CPU `~1.1%`
    - app memory `~173 MB`
    - battery temp `25 C`
    - thermal status `none`
  - after a real TTS run, `/system/stats` recorded:
    - `last_duration_ms: 1037`
    - `last_audio_bytes: 194658`
    - `last_voice: en-us-x-tpf-local`
    - `last_language_tag: en-US`

Update later on `2026-04-26` after the first real Android ASR endpoint landed:
- added a real local `android-asr-local` service pack
- added live Android ASR endpoint:
  - `POST /v1/transcribe-audio`
- browser `Talk` now switches to a JSON/base64 upload path when the host backend reports `backend: android_speech_recognizer`
- Android ASR currently prefers on-device/offline recognition when the platform exposes it, but falls back to the installed Android speech recognizer service when the strict on-device capability flag is absent
- verified from the laptop over live HTTPS on the Motorola:
  - `GET /capabilities` now reports `transcribe_audio: true`
  - capability detail reports:
    - `implementation: android_speech_recognizer`
    - `backend: android_speech_recognizer`
    - `tier: transcription`
- first end-to-end loopback probe succeeded:
  - synthesized `Testing local speech recognition on iHomeNerd.`
  - posted the resulting WAV back into `POST /v1/transcribe-audio`
  - response:
    - `text: The school`
    - `language: en-US`
    - `backend: android_speech_recognizer_offline_preferred`
- interpretation:
  - the Android-hosted ASR transport and recognizer path are real
  - recognition quality still needs benchmarking with real mic captures from laptop and iPhone browsers
  - next step is quality/latency evaluation, not more placeholder plumbing

Update later on `2026-04-26` after the first real local Gemma test and LiteRT-LM migration:
- added a first Android local chat scaffold and model sideload path
- downloaded and pushed a real `gemma-4-E2B-it.litertlm` model onto the Motorola
- confirmed the deprecated MediaPipe Android `LlmInference` runtime was the wrong path:
  - it crashed natively on this device while opening the real LiteRT model
  - the crash path went through `libllm_inference_engine_jni.so`
- migrated the Android chat path to `LiteRT-LM`
- rebuilt, reinstalled, and relaunched the Motorola build
- loaded the `android-gemma-chat-local` pack over the live local API
- verified a real successful on-device chat response from:
  - `POST /v1/chat`
- observed first successful local result:
  - model: `gemma-4-e2b-it`
  - backend: `android_gemma_local_litertlm_gpu`
  - reply: `Hello! I am ready to assist you with your local AI needs.`
- observed second successful local English run:
  - about `4.4 s` duration on the warmed engine
  - app memory about `1.89 GB` PSS
  - battery temp `24 C`
  - thermal status `none`
- current honest state:
  - local Gemma chat on the Motorola is now real
  - `chat` now becomes `true` in `/capabilities` during startup prewarm when the Gemma pack is already loaded
  - English local chat is verified
  - Spanish local chat is now also verified
  - browser `Talk` now routes reply generation and Android TTS by the recognized conversation language instead of the browser UI locale
  - multilingual behavior beyond English and Spanish still needs more testing
  - ASR/TTS and the rest of the Android runtime still work
- latest measured Spanish local loop pieces after the Talk routing fix:
  - `POST /v1/chat` with `language: es-ES` returned:
    - `Soy iHomeNerd, tu asistente local de IA en Android.`
    - backend `android_gemma_local_litertlm_gpu`
    - about `3.6 s`
  - `POST /v1/synthesize-speech` with `targetLang: es-ES` returned:
    - `HTTP 200`
    - about `396,860` bytes of WAV audio
    - about `2.3 s`
    - voice `es-es-x-eef-local`
  - node stats at that point showed:
    - app memory about `1.52 GB` PSS
    - battery temp `25 C`
    - thermal status `none`

Follow-up doc:
- `docs/ANDROID_LITERT_LM_MIGRATION_CHECKLIST_2026-04-26.md`

---

## 4. Browser trust status on this laptop

Imported into Chromium/Chromium-based NSS store:
- `iHN A11 Home CA`
- `iHN Motorola Home CA`

These imports should survive reboot because they live in:
- `$HOME/.pki/nssdb`

Relevant import file paths used:
- A11 cert:
  - [ca.crt](/media/alex/LargeStorage/Projects/iHomeNerd/mobile/design/claude/2026-04-24-initial-concepts/ca.crt)
- Motorola cert:
  - [ca (2).crt](</media/alex/LargeStorage/Projects/iHomeNerd/mobile/design/claude/2026-04-24-initial-concepts/ca (2).crt>)

Helpful browser restart shortcuts:
- Chromium:
  - `chrome://restart`
- Edge:
  - `edge://restart`

---

## 5. Extension state

What worked:
- Chrome/Chromium extension can discover and connect to the Samsung A11 node
- it recognized:
  - `travel-node`
  - `light-specialist`
  - `pronunco-helper`

Current remaining issue:
- the extension still prefers Android setup URLs on `:17778`
- it should prefer trusted Android main runtime on `https://...:17777`

That is a next-fix item, not a blocker to Android runtime viability.

---

## 6. Laptop performance note

The laptop became sluggish mainly because:
- Android emulator was still running
- Gradle daemon was still running
- browser process load was high

Commands that helped:

```bash
/media/alex/LargeStorage/Projects/iHomeNerd/mobile/android/toolchain/android-sdk/platform-tools/adb -e emu kill
cd /media/alex/LargeStorage/Projects/iHomeNerd/mobile/android/ihn-home
./gradlew --stop
```

After reboot, emulator and Gradle should already be stopped unless restarted manually.

---

## 7. Minimum resume checklist after reboot

### 7.1 If only browser/LAN testing is needed

1. Reopen browser.
2. Use `chrome://restart` or `edge://restart` once if trust looks stale.
3. Reopen:
   - `https://192.168.0.246:17777`
   - or `https://192.168.0.171:17777`
4. If device IP changed, get the new IP from the phone app screen or local network tools.

### 7.2 If Android development/testing is needed

1. Connect phone by USB.
2. Ensure `USB debugging` is enabled.
3. Check devices:

```bash
/media/alex/LargeStorage/Projects/iHomeNerd/mobile/android/toolchain/android-sdk/platform-tools/adb devices -l
```

4. Rebuild if needed:

```bash
cd /media/alex/LargeStorage/Projects/iHomeNerd/mobile/android/ihn-home
./gradlew assembleDebug
```

5. Install to Motorola:

```bash
/media/alex/LargeStorage/Projects/iHomeNerd/mobile/android/toolchain/android-sdk/platform-tools/adb -s ZY22GQPKG6 install -r /media/alex/LargeStorage/Projects/iHomeNerd/mobile/android/ihn-home/app/build/outputs/apk/debug/app-debug.apk
```

6. Launch with local runtime:

```bash
/media/alex/LargeStorage/Projects/iHomeNerd/mobile/android/toolchain/android-sdk/platform-tools/adb -s ZY22GQPKG6 shell am force-stop com.ihomenerd.home
/media/alex/LargeStorage/Projects/iHomeNerd/mobile/android/toolchain/android-sdk/platform-tools/adb -s ZY22GQPKG6 shell am start -n com.ihomenerd.home/.MainActivity --ez start_local_runtime true --es gateway_url http://127.0.0.1:17778
```

7. Forward ports to laptop if needed:

```bash
/media/alex/LargeStorage/Projects/iHomeNerd/mobile/android/toolchain/android-sdk/platform-tools/adb -s ZY22GQPKG6 forward tcp:37779 tcp:17777
/media/alex/LargeStorage/Projects/iHomeNerd/mobile/android/toolchain/android-sdk/platform-tools/adb -s ZY22GQPKG6 forward tcp:37780 tcp:17778
```

8. Verify runtime:

```bash
curl -s http://127.0.0.1:37780/setup/trust-status
curl -s http://127.0.0.1:37780/system/stats
```

9. Verify HTTPS with device CA:

```bash
curl -s http://127.0.0.1:37780/setup/ca.crt > /tmp/ihn-moto-home-ca.crt
curl --cacert /tmp/ihn-moto-home-ca.crt -s https://127.0.0.1:37779/health
```

---

## 8. Current priorities when work resumes

### 8.1 Highest-value next step

Fix extension behavior for Android nodes so:
- trusted Android nodes default to `https://...:17777`
- setup URLs on `:17778` stay for bootstrap only

### 8.2 After that

1. verify `connected_clients` with another laptop/phone now that direct Wi-Fi LAN access is confirmed
2. repeat the same test over Android hotspot, not just normal Wi-Fi
3. verify that apps/extensions can prefer `_ihomenerd._tcp` discovery for the Android node instead of manual IP entry
4. QR pairing and handoff
5. shared Home CA import/export
6. benchmark the new Sherpa ONNX Moonshine Android ASR path with real browser mic speech

### 8.3 New milestone on April 26, 2026

- Android local ASR is no longer using the fragile platform `SpeechRecognizer` upload path.
- `M-E-2021` now runs local Sherpa ONNX Moonshine ASR for `en-US` and `es-ES`.
- The browser-facing capability payload now reports:
  - `backend: sherpa_onnx_moonshine`
  - `offline: true`
  - `upload_transport: json-base64`
  - `preferred_upload_mime_type: audio/wav`
- The bundled Sherpa validation clips transcribed successfully through the live Motorola runtime:
  - English: `Ask not what your country can do for you. Ask what you can do for your country.`
  - Spanish: `No preguntes qué puede hacer tu país por ti. Pregunta qué puedes hacer qué por tu país.`
- `/system/stats` now includes `performance.asr` metrics for request count, last duration, payload size, backend, language, and last-seen age.

---

## 9. Handy paths

Android README:
- [mobile/android/README.md](/media/alex/LargeStorage/Projects/iHomeNerd/mobile/android/README.md)

Android app README:
- [mobile/android/ihn-home/README.md](/media/alex/LargeStorage/Projects/iHomeNerd/mobile/android/ihn-home/README.md)

Design references:
- [mobile/design/claude/2026-04-24-initial-concepts](/media/alex/LargeStorage/Projects/iHomeNerd/mobile/design/claude/2026-04-24-initial-concepts/README.md)

Current state doc:
- [docs/CURRENT_STATE_AND_NEXT_MOVES_2026-04-24.md](/media/alex/LargeStorage/Projects/iHomeNerd/docs/CURRENT_STATE_AND_NEXT_MOVES_2026-04-24.md)
