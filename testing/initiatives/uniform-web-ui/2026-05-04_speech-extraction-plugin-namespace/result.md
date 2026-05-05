# Validation Result - Speech Extraction + Plugin Namespace

**Date:** 2026-05-04
**Initiative:** `uniform-web-ui`
**Sprint:** `2026-05-04_speech-extraction-plugin-namespace`
**Branch:** `feature/uniform-web-ui/speech-extraction-plugin-namespace`

## Exact Response Shape for `/capabilities`

```json
{
    "core": {
        "translate_text": false,
        "chat": false,
        "summarize_document": false,
        "query_documents": false,
        "ingest_folder": true,
        "investigate_network": true,
        "investigate_scan": true,
        "evaluate_rules": true,
        "transcribe_audio": false,
        "synthesize_speech": false,
        "analyze_image": false
    },
    "plugins": {
        "pronunco": {
            "extract_lesson_items": false,
            "chat_persona": false,
            "dialogue_session": false,
            "dialogue_turn": false,
            "pronunco_persistence": true,
            "generate_drill": false,
            "explain_score": false,
            "score_pronunciation": false
        }
    },
    "_detail": {
        "...": "..."
    }
}
```

## Route Status/Result

- **Speech routes (Core):**
  - `POST /v1/transcribe-audio`: `503 Service Unavailable` ("ASR engine is not available." - Correct behavior on Acer-HL without whisper).
  - `POST /v1/synthesize-speech`: `503 Service Unavailable` ("Kokoro model files not found. TTS unavailable." - Correct behavior).
  - `GET /v1/voices`: `200 OK` (returns `{"available": false, "voices": []}`).

- **Plugin routes:**
  - `POST /v1/plugins/pronunco/lesson-extract`: `503 Service Unavailable` ("Lesson extraction model is not available yet." - Correct behavior since LLM backend isn't running).

- **Removed routes:**
  - Old flat `POST /v1/lesson-extract`: `404 Not Found`.
  - Flat `POST /v1/image-extract`: `404 Not Found`.

## Final Branch Tip SHA

6e4976c

## One-line Verdict

**PASS** - All acceptance criteria met, routes are appropriately separated and `/capabilities` splits core vs plugins cleanly.
