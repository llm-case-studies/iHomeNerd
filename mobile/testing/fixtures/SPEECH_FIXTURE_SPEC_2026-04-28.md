# Speech Fixture Specification

**Date:** 2026-04-28
**Audience:** audio recording operators, test harness authors
**Purpose:** define audio fixture format, naming, and phrase pack for
deterministic ASR routing tests

---

## 1. Audio format

| Property | Value |
|---|---|
| Container | WAV (Microsoft RIFF) |
| Sample rate | 16000 Hz |
| Bit depth | 16-bit signed integer PCM |
| Channels | 1 (mono) |
| Byte order | little-endian |

Why 16 kHz mono 16-bit PCM:
- matches Moonshine base model input requirements
- small enough for git LFS or local test runs
- widely supported by recording devices and tooling

## 2. Naming convention

```
{lang}-{seq:03d}-{descriptor}.wav
```

Examples:

| File | Meaning |
|---|---|
| `en-001-short-greeting.wav` | English, phrase 1, short greeting |
| `en-005-long-conversational.wav` | English, phrase 5, long conversational |
| `es-001-short-greeting.wav` | Spanish, phrase 1, short greeting |
| `es-008-medium-question.wav` | Spanish, phrase 8, medium question |

Rules:
- `lang` — lowercase ISO 639-1 (`en`, `es`)
- `seq` — zero-padded 3-digit phrase number, unique per language
- `descriptor` — kebab-case category: `short-greeting`, `medium-question`,
  `long-conversational`, `read-passage`, `numbers`, `names`, `mixed`
- no spaces, no uppercase

## 3. English phrase pack (10 phrases)

| Seq | Descriptor | Text | Notes |
|---|---|---|---|
| en-001 | short-greeting | Hello, how are you today? | 2–4 syllable anchors |
| en-002 | short-greeting | Good morning. | minimal speech |
| en-003 | medium-question | What time does the train leave for downtown? | mid-length, rising intonation |
| en-004 | medium-question | Can you recommend a good restaurant nearby? | common travel pattern |
| en-005 | long-conversational | I've been thinking about learning a new language, maybe Spanish or Mandarin, but I'm not sure which one would be more useful for my career. | >10 s expected, intonation shifts |
| en-006 | long-conversational | The weather this weekend looks perfect for hiking, so I'm planning to head up to the mountains early Saturday morning and come back by Sunday evening. | long run-on, mixed cadence |
| en-007 | numbers | One, two, three, four, five, six, seven, eight, nine, ten. | digit sequence, monotone risk |
| en-008 | names | My name is Alex, and my friends are Maria, James, and Priya. | proper nouns, stress patterns |
| en-009 | read-passage | The quick brown fox jumps over the lazy dog. The early bird catches the worm, but the second mouse gets the cheese. | canonical phrases, clear diction target |
| en-010 | mixed | Okay, so let me check — did you say forty-two dollars or fifty-two dollars? I want to make sure I heard that right. | clarification dialogue, numbers in speech |

## 4. Spanish phrase pack (10 phrases)

| Seq | Descriptor | Text | Notes |
|---|---|---|---|
| es-001 | short-greeting | Hola, ¿cómo estás? | standard greeting |
| es-002 | short-greeting | Buenos días. | minimal |
| es-003 | medium-question | ¿A qué hora sale el tren para el centro? | mid-length, rising intonation |
| es-004 | medium-question | ¿Me puede recomendar un buen restaurante por aquí? | common travel |
| es-005 | long-conversational | He estado pensando en aprender un nuevo idioma, tal vez francés o alemán, pero todavía no me decido cuál sería más útil para mi trabajo. | >10 s expected |
| es-006 | long-conversational | El clima de este fin de semana parece perfecto para hacer senderismo, así que planeo salir el sábado temprano y volver el domingo por la tarde. | long run-on |
| es-007 | numbers | Uno, dos, tres, cuatro, cinco, seis, siete, ocho, nueve, diez. | digit sequence |
| es-008 | names | Mi nombre es Alex, y mis amigos son María, Jaime, y Sofía. | proper nouns, accents |
| es-009 | read-passage | En un lugar de la Mancha, de cuyo nombre no quiero acordarme, no ha mucho tiempo que vivía un hidalgo de los de lanza en astillero. | literary, canonical Spanish |
| es-010 | mixed | A ver, déjame confirmar — ¿dijiste cuarenta y dos pesos o cincuenta y dos pesos? Quiero asegurarme de que escuché bien. | clarification dialogue |

## 5. Expected-result template

For each phrase fixture, the test harness should produce a result record
following this template:

```md
## {{lang}}-{{seq:03d}}-{{descriptor}}

**Audio:** `{{lang}}-{{seq:03d}}-{{descriptor}}.wav`
**Expected transcript:** {{text}}

### Test run {{run_id}}

| Field | Value |
|---|---|
| Timestamp | {{iso_timestamp}} |
| Backend | {{asr_backend}} (e.g. `moonshine-base-en`) |
| Language tag | {{lang_tag}} (e.g. `en-US`, `es-ES`) |
| Mode | {{asr_mode}} (`auto` / `forced`) |
| Latency (ms) | {{elapsed_ms}} |
| Actual transcript | {{transcript}} |
| Match | ✅ / ❌ |
| Notes | {{free_text}} |
```

The match field should use a lenient comparison:
- case-insensitive
- punctuation-normalised
- accent/diacritic aware (Spanish `á` matched if base transcript is close)
- `✅` if the actual transcript is a reasonable rendering of the spoken
  phrase; `❌` only when the output is clearly wrong (wrong language,
  garbled, or empty)

## 6. Recording guidance

- record in a quiet environment
- speak at natural conversational pace
- aim for 5–15 cm mouth-to-mic distance
- each file should contain the single phrase only (trim silence at edges)
- leave ~0.2 s of silence before and after each phrase
- label each file immediately after recording

## 7. Cross-reference

This fixture pack supports:
- `mobile/testing/requests/ME21_CROSS_TEST_REQUEST_2026-04-28.md` (ASR routing validation)
- future CI-based speech routing tests
- backend `/v1/transcribe-audio` contract validation
