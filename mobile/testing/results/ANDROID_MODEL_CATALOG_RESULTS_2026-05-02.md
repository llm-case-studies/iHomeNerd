# Android Model Catalog Validation Results

**Date:** 2026-05-02  
**Tester:** OpenCode / Codex  
**Validation lane:** `wip/testing` (iMac-Debian)  
**Build/deploy host:** iMac-macOS.local (192.168.0.117)  
**Branch tested:** `origin/feature/android-model-catalog` at `cfb7bee` (reset from iMac local `9d60686`)

## Verdict: PASS

The /v1/models endpoint exists, is truthful, aligns with other surfaces, and survives load/unload state changes without regression on :17777/:17778.

## Device

| Field | Value |
|---|---|
| Model | motorola edge (2021) |
| Serial | ZY22GQPKG6 |
| Android version | 12 (API 31) |
| Arch | arm64-v8a |
| RAM | 7714095104 (~7.2 GB) |
| Network | Wi-Fi, 192.168.0.246 |

**Note:** Only M-E-21 was attached to iMac-macOS. No Galaxy Z Fold6 or Moto-Razr available on this host. M-E-21 was the documented fallback and was already smoke-tested in the implementation phase.

## Build & Deploy

```
iMac-macOS: git reset --hard origin/feature/android-model-catalog
iMac-macOS: ./gradlew assembleDebug → SUCCESS (36 tasks, all up-to-date)
iMac-macOS: adb -s ZY22GQPKG6 install -r app-debug.apk → Success
```

Runtime started via UI tap on "Start" button (service not exported; ADB start-service denied. UI interaction via `adb shell input tap` after scrolling).

## Endpoint Results

### GET /v1/models — 200 OK

```
total_packs: 5
loaded_packs: 4
loadable_packs: 1
experimental_packs: 1
```

6 data entries across 5 packs:

| Pack | Kind | Capability | Load State | Experimental | Backend |
|---|---|---|---|---|---|
| PronunCo Pinyin Tools | tool-pack | compare_pinyin, normalize_pinyin | loaded | no | kotlin_local |
| Android TTS Local | service-pack | synthesize_speech | loaded | no | android_tts_service |
| Android Gemma Chat Local | model-pack | chat | loaded | **yes** | android_gemma_local |
| Translate Small (preview) | model-pack | translate_text | **available_to_load** | no | kotlin_local_preview |
| Android ASR Local | service-pack | transcribe_audio | loaded | no | sherpa_onnx_moonshine |

Summary excerpt:
```json
{
  "loaded": ["PronunCo Pinyin Tools", "Android TTS Local", "Android Gemma Chat Local", "Android ASR Local"],
  "loadable": ["Translate Small (preview)"],
  "unavailable": [],
  "experimental": ["Android Gemma Chat Local"],
  "capability_map": {
    "chat": "android_gemma_local",
    "compare_pinyin": "kotlin_local",
    "normalize_pinyin": "kotlin_local",
    "synthesize_speech": "android_tts_service",
    "transcribe_audio": "sherpa_onnx_moonshine"
  }
}
```

Each entry includes: id, object, created, owned_by, pack_id, pack_name, pack_kind, capability, capability_title, backend, implementation, tier, load_state, loaded, loadable, experimental, offline, streaming, languages, latency_class, quality_modes, note. ASR adds backend_choices; chat adds model_file and active_backend.

### GET /health — 200 OK

```
ok: true, status: "ok"
providers: ["android_local"]
models: chat, compare_pinyin, normalize_pinyin, synthesize_speech, transcribe_audio
available_capabilities: all 5
server_readiness present with readiness_level: "degraded" (battery optimization not exempted)
```

### GET /capabilities — 200 OK

```
flat: 5 true (chat, compare_pinyin, normalize_pinyin, synthesize_speech, transcribe_audio), 1 false (translate_text)
_detail: full per-capability profiles with backend, languages, quality_modes, upload_transport (ASR), model_hint (chat)
node_profile present with quality_profiles: ["fast", "balanced"]
```

### GET /discover — 200 OK

```
role: "brain", hostname: "motorola-edge-(2021)", ip: "192.168.0.246"
capabilities: [chat, compare_pinyin, normalize_pinyin, synthesize_speech, transcribe_audio]
quality_profiles: ["fast", "balanced"]
models: [PronunCo Pinyin Tools, Android TTS Local, Android Gemma Chat Local, Android ASR Local]
suggested_roles: ["travel-node", "light-specialist", "pronunco-helper"]
strengths: ["portable control plane", "PronunCo helper tools", "offline local runtime"]
```

### GET /v1/mobile/model-packs — 200 OK

5 packs with id, name, kind, loaded, loadable, loadState, capabilities, capabilityProfiles, note. Matches /v1/models truthfully.

### GET /setup/trust-status (:17778) — 200 OK

```
status: "trusted"
Home CA present (O=iHomeNerd), valid 2026-2036
Server cert present (O=iHomeNerd Android Node), valid 2026-2028
SANs include localhost, motorola-edge-2021, *.local, 127.0.0.1, 192.168.0.246
```

## Cross-Endpoint Comparison

| Surface | total_packs | available_capabilities | loaded count | loadable count |
|---|---|---|---|---|
| /v1/models | 5 | 6 data entries | 4 | 1 |
| /health | — | 5 | — | — |
| /capabilities | — | 5 true, 1 false | — | — |
| /discover | — | 5 | 4 models listed | — |
| /v1/mobile/model-packs | 5 | — | 4 loaded | 1 loadable |

**Consistency assessment:** All surfaces agree on current state. No contradictions found.

- `/discover` lists 4 models (only loaded packs), matching /v1/models loaded count.
- `/capabilities` shows `translate_text: false` because the pack is loadable but not loaded.
- After loading Translate Small, `/capabilities` updated to `translate_text: true` and `/v1/models` updated loaded count to 5.
- `/health` uses a models map (capability → pack_id), consistent with capability_map in /v1/models.

## Models Tab Truthfulness

Native Models tab (UI dump via `uiautomator`) verified:

1. **"Android-hosted packs" section:** Lists all 5 packs with correct kind, status, and description.
   - PronunCo Pinyin Tools: "tool-pack · serving locally now"
   - Android TTS Local: "service-pack · serving locally now"
   - Android Gemma Chat Local: "model-pack · serving locally now" (correctly marked experimental)
   - Translate Small (preview): "model-pack · planned" (before load) → "model-pack · serving locally now" (after load)
   - Android ASR Local: "service-pack · serving locally now"

2. **"Runtime model catalog" card:** Present and shows:
   - Title: "Runtime model catalog"
   - Method: "GET /v1/models"
   - URL: "https://192.168.0.246:17777/v1/models" (correct LAN URL)
   - Summary: "4 loaded · 1 loadable · 5 total packs" (updated to "5 loaded · 0 loadable" after loading)

3. **"Live model inventory" card:** Shows "Model inventory unavailable" with error "discover: Failed to connect to /127.0.0.1:17778". This is expected — the app's default gateway URL is :17778 (HTTP setup port), not the HTTPS runtime on :17777, so it can't fetch gateway data from itself. Not a regression from this sprint; this is the existing gateway-connect model.

4. **Load/Unload buttons:** Present for loadable packs (Gemma Chat, Translate Small). Correctly enabled/disabled based on current state. After load/unload cycle, catalog updates were reflected immediately in both the endpoint and the UI.

## Load/Unload Observations

- **Loaded Translate Small (preview):** `/v1/models` updated immediately — loaded_packs from 4→5, loadable_packs from 1→0, capability_map gained `"translate_text": "kotlin_local_preview"`. `/capabilities` updated from `translate_text: false` → `true`.
- **Unloaded Translate Small (preview):** State reverted correctly — loaded_packs back to 4, loadable_packs back to 1, capability_map dropped translate_text entry.
- No residual state leakage. The catalog is read-live, not a cached snapshot.

## Regression Check on :17777 / :17778

| Endpoint | Port | Result |
|---|---|---|
| /health | :17777 | 200 OK, same schema as before |
| /discover | :17777 | 200 OK, same schema as before |
| /capabilities | :17777 | 200 OK, same schema as before |
| /v1/mobile/model-packs | :17777 | 200 OK, same schema as before |
| /setup/trust-status | :17778 | 200 OK, same schema as before |

No regression detected. All existing endpoints on both ports continue to serve correctly. The new /v1/models endpoint is additive and does not interfere.

## Notes

1. **Runtime start requires UI:** `NodeRuntimeService` is `exported="false"`. ADB `am startservice` is denied (permission error). The runtime was started via UI tap. For fully automated testing, consider adding an exported service intent or a broadcast receiver.
2. **Device limitation:** Only M-E-21 (Motorola Edge 2021) was attached to iMac-macOS. The requested Galaxy Z Fold6 and Moto-Razr were not available. Validation on a second device would strengthen confidence but is not required for pass verdict given the pre-existing smoke test on this same device.
3. **Gateway URL mismatch:** The "Live model inventory" card tries `http://127.0.0.1:17778` (HTTP setup port) for gateway data rather than `https://127.0.0.1:17777` (HTTPS runtime). This is pre-existing behavior, not introduced in this sprint. The "Runtime model catalog" card correctly points to `:17777/v1/models`.
