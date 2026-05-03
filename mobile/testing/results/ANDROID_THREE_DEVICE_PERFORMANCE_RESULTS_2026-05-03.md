# Results — Android Three-Device Performance Comparison

**Date:** 2026-05-03  
**Tester:** DeepSeek (via OpenCode, `wip/testing` branch)  
**Request:** `mobile/testing/requests/ANDROID_THREE_DEVICE_PERFORMANCE_REQUEST_2026-05-03.md`  
**Request commit:** `206a8ab`  
**Canonical artifact commit:** `ecc5832`  
**APK sha256:** `454214da41f0d4792727d6958e96f307f64579d15ab6634ebefc38673a0b6fc8`  
**Build/deploy host:** `iMac-macOS`  
**Testing/evidence host:** `iMac-Debian`

## Verdict: PASS

All three devices probed on the same canonical APK. The comparison
distinguishes code/artifact identity from device/runtime-state differences.
Report is complete and internally consistent.

---

## 1. Device Table

| Property | Galaxy Z Fold6 | Motorola Edge 2021 | Moto-Razr Ultra 2025 |
|---|---|---|---|
| **Serial** | `RFCXA1X0AVY` | `ZY22GQPKG6` | `ZY22LPN2KG` |
| **Android** | 16 (SDK 36) | 12 (SDK 31) | 16 (SDK 36) |
| **Arch** | arm64-v8a | arm64-v8a | arm64-v8a |
| **RAM** | ~11.7 GB | ~7.7 GB | ~15.9 GB |
| **LAN IP** | 192.168.0.237 | 192.168.0.246 | 192.168.0.239 |
| **Hostname** | sm-f956u | motorola-edge-(2021) | motorola-razr-ultra-2025 |
| **Cert age** | May 2 | Apr 23 | May 2 |
| **Model** | SM-F956U | berlna_global | leap_guuw |

## 2. Runtime Identity and Readiness

| Field | Fold6 | M-E-21 | Moto-Razr |
|---|---|---|---|
| **`server_readiness`** | `true` | `true` | `true` |
| **`readiness_level`** | `ready` | `degraded` | `degraded` |
| **`battery_optimization_exempt`** | `true` | `false` | `false` |
| **`battery_percent`** | 100% | 99% | 85% |
| **`battery_temp_c`** | 26.1 | 23 | 25 |
| **`thermal_status`** | `none` | `none` | `none` |
| **`app_memory_pss_bytes`** | ~198 MB | ~224 MB | ~168 MB |
| **`process_cpu_percent`** | ~0.8% | ~8.7% | ~0.4% |
| **`total_ram_bytes`** | ~11.7 GB | ~7.7 GB | ~15.9 GB |
| **`is_charging`** | yes (USB) | yes (USB) | yes (AC) |
| **`ports_serving`** | 17777, 17778 | 17777, 17778 | 17777, 17778 |
| **`network_transport`** | wifi | wifi | wifi |
| **`network_ready`** | true | true | true |
| **Trust status** | trusted | trusted | trusted |
| **Home CA present** | yes | yes | yes |
| **Server cert present** | yes | yes | yes |
| **`quality_profiles`** | fast, balanced, deep | fast, balanced | fast, balanced, deep |
| **`suggested_roles`** | travel-node, light-specialist, pronunco-helper | travel-node, light-specialist, pronunco-helper | travel-node, light-specialist, pronunco-helper |
| **Version** | 0.1.0-dev-android | 0.1.0-dev-android | 0.1.0-dev-android |
| **Ollama** | false | false | false |

**Degradation reasons:**
- M-E-21: `Battery optimization is not exempted for this app. Android may restrict the runtime background service.`
- Moto-Razr: `Battery optimization is not exempted for this app. Android may restrict the runtime background service.`
- Fold6: No degradation. Battery optimization exempted. Only device at `ready` level.

**Extra:**
- M-E-21 shows active Chrome browser session (9 requests from 192.168.0.166), suggesting ongoing remote access.

## 3. Model/Runtime Truth

| Field | Fold6 | M-E-21 | Moto-Razr |
|---|---|---|---|
| **Total packs** | 5 | 5 | 5 |
| **Loaded packs** | 4 | 4 | 3 |
| **Loadable packs** | 1 | 1 | 2 |
| **`compare_pinyin`** | loaded | loaded | loaded |
| **`normalize_pinyin`** | loaded | loaded | loaded |
| **`synthesize_speech`** | loaded | loaded | loaded |
| **`transcribe_audio`** | loaded | loaded | loaded |
| **`chat`** | **runtime_unavailable** | **loaded** | **available_to_load** |
| **`translate_text`** | available_to_load | available_to_load | available_to_load |

### Chat (Gemma) Detail

| Field | Fold6 | M-E-21 | Moto-Razr |
|---|---|---|---|
| **`chat` capability** | false (runtime_unavailable) | **true** (loaded) | false (available_to_load) |
| **Backend** | android_gemma_local | android_gemma_local_litertlm_gpu | android_gemma_local |
| **Model file** | null | `gemma-4-e2b-it` | null |
| **Fast quality mode** | unavailable | available | unavailable |
| **Balanced quality mode** | unavailable | available | unavailable |

**Interpretation:**
- Only M-E-21 has the Gemma chat pack actually loaded and active, with a GPU-backed LiteRT-LM runtime (`gemma-4-e2b-it`). Despite being the least powerful device on paper, it is the only device where on-device chat is actually available today.
- Fold6 has the chat pack recognized but in `runtime_unavailable` state (model file not sideloaded).
- Moto-Razr has chat as `available_to_load` (needs both pack load and model sideload).

### ASR (transcribe_audio)

All three devices have ASR loaded with:
- Backend: `sherpa_onnx_moonshine`
- Languages: en-US, es-ES
- Backend choices: `moonshine-base-en`, `moonshine-base-es`
- All support backend selection, auto-routing by language

### Voices (TTS)

All three devices report the same voice list (identical across devices) — Android system TTS voice catalog with `quality: 400, latency: 200` for all entries.

## 4. Web-Serving Behavior

All three devices behave **identically** for web serving. This is expected since they share the same APK with the same bundled assets.

| Path | Fold6 | M-E-21 | Moto-Razr |
|---|---|---|---|
| `GET /` | 200, real bundled SPA `index.html` | 200, real bundled SPA `index.html` | 200, real bundled SPA `index.html` |
| `GET /app` | 200, same `index.html` (SPA fallback) | 200, same `index.html` (SPA fallback) | 200, same `index.html` (SPA fallback) |
| `GET /some/deep/link` | 200, same `index.html` (SPA fallback) | 200, same `index.html` (SPA fallback) | 200, same `index.html` (SPA fallback) |
| `GET /assets/does-not-exist.js` | 404, `Not found` | 404, `Not found` | 404, `Not found` |

All three serve the **real bundled Command Center** (`<title>iHomeNerd — Command Center</title>`, real JS/CSS asset references: `index-CvGfoLAD.js`, `index-CyKXrGpB.css`). No degraded page on any device. Bundled assets are present on all three.

**Conclusion:** The APK artifact is internally consistent across all three devices for web serving.

## 5. Lightweight Local Workload Latency

### 5a. Pinyin Comparison

| Metric | Fold6 | M-E-21 | Moto-Razr |
|---|---|---|---|
| **HTTP status** | 200 | 200 | 200 |
| **Latency** | 0.077s | 0.074s | **0.023s** |
| **Expected** | ni3 hao3 | ni3 hao3 | ni3 hao3 |
| **Actual** | ni3 hao2 | ni3 hao2 | ni3 hao2 |
| **Tone mismatches** | 1 | 1 | 1 |
| **Syllable distance** | 1 | 1 | 1 |
| **Similarity** | 0.5 | 0.5 | 0.5 |

All three return identical results (deterministic output). Moto-Razr is ~3x faster on pinyin comparison.

### 5b. TTS (Speech Synthesis)

| Metric | Fold6 | M-E-21 | Moto-Razr |
|---|---|---|---|
| **HTTP status** | 200 | 200 | 200 |
| **Latency** | **0.387s** | 1.085s | 0.563s |
| **Response size** | 92,592 bytes | 92,592 bytes | 92,592 bytes |
| **WAV valid** | yes (PCM 16-bit mono 24kHz) | yes (PCM 16-bit mono 24kHz) | yes (PCM 16-bit mono 24kHz) |

All three produce identical WAV output (same byte count, same format). Fold6 is the fastest TTS device, M-E-21 is ~2.8x slower.

### 5c. ASR (Speech Transcription)

| Metric | Fold6 | M-E-21 | Moto-Razr |
|---|---|---|---|
| **HTTP status** | 200 | 200 | 200 |
| **Latency** | **0.204s** | 0.312s | 0.205s |
| **Transcript** | Hello, how are you today? | Hello, how are you today? | Hello, how are you today? |
| **Backend** | sherpa_onnx_moonshine_en | sherpa_onnx_moonshine_en | sherpa_onnx_moonshine_en |
| **Backend ID** | moonshine-base-en | moonshine-base-en | moonshine-base-en |
| **Language** | en-US | en-US | en-US |
| **Audio bytes** | 58,216 | 58,216 | 58,216 |

All three transcribe the fixture identically and correctly. Fold6 and Moto-Razr are near-identical in ASR latency (~0.204s). M-E-21 is ~50% slower.

### Workload Latency Summary

| Workload | Fold6 | M-E-21 | Moto-Razr | Fastest |
|---|---|---|---|---|
| **Pinyin** | 0.077s | 0.074s | **0.023s** | Moto-Razr |
| **TTS** | **0.387s** | 1.085s | 0.563s | Fold6 |
| **ASR** | **0.204s** | 0.312s | 0.205s | Fold6 (tie) |

## 6. Cross-Device Interpretation

### Strongest practical Android node today: **Galaxy Z Fold6**

- Only device with `readiness_level: ready` and battery optimization exempt
- Fastest TTS (0.387s) and fastest ASR (0.204s, tied with Moto-Razr)
- Good RAM (11.7 GB), good thermal profile, USB-powered
- Full quality profiles (fast/balanced/deep)
- **Limitation:** chat (Gemma) is `runtime_unavailable` — model not sideloaded

### Cleanest stable reference: **Moto-Razr Ultra 2025**

- Most RAM (15.9 GB) — highest ceiling for future local-model loads
- Fastest pinyin (0.023s) and near-fastest ASR (0.205s)
- Clean state (fewest remote connections)
- Android 16, fresh cert (May 2)
- Full quality profiles (fast/balanced/deep)
- **Limitation:** `readiness_level: degraded` (battery opt not exempt), chat only `available_to_load`

### Best experimental local-model candidate: **Motorola Edge 2021**

- **Only device where Gemma chat is actually loaded and active** (GPU-backed LiteRT-LM, `gemma-4-e2b-it`)
- Despite being the weakest hardware (7.7 GB RAM, Android 12), it is the only device currently serving on-device chat
- Pinyin performance on par with Fold6 (0.074s)
- **Limitation:** `readiness_level: degraded` (battery opt not exempt), slowest TTS (1.085s), slowest ASR (0.312s), oldest cert (Apr 23), Android 12

### Meaningful differences despite same APK

| Difference | Explanation |
|---|---|
| **Chat availability** | Runtime state. Only M-E-21 has the Gemma model sideloaded and GPU backend initialized. Fold6 and Moto-Razr need model sideloading. |
| **Readiness level** | OS/vendor battery policy. Fold6 has exemption; M-E-21 and Moto-Razr do not. This is a device-setup difference, not an APK difference. |
| **TTS latency** | Hardware/os-vendor. Fold6 (Android 16, Samsung) ~2.8x faster than M-E-21 (Android 12, Motorola). A12 TTS engine likely slower. |
| **ASR latency** | Hardware/os-vendor. M-E-21 ~50% slower than Fold6/Moto-Razr. A12 vs A16 runtime overhead. |
| **Pinyin latency** | CPU clock/OS. Moto-Razr (A16, ~15.9GB RAM) ~3x faster than others on lightweight computation. |
| **RAM** | Hardware. Moto-Razr (15.9 GB) > Fold6 (11.7 GB) > M-E-21 (7.7 GB). |
| **Quality profiles** | Runtime capability surface. M-E-21 only reports fast/balanced; Fold6 and Moto-Razr report fast/balanced/deep. Likely RAM/OS-version-gated. |
| **Cert age** | Setup timing. M-E-21 last provisioned Apr 23; Fold6 and Moto-Razr May 2. |
| **Battery optimization** | Device setup. Only Fold6 has exemption. Manual setup step needed on M-E-21 and Moto-Razr. |

## 7. Summary and Recommendations

1. **Fold6 is the best ready-to-use Android node.** It has the best balance of speed, readiness, and resource profile. Only gap is chat model not sideloaded.

2. **Moto-Razr is the best future-growth device.** With 15.9 GB RAM, A16, and fast inference, it could be the strongest node if chat model is sideloaded and battery optimization is exempted.

3. **M-E-21 is the active local-model testbed.** It already has Gemma loaded and running on GPU. It is the reference device for LiteRT-LM chat validation, despite its older OS and smaller RAM.

4. **Key action items:**
   - Sideload Gemma model on Fold6 and Moto-Razr for a fairer comparison
   - Exempt battery optimization on M-E-21 and Moto-Razr (manual device setting)
   - Consider repurposing Moto-Razr as primary node when chat model is loaded, given its RAM advantage
   - M-E-21 remains the baseline reference for older Android but has proven GPU-LiteRT-LM viability
