# Cross-Platform Chat + ASR Status

**Date:** 2026-05-01
**Tester:** DeepSeek (wip/testing, iMac-Debian)

---

## 1. Whisper ASR — iPhone (tested 2026-04-30)

**100/100 Azure fixture clips, all 10 languages natively.**

| Locale | Clips | Exact | Quality |
|--------|:-----:|:-----:|---------|
| en-US | 10 | 8 | Near-perfect |
| es-ES | 10 | 3 | Good |
| de-DE | 10 | 6 | Native German |
| fr-FR | 10 | 1 | Native French |
| it-IT | 10 | 1 | Native Italian |
| ja-JP | 10 | 2 | Native Japanese (CJK preserved) |
| ko-KR | 10 | 2 | Native Korean (Hangul preserved) |
| pt-BR | 10 | 3 | Native Portuguese |
| ru-RU | 10 | 2 | Native Russian (Cyrillic preserved) |
| zh-CN | 10 | 0 | Native Chinese (Hanzi preserved) |

Zero HTTP errors. Zero 503s. Processing ~1.7s avg per clip.
Full report: `testing/results/IPHONE_WHISPER_ASR_BASELINE_2026-04-30.md`

---

## 2. Chat — Cross-Platform

### 2.1 ME-21 (Gemma 4)

| Field | Value |
|-------|-------|
| Endpoint | `POST /v1/chat` (messages format) |
| Backend | `android_gemma_local_litertlm_gpu` |
| Model | `gemma-4-e2b-it` |
| Status | ✅ **Working** — responded to test prompt in <30s |

Test: "Say hello in 3 words." → "Hello, how can I help?"

### 2.2 iPhone (MLX — Qwen + Gemma)

Both models tested. Only one active at a time (last loaded wins).
No `model` parameter in the API yet — switching requires loading via the app.

| Metric | Qwen 2.5-1.5B | Gemma 4 |
|--------|:---:|:---:|
| Model ID | `Qwen2.5-1.5B-Instruct-4bit` | `gemma-4-e2b-it-4bit` |
| Quantization | 4-bit | 4-bit |
| Speed (tok/s) | **32** | 21 |
| Math (17×24) | 408 ✅ | 408 ✅ |
| Code (is_prime) | — | ✅ (6k±1 optimization) |
| Spanish | ¡Hola! ✅ | — |
| Active | ⚠️ Overwritten by Gemma | ✅ Currently active |

**Key finding:** Qwen is 50% faster (32 vs 21 tok/s). Gemma produced
more complete code. The `qwen/system-stats-device-state` branch has
`MLXEngine.swift` with model switching support — once merged, the API
should accept a `model` parameter. For now, last-loaded model wins.

**Model switch crash risk:** The `qwen` branch includes a
[model-switch crash recipe](https://github.com/llm-case-studies/iHomeNerd/blob/qwen/system-stats-device-state/docs/copilot-handoffs/2026-05-01_kimi_mlx-model-switch-crash.md)
— consecutive loads of different 4-bit models may crash MLX.

---

## 3. Current Capability Matrix

| Capability | iPhone | ME-21 |
|-----------|:---:|:---:|
| `text_to_speech` | ✅ | ✅ |
| `speech_to_text` | ✅ (whisper) | ✅ (transcription) |
| `transcribe_audio` | ✅ (multipart) | ✅ (json-base64) |
| `analyze_image` | ✅ (VNRecognizeTextRequest) | ✅ (android_mlkit) |
| `chat` | ✅ Qwen 32tok/s + Gemma 21tok/s (MLX) | ✅ Gemma 4 (LiteRT) | iPhone: only one active at a time, no API model switch yet |
| `compare_pinyin` | — | ✅ |
| `normalize_pinyin` | — | ✅ |
