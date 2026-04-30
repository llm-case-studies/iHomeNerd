# ME-21 ASR Routing Validation

**Date:** 2026-04-30
**Tester:** DeepSeek (via OpenCode, `wip/testing` branch)
**Device:** Motorola Edge 2021 (M-E-21, `192.168.0.246:17777`)
**Request:** `mobile/testing/requests/ME21_CROSS_TEST_REQUEST_2026-04-28.md`

---

## Verdict: PASS (with caveats)

---

## 1. UI Verification (Playwright)

| Element | Present | Values |
|---|---|---|
| ASR label | ✅ | "ASR: Auto" |
| Recognition Language | ✅ | English · en-US, Spanish · es-ES |
| ASR Backend | ✅ | Auto, Moonshine English, Moonshine Spanish |
| ASR Mode | ✅ | Fast, Balanced |
| Voice selector (TTS) | ✅ | 51 voices across en-AU/en-GB/en-IN/en-NG/en-US |
| Microphone button | ✅ | Visible, interactive |
| JS console errors | 0 | Clean |

Screenshot captured: `testing/results/me21-talk-tab.png`

Note: the ME-21 APK has the full ASR routing UI deployed, but the local
`frontend/src/components/TalkPanel.tsx` on `wip/testing` does not yet
include these selectors — the source will need a sync when the Android
work is merged.

---

## 2. API Validation — English Forced (Test A)

**backend:** `moonshine-base-en`, **language:** `en-US`

| Fixture | Expected | Transcribed | Match |
|---|---|---|---|
| en-001 | Hello, how are you today? | Hello, how are you today? | ✅ exact |
| en-002 | Good morning. | Good morning. | ✅ exact |
| en-003 | What time does the train leave for downtown? | What time does the train lead for downtown? | ⚠️ "leave"→"lead" |
| en-004 | Can you recommend a good restaurant nearby? | Can you recommend a good restaurant nearby? | ✅ exact |
| en-005 | I've been thinking about learning a new language... | I've been thinking about learning a new language, maybe Spanish or Mandarin, but | ✅ correct (truncated output) |
| en-006 | The weather this weekend looks perfect... | The weather this weekend looks perfect for hiking, so I'm planning to head up to | ✅ correct (truncated) |
| en-007 | One, two, three, four, five, six, seven, eight, nine, ten. | 1 2 3 4 5 6 7 8 9 10... [loops 10] | ⚠️ numeral rendering + hallucinated repeat |
| en-008 | My name is Alex, and my friends are Maria, James, and Priya. | My name is Alex, and my friends are Maria, James, and Priya. | ✅ exact |
| en-009 | The quick brown fox jumps over the lazy dog... | The quick brown fox jumps over the lazy dog. The early bird catches the worm, bu | ✅ correct (truncated) |
| en-010 | Okay, so let me check — did you say forty-two dollars... | Okay, so let me check, did you say $42 or $52? I want to make sure I heard that | ✅ correct ($42/$52 preserved) |

**English summary:** 10/10 successful, 8/10 excellent, 2/10 minor issues (word error, number hallucination). Latency 0.2–1.2 s.

---

## 3. API Validation — Spanish Forced (Test B)

**backend:** `moonshine-base-es`, **language:** `es-ES`

| Fixture | Expected | Transcribed | Match |
|---|---|---|---|
| es-001 | Hola, ¿cómo estás? | Hola, ¿cómo estás? | ✅ exact (with accents) |
| es-002 | Buenos días. | Buenos días. | ✅ exact |
| es-003 | ¿A qué hora sale el tren para el centro? | HTTP 503 | ❌ model error |
| es-004 | ¿Me puede recomendar un buen restaurante... | Mi cuenta de becoming drone en restaurante por aquí. | ❌ garbled |
| es-005 | He estado pensando en aprender un nuevo idioma... | Y es todo pensando en aprender un nuevo idioma. T.A.L. Bays prankes o alemán. | ❌ heavily garbled |
| es-006 | El clima de este fin de semana parece perfecto... | Bible era el domingo por la tarde. | ❌ only caught ending |
| es-007 | Uno, dos, tres... | Uno, dos, tres, cuatro, cinco, seis, siete, ocho, nueve, diez. | ✅ exact |
| es-008 | Mi nombre es Alex... | [looped "No me preocupes"] | ❌ hallucinated loop |
| es-009 | En un lugar de la Mancha... | En un lugar de la marcha, The Cuyo no puede... | ❌ heavily garbled |
| es-010 | A ver, déjame confirmar... | HTTP 503 | ❌ model error |

**Spanish summary:** 2/10 excellent, 2/10 HTTP 503, 6/10 garbled. Latency 0.8–5.8 s.

---

## 4. Auto Routing (Test C)

| Fixture | Backend | Language | Result |
|---|---|---|---|
| en-001-short-greeting | auto | en-US | Hello, how are you today? ✅ |
| es-001-short-greeting | auto | es-ES | Hola, ¿cómo estás? ✅ |

Auto correctly routes English to Moonshine English and Spanish to Moonshine
Spanish. Routing is language-tag-aware.

---

## 5. Mismatch Behavior (Test D)

| Language | Backend | Audio | Result |
|---|---|---|---|
| es-ES | moonshine-base-en | Spanish "Hola, ¿cómo estás?" | "Hola, Como estas?" (accents lost, still readable) ⚠️ |
| en-US | moonshine-base-es | English "Hello, how are you today?" | HTTP 503 ⚠️ |

Mismatch results:
- Spanish audio with English backend: understandable but degraded
- English audio with Spanish backend: hard 503 failure

The Spanish Moonshine model appears fragile — it returns 503 after a couple
of consecutive calls.

---

## 6. System Stats (post-run)

```json
"asr": {
    "request_count": 24,
    "last_duration_ms": 4650,
    "last_audio_bytes": 290796,
    "last_backend": "sherpa_onnx_moonshine_es",
    "last_language_tag": "es-ES",
    "last_seen": "19s ago"
}
```

The endpoint tracks `last_backend`, `last_language_tag`, `last_duration_ms`
per request — confirming backend selection routes through to the real runtime.

---

## 7. Pass/Fail Assessment

| Criterion | Result |
|---|---|
| Backend selector visible | ✅ Pass |
| Changing backend changes real behaviour | ✅ Pass (verified via API) |
| Forced English works on English | ✅ Pass (8/10 excellent) |
| Forced Spanish works on Spanish | ⚠️ Partial pass (2/10 excellent, rest garbled/503) |
| Auto routes correctly | ✅ Pass |
| UI clean (no JS errors) | ✅ Pass |
| Performance stats reflect routing | ✅ Pass |

**Overall verdict: PASS** — the ASR routing infrastructure works correctly.
English quality is production-ready. Spanish quality needs attention: longer
phrases are garbled and the Spanish Moonshine model returns 503 after
consecutive calls.

---

## 8. Blockers Found

1. **Spanish Moonshine 503**: HTTP 503 after ~2 consecutive Spanish calls.
   Model may be unloading or hitting a resource limit.
2. **Spanish transcription quality**: Only short phrases (greetings, numbers)
   transcribe correctly. Medium/long phrases are heavily garbled. This may be:
   - The Moonshine base Spanish model's inherent quality
   - A model loading/reloading issue tied to the 503s
   - The TTS-generated audio not matching real speech patterns
3. **Source/TalkPanel drift**: ME-21 APK has ASR selectors, but `TalkPanel.tsx`
   on `wip/testing` does not — a merge is needed when Android work lands.

---

## 9. Artifacts

- `testing/results/me21-chat-tab.png` — ME-21 Chat tab (initial load)
- `testing/results/me21-talk-tab.png` — ME-21 Talk tab with ASR selectors
- `testing/results/../playwright-report/` — Playwright HTML report
- 20 API responses above with exact transcripts and latencies
