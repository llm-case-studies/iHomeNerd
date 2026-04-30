# Azure Multilingual Fixture Pack Validation

**Date:** 2026-04-30
**Source:** `/tmp/pronunco-azure-fixtures` (Azure TTS, staged locally on Debian)
**Validator:** DeepSeek (wip/testing)

---

## 1. Summary

| Metric | Value |
|---|---|
| Locales | 10 (de-DE, en-US, es-ES, fr-FR, it-IT, ja-JP, ko-KR, pt-BR, ru-RU, zh-CN) |
| Clips per locale | 10 |
| Total audio files | 100 |
| Audio format | WAV PCM, 16 kHz, 16-bit, mono, little-endian |
| sha256 match vs manifests | 100/100 |
| Normalized path | `testing/fixtures/audio/multilingual/<locale>/*.wav` |
| Size on disk | 19 MB |

**Verdict: Ready for use.** All 100 files are valid WAV audio matching the
harness format. The extension/contentType mismatch has been normalized.

---

## 2. Issues found

### 2.1 Extension mismatch
All 100 files have `.mp3` extensions but contain WAV PCM data.
Confirmed via `file` command: 100/100 are `RIFF (little-endian) data, WAVE audio`.

### 2.2 contentType mismatch
Manifests declare `"contentType": "audio/mpeg"` but actual bytes are WAV.

### 2.3 Fix applied
- Copied all 100 files to `testing/fixtures/audio/multilingual/<locale>/` with `.wav` extension
- Generated normalized per-locale `manifest.json` with corrected `contentType: "audio/wav"`
- Generated `INDEX.json` at `testing/fixtures/audio/multilingual/INDEX.json`
- All sha256 checksums match the origin manifests (100/100)

---

## 3. Harness consumption path

Test code should reference:

```
testing/fixtures/audio/multilingual/<locale>/manifest.json
testing/fixtures/audio/multilingual/<locale>/<lineId>.wav
testing/fixtures/audio/multilingual/INDEX.json
```

Example for en-US:
```
testing/fixtures/audio/multilingual/en-US/manifest.json   ← clip metadata
testing/fixtures/audio/multilingual/en-US/en-001.wav      ← audio
```

---

## 4. Per-locale quality check

| Locale | Files | sha256 match | Avg size |
|---|---|---|---|
| de-DE | 10 | 10/10 | ~170 KB |
| en-US | 10 | 10/10 | ~173 KB |
| es-ES | 10 | 10/10 | ~162 KB |
| fr-FR | 10 | 10/10 | ~179 KB |
| it-IT | 10 | 10/10 | ~159 KB |
| ja-JP | 10 | 10/10 | ~170 KB |
| ko-KR | 10 | 10/10 | ~192 KB |
| pt-BR | 10 | 10/10 | ~172 KB |
| ru-RU | 10 | 10/10 | ~159 KB |
| zh-CN | 10 | 10/10 | ~166 KB |

---

## 5. What's NOT done

- No Azure re-generation (as instructed)
- No audio transcoding (bytes are already correct)
- No accuracy/word-error-rate testing (blocked on Azure keys)
- Origin files under `/tmp/pronunco-azure-fixtures/` remain untouched

---

## 6. Cross-reference

These fixtures supersede the macOS TTS fixture pack
(`testing/fixtures/audio/en-*.wav`, `es-*.wav`) for multilingual
ASR accuracy testing. The macOS pack remains useful for en/es-only
quick smoke tests.
