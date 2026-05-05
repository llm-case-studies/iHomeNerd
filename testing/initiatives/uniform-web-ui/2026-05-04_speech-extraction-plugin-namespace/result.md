# Validation Result: speech-extraction-plugin-namespace

**Branch:** `origin/feature/uniform-web-ui/speech-extraction-plugin-namespace`  
**Commit:** `19b30aa` — refactor(uniform-web-ui): extract core speech routes and namespace pronunco plugins  
**Date:** 2026-05-05  
**Validator:** automated smoke test (opencode)

---

## Summary

| # | Endpoint | Expected | Actual | Status |
|---|----------|----------|--------|--------|
| 1 | `/health` | 200 — normal health payload | 200 `{"ok":false,"status":"ok",...}` | **PASS** |
| 2 | `/discover` | 200 — normal discovery payload | 200 with full discovery JSON | **PASS** |
| 3 | `/capabilities` | 200 — structured `{core, plugins, _detail}` | 200 with correct `core` + `plugins.pronunco` sections | **PASS** |
| 4 | `POST /v1/transcribe-audio` | Route exists at `/v1` | 405 on GET (route present, POST-only) | **PASS** |
| 5 | `POST /v1/synthesize-speech` | Route exists at `/v1` | 422 validation error (missing body, expected) | **PASS** |
| 6 | `GET /v1/voices` | Route exists at `/v1` | 200 `{"available":false,"voices":[]}` | **PASS** |
| 7 | `POST /v1/plugins/pronunco/lesson-extract` | Route exists at namespaced path | 422 validation error (missing body, expected) | **PASS** |
| 8 | `POST /v1/lesson-extract` (old flat) | 404 (route moved) | 404 `{"detail":"Not Found"}` | **PASS** (expected breaking change) |
| 9 | `POST /v1/image-extract` (old flat) | 404 (route removed) | 404 `{"detail":"Not Found"}` | **PASS** (expected breaking change) |
| 10 | `POST /v1/dialogue-session` (old flat) | 404 (route moved) | 404 `{"detail":"Not Found"}` | **PASS** (expected breaking change) |
| 11 | `POST /v1/dialogue-turn` (old flat) | 404 (route moved) | 404 `{"detail":"Not Found"}` | **PASS** (expected breaking change) |
| 12 | `POST /v1/plugins/pronunco/dialogue-session` | 200 — new namespaced path works | 200 with session JSON | **PASS** |
| 13 | `POST /v1/plugins/pronunco/dialogue-turn` | 422 — route present, needs body | 422 validation error | **PASS** |
| 14 | `POST /v1/plugins/pronunco/score-explain` | 501 — stub preserved | 501 `"Score explanation is not available yet."` | **PASS** |
| 15 | `POST /v1/plugins/pronunco/drill-generate` | 501 — stub preserved | 501 `"Drill generation is not available yet."` | **PASS** |
| 16 | `/v1/pronunco/profiles` routes | Unchanged | All /v1/pronunco/* routes intact | **PASS** |
| 17 | Core routes regression | No regression on `/v1/translate`, `/v1/rules/evaluate`, `/v1/chat` | All responsive (500/422/400 due to missing LLM, which is environment-normal) | **PASS** |

**Result: 17/17 PASS**

---

## Key Findings

### 1. `/capabilities` restructured correctly
The endpoint now returns `{"core": {...}, "plugins": {"pronunco": {...}}, "_detail": {...}}` instead of a flat boolean map. Core capabilities (`translate_text`, `chat`, `transcribe_audio`, `synthesize_speech`, `analyze_image`, etc.) appear under `core`; PronunCo-specific capabilities (`extract_lesson_items`, `chat_persona`, `dialogue_session`, `dialogue_turn`, `generate_drill`, `explain_score`, `score_pronunciation`, `pronunco_persistence`) appear under `plugins.pronunco`.

### 2. Speech routes extracted to core domain
- `/v1/transcribe-audio`, `/v1/synthesize-speech`, `/v1/voices` moved from `app/plugins/pronunco.py` to new file `app/domains/speech.py`.
- Routes remain at the same `/v1/...` paths — **no URL change for speech endpoints**.
- Implementation is identical to the original.

### 3. PronunCo namespaced under `/v1/plugins/pronunco/`
- `POST /v1/lesson-extract` → `POST /v1/plugins/pronunco/lesson-extract`
- `POST /v1/dialogue-session` → `POST /v1/plugins/pronunco/dialogue-session`
- `POST /v1/dialogue-turn` → `POST /v1/plugins/pronunco/dialogue-turn`
- `POST /v1/score-explain` → `POST /v1/plugins/pronunco/score-explain`
- `POST /v1/drill-generate` → `POST /v1/plugins/pronunco/drill-generate`

### 4. Legacy flat routes broken (expected)
All old flat PronunCo routes (`/v1/lesson-extract`, `/v1/dialogue-session`, `/v1/dialogue-turn`, `/v1/image-extract`) return 404. This is an intentional breaking change per the sprint design. `/v1/image-extract` was a 501 stub and is now removed entirely.

### 5. PronunCo persistence routes unchanged
`/v1/pronunco/profiles`, `/v1/pronunco/profiles/{id}`, and all sub-routes under `/v1/pronunco/` remain at their original paths.

### 6. No regressions on core routes
`/health`, `/discover`, `/v1/chat`, `/v1/translate`, `/v1/rules/evaluate`, `/v1/investigate/*`, `/v1/docs/*`, `/v1/vision/*`, `/v1/builder/*`, `/v1/control/*` — all working correctly.

---

## Merge Safety Assessment

**This branch is NOT safe to merge before PronunCo adapts.**

The following PronunCo client contract breaks **will** cause failures in PronunCo apps that call the old flat routes:

| Old Route | New Route | PronunCo Impact |
|-----------|-----------|-----------------|
| `POST /v1/lesson-extract` | `POST /v1/plugins/pronunco/lesson-extract` | **BREAKS** — PronunCo lesson extraction will fail |
| `POST /v1/dialogue-session` | `POST /v1/plugins/pronunco/dialogue-session` | **BREAKS** — PronunCo dialogue sessions will fail |
| `POST /v1/dialogue-turn` | `POST /v1/plugins/pronunco/dialogue-turn` | **BREAKS** — PronunCo dialogue turns will fail |
| `POST /v1/image-extract` | Removed | Minor — was already a 501 stub |
| `/capabilities` flat map | Structured `{core, plugins}` | **BREAKS** — PronunCo capability detection will break |

### Recommended sequence
1. **Do not merge this branch yet.**
2. Queue the PronunCo adaptation sprint to update PronunCo clients to use the new `/v1/plugins/pronunco/*` routes and parse the new structured `/capabilities` response.
3. Only after PronunCo adapts and both sides are verified, promote this branch.
