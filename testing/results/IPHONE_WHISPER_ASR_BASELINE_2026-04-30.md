# iPhone 12 PM Whisper ASR Baseline

**Date:** 2026-04-30
**Tester:** DeepSeek (wip/testing, iMac-Debian)
**Target:** iPhone 12 Pro Max (`192.168.0.220:17777`)
**Endpoint:** `POST /v1/transcribe-audio` (multipart, deployed by Claude in `3be5f09`)
**Fixtures:** Azure TTS multilingual pack, 10 locales × 10 clips = 100 total
**Backend:** `openai_whisper-base` (WhisperKit on iOS Neural Engine)

---

## 1. Overall Results

| Locale | Clips | OK | Exact | Quality notes |
|--------|-------|:--:|:-----:|---------------|
| en-US | 10 | 10 | 8 | Near-perfect. "leave for downtown" correct. Minor formatting on numbers. |
| es-ES | 10 | 10 | 3 | Good. "¿cómo estás?" with accents. Some punctuation drops on longer phrases. |
| de-DE | 10 | 10 | 6 | **Native German.** "Hallo, wie geht es dir heute?" — all 10 clips actual German. |
| fr-FR | 10 | 10 | 1 | **Native French.** "Bonjour, comment allez-vous aujourd'hui?" |
| it-IT | 10 | 10 | 1 | **Native Italian.** "Ciao, come stai oggi?" |
| ja-JP | 10 | 10 | 2 | **Native Japanese.** "こんにちは、今日の調子はいかがですか?" — 2 clips exact, rest semantically correct |
| ko-KR | 10 | 10 | 2 | **Native Korean.** "안녕하세요. 오늘 어떠세요?" |
| pt-BR | 10 | 10 | 3 | **Native Portuguese.** "Olá, como você está hoje?" — "Tiago" swapped, minor wording |
| ru-RU | 10 | 10 | 2 | **Native Russian.** "Здравствуйте, как вы сегодня." — Cyrillic fully preserved |
| zh-CN | 10 | 10 | 0 | **Native Chinese.** "你好,你今天怎麼樣?" — Traditional character variants, semantically correct |
| **Total** | **100** | **100** | **28** | |

**100/100 API calls succeeded. Zero HTTP errors. Zero 503s. Zero timeouts.**

---

## 2. iPhone Whisper vs ME-21 Moonshine — Head-to-Head

| Metric | iPhone Whisper | ME-21 Moonshine |
|--------|:---:|:---:|
| Total clips succeeded | **100/100** | 91/100 |
| HTTP errors (503) | **0** | 9 |
| Languages supported | **All 10** (native) | 2 (en-US, es-ES) |
| EN quality | 8/10 exact | 8/10 exact |
| ES quality | 3/10 exact | 3/10 exact |
| DE/FR/IT quality | **Native transcription** | English-like gibberish |
| JA/KO/ZH quality | **Native script output** | Some characters, mostly gibberish |
| RU quality | **Cyrillic preserved** | Lost entirely |
| Processing speed (avg) | ~1.7s | ~0.5s |

Whisper is a true multilingual model. It transcribes all 10 languages
natively with correct scripts. Moonshine is English/Spanish only — the
other 8 locales produce gibberish through forced English-model routing.

Whisper is ~3× slower than Moonshine (~1.7s vs ~0.5s per clip), but
handles 5× more languages with correct script output.

---

## 3. Claude's Fix Validation

| Request | Status | Detail |
|---------|:------:|--------|
| iPhone `/v1/transcribe-audio` endpoint | ✅ Deployed | Multipart form upload with `file=` field, WAV accepted |
| Endpoint returns correct shape | ✅ | `{text, language, model, backend, duration, processingTime, segments}` |
| Whisper model loaded | ✅ | `openai_whisper-base` (145 MB), processing ~0.35s for short clips |
| All 10 fixture locales transcribe | ✅ | 100/100, zero errors |

---

## 4. Remaining Gaps

| Gap | Detail |
|-----|--------|
| **Tier not flipping** | Tier stays `parallel` even after Whisper use. `WhisperBundle.setReady(true)` not triggered by HTTP endpoint path. |
| **No upload_transport in capabilities** | `speech_to_text` capability missing `upload_transport` and `preferred_upload_mime_type` — harness can't auto-discover the endpoint format |
| **Apple SFSpeechRecognizer path** | Only Whisper path tested. Apple engine endpoint might not be wired. |
| **Capabilities still snapshot-at-startup** | Tier reflects state when Node was toggled ON, not current state |

---

## 5. Artifacts

- Full per-clip JSON: `testing/results/iphone_whisper_asr_baseline.json`
- ME-21 comparison: `testing/results/ME21_MULTILINGUAL_ASR_BASELINE_2026-04-30.md`
