# Round 1 Feedback — Client Surface Boundary Review

## Reviewer

- **Name / model:** opencode (grok-4.3)
- **Date:** 2026-05-04

## High-level stance

The 3-layer model (core iHN / adapter/plugin / app-owned) is workable and
necessary to stop spike-mode leakage. The seed correctly flags that usefulness ≠
stable public route, and portfolio examples (PronunCo, iMedisys) make the
boundary concrete. However, the current framing still slightly over-weights
"shared capability" promotion and under-weights deployment/sibling distinctions.

## Route and capability review

- `/health`, `/discover`, `/capabilities`, `/sessions`, `/system/stats`,
  `/setup/*`, `/v1/models` → **core** (stable infra even without any app)
- `/v1/chat`, `/v1/translate`, `/v1/transcribe-audio`, `/v1/synthesize-speech`,
  `/v1/voices` → **core** (general AI substrate)
- `normalize_pinyin`, `compare_pinyin`, `extract_lesson_items`,
  `generate_drill`, `explain_score` → **adapter/plugin** (domain transforms;
  namespacing required)
- `chat_persona` → **app-owned** (pedagogy and persona logic belong above the
  surface)

## Leakage and confusion

- `normalize_pinyin` / `generate_drill` / `explain_score` currently read as if
  they could become top-level routes; they leak PronunCo-specific lesson/score
  semantics into what should be a general surface.
- `chat_persona` and scenario/roleplay framing blur app-owned coaching loops
  with core dialogue primitives.
- No current route names are obviously "product-level" in the wrong way yet, but
  the pinyin/lesson helpers are the clearest candidates for immediate
  namespacing or hiding.

## Minimal contract for client apps

Smallest stable public surface: health/discover/capabilities/sessions + core v1
AI primitives (chat, ASR, TTS, translate, models). Apps should own all pedagogy,
drill selection, score presentation, lesson flow, persona, and domain rules.

## Recommendations

1. Explicitly namespace all pronunciation/lesson/score helpers under
   adapter/plugin (e.g. `/plugins/pronunco/*`) rather than leaving them as
   potential top-level routes.
2. Re-classify RoadNerd/Edge-Kite as deployment/sibling (not clients) and treat
   iLegalFlow/iMedisys rules work as adapter-heavy, not core decision-support
   routes.
3. Treat bounded dialogue/session as core primitive; keep full scenario
   semantics, scoring, and progression in app-owned.

## Disagreement / tension worth preserving

Simulation/roleplay: seed leaves open whether it is core or adapter-owned. I see
bounded chat/dialogue as core substrate, but any pedagogy-scoring or
domain-specific roleplay loop as app-owned. This boundary is still fuzzy and
should stay unresolved until a concrete client (PronunCo vs TelPro-Bro) forces
the distinction.

## Candidate follow-on sprint

Route audit + namespacing pass: take current implementation surface, map every
existing or proposed route/helper against the three layers, produce a concrete
"move to adapter namespace" diff, then run one focused coding sprint on the first
5–7 items.
