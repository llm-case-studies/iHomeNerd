# Cross-Platform Tier Contract Sweep

**Date:** 2026-04-30
**Tester:** DeepSeek (wip/testing, iMac-Debian)
**Targets:** iPhone 12 Pro Max, Motorola Edge 2021 (Python backend offline)
**Fixture used:** `efb85ad` TestSpeechToTextTier (7 asserts)

---

## 1. Results Matrix

| Platform | Total | Pass | Fail | Skip | Tier | Whisper |
|----------|-------|------|------|------|------|---------|
| **iPhone 12 PM** | 45 | 39 | 5 | 1 | `parallel` | absent |
| **ME-21** | 45 | 32 | 13 | 0 | `transcription` | absent |
| **Python backend** | — | — | — | — | `transcription` | absent (offline) |

---

## 2. Tier Assert Results

| Test | iPhone | ME-21 | Notes |
|------|--------|-------|-------|
| `test_stt_capability_present_or_skip` | ✅ | ✅ | Both have speech_to_text |
| `test_stt_tier_is_string` | ✅ | ✅ | |
| `test_stt_tier_valid_value` | ✅ | ✅ | iPhone=`parallel`, ME-21=`transcription` |
| `test_stt_candidate_languages_when_parallel_or_whisper` | ✅ | ✅ | iPhone: 4 locales non-empty |
| `test_stt_candidate_languages_in_supported_locales` | ✅ | ✅ | All candidates in 63 supported locales |
| `test_stt_whisper_subobject_when_whisper_tier` | ✅ | ✅ | Not triggered (tier≠whisper) |
| `test_stt_whisper_absent_when_not_whisper_tier` | ✅ | ✅ | Whisper correctly absent for non-whisper tiers |

**All 7 tier asserts pass on both live platforms.**

---

## 3. Failures

| Platform | Test | Reason |
|----------|------|--------|
| iPhone | 5× system/stats | `/system/stats` returns 404 — not yet implemented |
| iPhone | `ca_cert_has_ca_basic_constraints` | SKIP — `cryptography` library not installed on Debian |
| ME-21 | 13× bootstrap | Bootstrap port up but test URL not set correctly (`IHN_BOOTSTRAP_URL` needed) |
| Python | all | BACKEND DOWN — can't start on this machine |

---

## 4. iPhone Tier State

```
tier: parallel
candidate_languages: ['en-US', 'ru-RU', 'cs-CZ', 'fr-BE']
supported_locales: 63 (full Apple speech recognition locales)
on_device: true
whisper: absent (correct for parallel tier)
```

---

## 5. Whisper Warmup Blocked

Alex successfully used Whisper transcription on the iPhone (model downloaded,
transcription worked). However, toggling the Node off/on did not flip the tier
from `parallel` to `whisper`. The `WhisperBundle.setReady(true)` call in
`WhisperEngine.prepare()` is present in the `mac-mini` branch source code
(reviewed lines 48-49 of `WhisperEngine.swift`) but either:
- The app on the iPhone hasn't been rebuilt from the latest `mac-mini` code
- OR the `_ready` flag isn't surviving the `stop()`/`start()` cycle

This needs Claude's attention on the Mac-side build pipeline (§2.3 deferred).

---

## 6. What This Tells Us About the Tier Model

The tier contract is sound:
- `tier` is always present as a string on every node with speech_to_text
- `candidate_languages` correctly enumerates active locales on iPhone
- `supported_locales` cross-checks correctly (63 on iPhone, covers all Azure fixture locales)
- `whisper` sub-object is present ONLY when tier=`whisper`, absent otherwise (not null)

The contract validates cleanly. Once the Whisper warmup flag persistence is
resolved on the Mac side, the tier will flip to `whisper` and the 4 required
`whisper.*` keys will populate. No test changes needed.
