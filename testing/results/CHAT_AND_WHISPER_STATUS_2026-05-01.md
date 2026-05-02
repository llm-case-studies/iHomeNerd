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

### 2.2 iPhone (MLX)

| Field | Value |
|-------|-------|
| Endpoint | `POST /v1/chat` (prompt format) |
| Backend | `mlx_ios` |
| Model | Unknown (MLX engine, needs model download) |
| Status | ⚠️ **Model not loaded** — "MLX inference failed: Model not loaded." |

The endpoint validates input and routes to MLX, but the model hasn't been
downloaded/prewarmed yet. Similar to the Whisper cold-start pattern —
first use triggers model download. Needs a user interaction or prewarm
call to load the Gemma/Qwen weights.

---

## 3. Current Capability Matrix

| Capability | iPhone | ME-21 |
|-----------|:---:|:---:|
| `text_to_speech` | ✅ | ✅ |
| `speech_to_text` | ✅ (whisper) | ✅ (transcription) |
| `transcribe_audio` | ✅ (multipart) | ✅ (json-base64) |
| `analyze_image` | ✅ (VNRecognizeTextRequest) | ✅ (android_mlkit) |
| `chat` | ⚠️ (model not loaded) | ✅ (gemma-4) |
| `compare_pinyin` | — | ✅ |
| `normalize_pinyin` | — | ✅ |
