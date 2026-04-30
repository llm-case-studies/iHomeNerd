# ME-21 Multilingual ASR Baseline

**Date:** 2026-04-30
**Tester:** DeepSeek (wip/testing)
**Target:** Motorola Edge 2021 (M-E-21, `192.168.0.246:17777`)
**Fixtures:** Azure TTS multilingual pack, 10 locales, 10 clips each
**Fixture source:** `testing/fixtures/audio/multilingual/`

---

## 1. Overall Results

| Locale | Supported | Clips | Success | Notes |
|--------|-----------|-------|---------|-------|
| en-US | YES | 10 | 10/10 | Near-perfect |
| es-ES | YES | 10 | 10/10 | Excellent (major improvement vs macOS TTS) |
| de-DE | no | 10 | 10/10 | English-like gibberish (expected) |
| fr-FR | no | 10 | 9/10 | English-like, 1x 503 |
| it-IT | no | 10 | 10/10 | Italian-flavored gibberish |
| ja-JP | no | 10 | 7/10 | Some Japanese characters survive, 3x 503 |
| ko-KR | no | 10 | 9/10 | Korean mixed with English gibberish, 1x 503 |
| pt-BR | no | 10 | 8/10 | Spanish model interprets as broken PT/ES, 2x 503 |
| ru-RU | no | 10 | 9/10 | Cyrillic lost, English gibberish, 1x 503 |
| zh-CN | no | 10 | 9/10 | Some Chinese characters survive, 1x 503 |
| **Total** | | **100** | **91/100** | |

---

## 2. English (en-US) — 10/10 near-perfect

All 10 Azure TTS English clips transcribe correctly. The "leave→lead" error
from macOS TTS is gone — "What time does the train leave for downtown?"
transcribes perfectly with Azure's JennyNeural voice. Number handling,
named entities, and long conversational passages all clean.

---

## 3. Spanish (es-ES) — 10/10 excellent

This is a **major improvement** over the macOS TTS fixture pack. The Azure
ElviraNeural voice produces much clearer Spanish audio:

- Short greetings: exact match with accents
- Medium questions: perfect
- Long conversational: fully captured (was heavily garbled with macOS TTS)
- Literary passage ("En un lugar de la Mancha..."): correctly transcribed
- Numbers: correct, minor formatting artifact (▁ prefix)
- Named entities: correct (María, Jaime, Sofía)

The macOS Mónica TTS produced audio that Moonshine Spanish struggled with
(5/10 severely garbled, 2x HTTP 503). The Azure ElviraNeural TTS produces
audio that Moonshine Spanish handles cleanly — 10/10 with no 503 errors.

---

## 4. Unsupported Locales — expected noise

The 8 unsupported locales all route through English (or Spanish for pt-BR)
Moonshine models. Results are predictably garbled but not crashing:

- **ja-JP and zh-CN**: Some native characters survive (ja-001: "こんにちは",
  zh-001: "你好") — interesting that Moonshine English partially captures
  non-Latin characters
- **de-DE, fr-FR, it-IT**: English-like phonetic approximations of German/French/Italian
- **ko-KR**: Korean character output mixed with English
- **pt-BR**: Spanish model produces broken Portuguese/Spanish hybrid
- **ru-RU**: Cyrillic completely lost, English phonetic guesses

9/100 HTTP 503 errors — all on unsupported locales, likely when the
English Moonshine model encounters audio it can't parse at all.

---

## 5. Comparison: macOS TTS vs Azure TTS

| Metric | macOS TTS (Samantha/Mónica) | Azure TTS (JennyNeural/ElviraNeural) |
|--------|---------------------------|--------------------------------------|
| EN short phrases | 8/10 exact | 10/10 near-perfect |
| ES short phrases | 2/10 excellent | 10/10 excellent |
| ES long phrases | Heavily garbled | Fully captured |
| ES 503 errors | 2 | 0 |
| Word error (leave→lead) | 1 | 0 |

The Azure TTS fixture pack **replaces** the macOS pack for accuracy testing.
The macOS pack remains useful for quick smoke tests but should not be used
for word-error-rate baselining.

---

## 6. Artifacts

- Full per-clip results: `testing/results/me21_multilingual_asr_baseline.json`
- Fixture pack: `testing/fixtures/audio/multilingual/`
- Raw transcripts above were truncated to 80 chars for display — full text
  in the JSON file
