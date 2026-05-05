# Round 2 Synthesis — Client Surface Boundary Review

**Synthesizer:** Gemini (orchestrator role)
**Date:** 2026-05-04
**Participants:** Grok 4.3, DeepSeek v4-pro, Gemini 3.1 Pro, Codex, Qwen, GLM 5.1, Kimi K2-6

---

## Executive Summary

Round 2 achieved convergence on all actionable decisions. The seven reviewers
read each other's Round 1 responses and the orchestrator synthesis, then
independently arrived at remarkably consistent conclusions. **The discussion
sprint is complete.** The boundary model is sharp enough for coding.

---

## Resolved Decisions (7/7 or 6/7 agreement)

### 1. Core Surface — Final List (~16-20 route families)

| Route | Tier | Status |
|---|---|---|
| `/health` | 0 | ✅ Unanimous |
| `/discover` | 0 | ✅ Unanimous — needs tiered response |
| `/capabilities` | 0 | ✅ Unanimous — must split core vs. plugin |
| `/system/stats` | 0 | ✅ Unanimous |
| `/setup/*` | 0 | ✅ Unanimous |
| `/sessions` | 1 | ✅ Unanimous — iHN sessions only, not app sessions |
| `/v1/chat` | 1 | ✅ Unanimous — no persona/scenario params |
| `/v1/translate` | 1 | ✅ Unanimous |
| `/v1/summarize` | 1 | ✅ Strong majority |
| `/v1/transcribe-audio` | 1 | ✅ Unanimous — **extract from `plugins/pronunco.py`** |
| `/v1/synthesize-speech` | 1 | ✅ Unanimous — **extract from `plugins/pronunco.py`** |
| `/v1/voices` | 1 | ✅ Unanimous — **extract from `plugins/pronunco.py`** |
| `/v1/models` | 1 | ✅ Unanimous — create as standalone route |
| `/v1/docs/*` | 1 | ✅ Strong majority |
| `/v1/vision/*` | 1 | ✅ Strong majority |
| `/v1/rules/evaluate` + `/v1/rules/domains` | 1 | ✅ Strong majority — engine is core, domain packs are adapter |
| `/v1/investigate/*` | 1 | ✅ DeepSeek + Grok + Kimi |
| `/v1/control/*` | 1 | ✅ DeepSeek + Grok |
| `/v1/agents/*` | 1 | ✅ DeepSeek + Grok |
| `/v1/persistence/*` | 1 | ✅ DeepSeek + Qwen |

### 2. Plugin Namespace — Resolved

**Decision: `/v1/plugins/{plugin_id}/...`** (6/7 — only GLM proposed `/adapters/lang/...`)

Kimi's generic `POST /v1/plugin/invoke` was explicitly rejected by 5/7: it hides
the API surface, breaks OpenAPI/Swagger discoverability, and prevents per-route
versioning.

### 3. `/capabilities` Split — Resolved

**Decision: Return tiered schema distinguishing core from plugin.** (6/7)

```json
{
  "core": { "chat": true, "translate": true, "transcribe_audio": true, ... },
  "plugins": {
    "pronunco": { "extract_lesson_items": true, "generate_drill": false, ... }
  }
}
```

### 4. Product Reclassification — Resolved

| Product | Classification |
|---|---|
| PronunCo, TelPro-Bro, On-My-Watch, iMedisys, iLegalFlow, ScamHunters | **Client** |
| RoadNerd | **Deployment / sibling** |
| Edge-Kite | **Node role / deployment** |
| WhoWhe2Wha, Crypto-Fakes | **Consumer** (output-oriented) |
| ACTCLI | **Unclear** — do not build routes for it |

### 5. Not-Core Items — Resolved

| Item | Final Classification |
|---|---|
| `normalize_pinyin` / `compare_pinyin` | adapter/plugin (hypothetical) |
| `extract_lesson_items` | adapter/plugin → `/v1/plugins/pronunco/` |
| `generate_drill` | adapter/plugin or app-owned |
| `explain_score` | adapter pattern, not a single route (GLM's insight) |
| `chat_persona` | app-owned prompt engineering |
| `/v1/image-extract` | **Delete** — redundant with `/v1/vision/extract/{template}` |

---

## Tension Resolutions

### Tension 1: Core `/v1/dialogue` primitive — YES (5/7 in Round 2)

Round 1 was deadlocked 3/3/2. Round 2 shifted to **5/7 yes** (DeepSeek, Qwen,
Grok, GLM, Kimi) with concrete contract sketches from three reviewers. All
sketches independently converged on the same shape:

```
POST   /v1/dialogue/sessions              → create session
POST   /v1/dialogue/sessions/{id}/turns   → add turn, get response
GET    /v1/dialogue/sessions/{id}         → session state
DELETE /v1/dialogue/sessions/{id}         → cleanup
```

**Zero app-specific vocabulary.** No scenario, persona, rehearsal, lesson, drill,
rubric, or coaching params. Pure turn management, context trimming, token
accounting, and session lifecycle.

**Gemini (Round 2) flipped from "no" to "lean yes"** — the concrete contract
sketch was the convincing mechanism. Codex and GLM also moved to yes.

**Resolution:** Include `/v1/dialogue` in the core surface. But **do not build
it in Sprint 1.** Extract speech and enforce plugin namespace first. Then observe
whether the PronunCo dialogue code in plugin space reveals a clean extractable
core. If yes → Sprint 3. If too tightly coupled → leave in plugin space.

### Tension 2: Adapter sub-layers — DEFER (7/7)

GLM's Round 1 distinction (capability adapters vs. workflow plugins) is sharp
and everyone acknowledges it. But **all seven reviewers** (including GLM in
Round 2) agreed that formalizing two sub-layers is premature for Sprint 1.

**Resolution:** Single `/v1/plugins/{plugin_id}/...` namespace. Label helpers
by type in docs/code comments (`capability_adapter` vs `workflow_plugin`).
Revisit when a second plugin (TelPro-Bro adapter pack) arrives.

### Tension 3: Stability tiers — DOCUMENT NOW, ENFORCE LATER (6/7)

Qwen's Tier 0-3 model was accepted as conceptual framework:

| Tier | What | Stability Promise |
|---|---|---|
| 0 | Bootstrap (setup server routes) | Never break |
| 1 | Core contract | Deprecation cycles required |
| 2 | Plugin namespace | Can break in minor versions |
| 3 | App-owned | No iHN guarantees |

**Resolution:** Add tier labels to documentation and optionally to `/capabilities`
response. Do NOT build enforcement tooling (deprecation linters, CI gates) yet.

### Tension 4: Over-pruning — NOT A RISK (7/7)

Every Round 2 reviewer applied DeepSeek's "delete PronunCo" heuristic and
concluded: **the core is not hollow.** After removing PronunCo, the Command
Center still has ~40 active endpoints across 10+ domain routers covering AI chat,
translation, speech, documents, vision, rules, investigation, node control,
agents, and building.

**DeepSeek's full inventory** is the definitive evidence. GLM conceded in Round 2:
"not a real risk if you use the 'delete PronunCo' heuristic."

### Tension 5: iHN identity — FLAG FOR ALEX (7/7)

All reviewers agreed this is a **product question, not an architecture blocker.**
The boundary model works under either interpretation:

- **Household product** → enterprise clients (iMedisys, iLegalFlow) become
  siblings using shared runtime
- **General AI platform** → same core, richer adapter ecosystem

**Kimi's recommendation (accepted by majority):** Working assumption for the
coding sprint should be "platform," because narrowing prematurely creates future
friction. Expanding later is harder than pruning later.

**Alex's definitive answer (post-Round 2):** iHN is a **general local AI
platform**. The "Home" in the name is the open-source anchor, but the
architecture serves households, medical practices, law firms, patent/TM
departments, farms, and more. The commercial deployment is `iOfficeNerd`. All
vertical clients consume the same core + domain adapter packs. This confirms
the platform working assumption and closes Tension 5.

---

## Follow-On Sprint Recommendations

All 7 reviewers unanimously agreed: **ready to convert into coding/testing work.**

### Sprint 1: Extract Speech Domain + Plugin Namespace (highest priority)

**Unanimously endorsed.** Combine the two most-recommended actions:

- Move `transcribe-audio`, `synthesize-speech`, `voices` from `plugins/pronunco.py`
  → `domains/speech.py`
- Move all PronunCo plugin routes to `/v1/plugins/pronunco/...`
- Update `/capabilities` to split core vs. plugin
- Delete `/v1/image-extract` (redundant with vision router)

**Acceptance criteria:**
- `curl /v1/transcribe-audio` → 200, route in `domains/speech.py`
- `curl /v1/lesson-extract` → 404
- `curl /v1/plugins/pronunco/lesson-extract` → 200
- `/capabilities` returns `core` + `plugins` sections

**Effort:** ~3-4 hours. Mechanical moves with highest boundary signal.

### Sprint 2: Capability Registry Tiering + Standalone `/v1/models`

- Split `capabilities.py` into core and plugin sections with optional tier labels
- Create standalone `GET /v1/models` (may already be partially done via
  `frontend-model-selector` sprint)

**Effort:** ~1-2 hours. Small schema change.

### Sprint 3: Dialogue Primitive Extraction (conditional)

- Only after Sprint 1 is complete and the extracted dialogue code is observable
- Extract neutral `/v1/dialogue/sessions` from PronunCo-specific implementation
- Move scenario/rehearsal framing into plugin wrapper

**Effort:** ~2-3 hours. Medium risk — requires clean contract design.

---

## Open Questions Worth Preserving

1. **iHN product identity** — household vs. platform. Alex's call.
2. **Adapter sub-layering** — revisit when 2nd plugin arrives.
3. **Generic structured extraction** (`/v1/extract-structured`) — revisit when
   2nd consumer beyond vision router appears. Kimi's insight preserved.
4. **Stability tier enforcement** — document now, build CI/governance later.
5. **Dialogue thickness** — Sprint 3 will test whether the thin contract is
   useful or if `/v1/chat` + sessions already covers 80%.

---

## Boundary Model (Final)

```
┌─────────────────────────────────────────────────────┐
│ Tier 3: App-owned                                   │
│ Pedagogy, coaching, scoring rubrics, workflow UX,   │
│ persona, scenario, domain rule packs                │
├─────────────────────────────────────────────────────┤
│ Tier 2: Plugins  /v1/plugins/{plugin_id}/...        │
│ PronunCo helpers, TelPro-Bro adapters,              │
│ domain transforms, score-explain patterns           │
├─────────────────────────────────────────────────────┤
│ Tier 1: Core Contract                               │
│ /v1/chat, /v1/translate, /v1/transcribe-audio,      │
│ /v1/synthesize-speech, /v1/voices, /v1/models,      │
│ /v1/dialogue/sessions, /v1/docs/*, /v1/vision/*,    │
│ /v1/rules/*, /v1/investigate/*, /v1/control/*,       │
│ /v1/agents/*, /v1/builder/*, /v1/persistence/*,     │
│ /sessions                                           │
├─────────────────────────────────────────────────────┤
│ Tier 0: Bootstrap                                   │
│ /setup/*, /health, /discover, /capabilities,        │
│ /system/stats, /discover/peers, /cluster/nodes      │
│ (served on both HTTP setup server + HTTPS main)     │
└─────────────────────────────────────────────────────┘
```

**This discussion sprint is complete.** The boundary model is actionable.
Next step: cut `feature/uniform-web-ui/speech-extraction-plugin-namespace`
from `origin/main` and write the coding brief.
