# Round 2 Synthesis: Client Surface Boundary Review

**Synthesizer:** Grok 4.3  
**Date:** 2026-05-04  
**Based on:** round-1-synthesis.md + 7 independent Round 1 responses (codex, deepseek, gemini, glm, grok, kimi-k2-6, qwen)  
**Round:** 2 (critique & synthesis)

---

## Decision summary

### Stable core iHN surface
- `/health`, `/discover`, `/capabilities` (with core vs plugin split in response), `/sessions`, `/system/stats`, `/setup/*`
- `/v1/chat`, `/v1/translate`, `/v1/transcribe-audio`, `/v1/synthesize-speech`, `/v1/voices`, `/v1/models` (standalone)
- `/v1/docs/*`, `/v1/vision/*`, `/v1/rules/evaluate`, `/v1/investigate/*`, `/v1/control/*`, `/v1/agents/*`, `/v1/builder/*`, `/v1/persistence/*`
- Narrow bounded-dialogue primitive: `/v1/dialogue/sessions`, `/v1/dialogue/sessions/{id}/turns` (neutral contract only)
- **~16-18 route families.** All must stand alone without any single app (PronunCo, iMedisys, etc.).

### Adapter / plugin / helper surface
- Single namespaced layer for v1: `/v1/plugins/{plugin_id}/...` (or `/adapters/{domain}/...`)
- Items: `normalize_pinyin`, `compare_pinyin`, `extract_lesson_items` (or generalize to `extract-structured` + schema), `explain_score` (as shared pattern, not single route), `chat_persona` (as config), `lesson-extract`, `score-explain`, `image-extract` (delete or vision template), PronunCo persistence routes
- Note GLM distinction (capability adapters stateless vs workflow plugins stateful) — adopt in docs/patterns, not separate sub-layers yet.
- All current PronunCo-origin helpers move here. Capability registry must reflect plugin section.

### App-owned surface
- `generate_drill`, lesson progression, drill selection, coaching loops, score display/interpretation, all UX orchestration, persona definitions, domain workflows (medical coding logic, legal strategy, scam investigation methodology, tax interview flows)
- Apps supply `system_prompt`, scenario schemas, rubrics, and orchestration on top of core primitives.

### Sibling / deployment / consumer vs true clients
- **True clients** (drive interactive core + adapters): PronunCo, TelPro-Bro, iMedisys, ScamHunters / iScamHunter, On-My-Watch, iLegalFlow, m-Beacon
- **Siblings / deployment / node roles**: RoadNerd (deployment model), Edge-Kite (node role / event pre-analyzer / runtime participant), iOfficeNerd (sibling variant)
- **Consumers / output-oriented**: WhoWhe2Wha (deadlines/plans/events), Crypto-Fakes (publication destination)
- **Unclear**: ACTCLI (possible thin CLI shell or operator workflow — needs clarification before route design)

---

## Points of agreement (universal or strong majority)

- Core list above (7/7 on health/discover/capabilities/sessions/stats/setup/chat/translate/speech primitives/models)
- Speech extraction: move `/v1/transcribe-audio`, `/v1/synthesize-speech`, `/v1/voices` from `plugins/pronunco.py` to `domains/speech.py` (DeepSeek, Qwen, Gemini, Codex, Grok — highest-signal unanimous rec)
- Plugin namespace prefix `/v1/plugins/{plugin_id}/...` (DeepSeek, Qwen, Gemini, Grok, Kimi, Codex)
- Reclassify RoadNerd/Edge-Kite as deployment/node-role (Grok, DeepSeek, Codex, Qwen; Kimi/GLM note missing "runtime participant" category)
- Minimal core surface ~12-16 families
- Usefulness ≠ stable public route; PronunCo leakage (ASR/TTS in plugin file, flat capabilities, bare `/v1/` plugin routes) is real and urgent
- Apps own pedagogy, coaching, scoring rubrics, UX, domain rules/packs, persona/scenario definitions
- `/capabilities` must split core vs plugin sections
- Command Center heuristic (DeepSeek) is useful test for "thin but not hollow"

---

## Points of tension / contradictions between reviewers (explicit notes)

1. **Core bounded-dialogue primitive (`/v1/dialogue`) — yes or no? (Tension 1)**  
   DeepSeek/Qwen/Codex lean **yes** (shared turn management, context, token accounting across 6 products: PronunCo, TelPro-Bro, iLegalFlow, ScamHunters, ACTCLI, m-Beacon).  
   Gemini/GLM lean **no** (chat + sessions sufficient; semantics inherently app-specific).  
   Grok/Kimi **unsure** (preserve fuzziness).  
   **My resolution:** Yes — narrow neutral contract only. Concrete sketch:  
   - `POST /v1/dialogue/sessions {model, voice?, system_prompt?, max_turns?}`  
   - `GET /v1/dialogue/sessions/{id}`  
   - `POST /v1/dialogue/sessions/{id}/turns {input, role?}`  
   - `DELETE /v1/dialogue/sessions/{id}`  
   No "scenario", "persona_id", "rubric", "pronunciation" in contract. Apps supply system_prompt and manage scenario above. Works without PronunCo vocabulary. Reversible if too thin. Keeps "how thick" open.

2. **Adapter/plugin — one layer with namespacing, or two sub-layers? (Tension 2)**  
   GLM proposes split: **capability adapters** (stateless, e.g. pinyin normalize, tax-form detection) vs **workflow plugins** (stateful orchestration, e.g. drill generator, coaching loop).  
   Others (DeepSeek, Qwen, Grok, Codex) use **one layer + namespacing**.  
   **My rec:** Start with single namespaced layer (`/v1/plugins/{id}/...`) for first sprint. Adopt GLM distinction in documentation and patterns (stateless vs stateful) for later refinement. Namespace first makes boundary visible; sub-typing can follow without blocking.

3. **Stability tiers (Tier 0-3) — formalize now or defer? (Tension 3)**  
   Qwen (strongest), Kimi, DeepSeek propose explicit tiers (Tier 0 bootstrap/setup, Tier 1 core contract, Tier 2 plugin, Tier 3 app-owned) with deprecation semantics.  
   Others flag as premature bureaucracy.  
   **My rec:** Defer full enforcement in code. Add `stability` metadata to `/capabilities` response and docs now (Tier 0/1/2/3). Document the model; implement versioning policy in follow-on sprint. Qwen's framework is sound but not blocking for cleanup.

4. **Over-pruning risk — is "thin core" becoming "hollow product"? (Tension 4)**  
   GLM/Qwen/DeepSeek worry conservative pruning makes iHN "OS plumbing" instead of AI brain.  
   Codex/Gemini say conservative bias is correct.  
   DeepSeek heuristic applied: "Delete PronunCo plugin. What does web Command Center still need?" → health, discover, capabilities, sessions, stats, setup, chat, translate, docs/*, vision/*, rules/evaluate, investigate/*, control/*, agents/*, builder/*, persistence/*, models, speech (standalone tools in UI).  
   **Result:** Still feels like a product (household AI brain + control plane + general capabilities), not hollow OS. Risk is real but not triggered by current proposals. Preserve caution; Command Center test passes.

5. **iHN identity — household product or general local AI platform? (Tension 5)**  
   Kimi flags portfolio pressure: iMedisys (healthcare), iLegalFlow (legal/IP), m-Beacon (marketing analytics), ScamHunters (investigation) are not purely "household". Seed frames around "household node, control-plane, and general AI".  
   **My rec:** Preserve as open product question (flag for Alex). Architecture supports general local AI platform: core = node/household primitives + general AI substrate (chat/ASR/vision/rules/docs); enterprise/professional clients consume same core + heavy domain adapters. Do not expand core for domain rule packs or enterprise semantics. Household roots shape trust/control surface; core remains broader. This tension is informative and should stay unresolved in Round 2.

**Additional contradictions:**
- `extract_lesson_items`: Kimi wants core `/v1/extract-structured` (schema-driven, general pattern) + adapter schema; majority classify as adapter/plugin or app-owned (lesson semantics leak).
- Rules: consensus on core engine (`/v1/rules/evaluate`); domain packs (medical coding, legal compliance, tax) stay adapter content.
- Plugin invocation: Kimi proposes generic `/v1/plugin/invoke`; others prefer direct namespaced routes.

---

## Route / capability decisions

| Item | Current state | Recommended home | Notes |
|------|---------------|------------------|-------|
| `/health` | core | **core** | Uncontroversial |
| `/discover` | core | **core** | Split core/plugin in response |
| `/capabilities` | core (flat) | **core** | Add core vs plugin sections + stability metadata |
| `/sessions` | core | **core** | Generic iHN sessions only |
| `/system/stats` | core | **core** | Operational |
| `/setup/*` | core | **core** | Bootstrap (Tier 0) |
| `/v1/chat` | core | **core** | Generic only; no persona/scenario params |
| `/v1/translate` | core | **core** | General |
| `/v1/transcribe-audio` | misplaced in plugin | **core** (domains/speech.py) | Extract immediately |
| `/v1/synthesize-speech` | misplaced in plugin | **core** (domains/speech.py) | Extract immediately |
| `/v1/voices` | misplaced in plugin | **core** (domains/speech.py) | Extract immediately |
| `/v1/models` | buried in health/capabilities | **core** (standalone) | Confirm existing sprint |
| `compare_pinyin` / `normalize_pinyin` | hypothetical / adapter | **adapter/plugin** | Namespace under lang/phonetics |
| `extract_lesson_items` | adapter/plugin | **adapter/plugin** (or core `extract-structured` + schema) | Kimi dissent preserved; lean adapter for now |
| `generate_drill` | adapter/plugin | **app-owned** | Pedagogy |
| `explain_score` | adapter/plugin | **adapter/plugin** (pattern) | Domain-specific rubrics; shared prompt pattern only |
| `chat_persona` | capability only | **adapter/plugin** (config) | Prompt engineering above core |
| `/v1/dialogue-session` / turns | plugin | **core** (narrow) or adapter | See Tension 1 resolution |
| `/v1/docs/*` / `/v1/vision/*` / `/v1/rules/evaluate` | core | **core** | Cross-portfolio demand |

---

## Candidate follow-on sprints (smallest useful, concrete)

1. **"Speech extraction + plugin namespace enforcement"** (highest priority, unanimous support)  
   - Move `/v1/transcribe-audio`, `/v1/synthesize-speech`, `/v1/voices` from `plugins/pronunco.py` to `domains/speech.py`  
   - Introduce `/v1/plugins/pronunco/*` prefix for all remaining PronunCo helpers (`lesson-extract`, `dialogue-session`, `score-explain`, `drill-generate`, `image-extract`, persistence)  
   - Update `main.py`, capability registry, web UI  
   - Acceptance: `curl /v1/transcribe-audio` works from domains/speech; `curl /v1/lesson-extract` 404s; `curl /v1/plugins/pronunco/lesson-extract` 200s; `/capabilities` shows core vs plugin split

2. **"Capability registry split"** (small schema change)  
   - Update `/capabilities` response to `{ "core": {...}, "plugins": { "pronunco": {...} } }` + stability metadata  
   - Bundle with sprint 1 if possible

3. **"Standalone /v1/models route"** (confirm)  
   - Already in progress via frontend-model-selector; ensure it returns only metadata and is classified core

Deeper topics (dialogue thickness, stability tiers enforcement, plugin invocation contract, iHN identity) remain discussion-only for now.

---

## Conversion decision

- **Ready to convert into coding/testing sprint?** `yes`  
- **Proposed branch topic:** `uniform-web-ui-boundary-cleanup` (or `speech-extraction-plugin-namespace`)  
- **First 1-3 sprints:** speech extraction + namespace (sprint 1 above), capability registry split, models route confirmation  
- **What feedback still missing?** None blocking. The five tensions are now sharper (with concrete contracts and heuristics) but do not prevent v1 cleanup. Deeper product-identity question (household vs platform) is explicitly flagged for owner decision.  
- **Exit condition met:** Stable-enough boundary model exists. Next step is real code changes on `origin/main` after this synthesis.

---

*This synthesis preserves visible disagreement where the boundary remains fuzzy (dialogue thickness, extract_lesson_items generalization, iHN identity) while delivering concrete, actionable cleanup recommendations. It optimizes for a sharper next coding sprint rather than premature consensus.*  
*End of Round 2 response.*  
*File saved to responses/grok-round-2.md*  
*No other files modified.*  
*Discussion-only sprint complete.*  
