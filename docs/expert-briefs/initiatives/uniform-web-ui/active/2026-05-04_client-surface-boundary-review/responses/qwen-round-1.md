# Feedback: Client Surface Boundary Review

## Reviewer

- Name / model: qwen
- Date: 2026-05-04

## High-level stance

The 3-layer model (core iHN / adapter-plugin / app-owned) is conceptually sound but the seed document under-specifies the **versioning and stability contract** that separates the layers. Classification without stability semantics is fragile: a route classified as "core" today but without a deprecation policy is indistinguishable in practice from a plugin route that happens to be long-lived.

My overall view: the boundary problem is correctly identified, the need-ladder is a useful analytical tool, and the portfolio working list provides good pressure-test material. However, the seed document treats the boundary as primarily a **spatial** problem (which route goes where) when it is equally a **temporal** problem (which route changes how often, and under what guarantees).

The 3-layer model is workable if we add one more dimension: **stability tier**. Without it, the boundary will drift back into ambiguity within months.

## Route and capability review

### Core iHN surface

- `/health` — **core**. Node liveness and model status. Uncontroversial infrastructure.
- `/discover` — **core**. Brain identity, hostname, capability advertisement. Essential for first-contact.
- `/capabilities` — **core**, but needs structural change. Currently a flat boolean map mixing core and plugin capabilities. Should distinguish stability tiers in the response.
- `/sessions` — **core**. Session lifecycle is cross-cutting infrastructure.
- `/system/stats` — **core**. Operational telemetry. Uncontroversial.
- `/setup/*` — **core**. Bootstrap and trust establishment. Exists on the separate HTTP setup server, confirming its foundational role.
- `/v1/chat` — **core**. The most cross-cutting AI primitive in the portfolio. Every client needs it.
- `/v1/translate` — **core**. Cross-app demand (PronunCo, iLegalFlow, iMedisys). General infrastructure.
- `/v1/transcribe-audio` — **core**. ASR is needed by 5+ portfolio products. Currently misplaced in `plugins/pronunco.py` — should be a domain router.
- `/v1/synthesize-speech` — **core**. TTS is shared infrastructure. Same misplacement as transcribe-audio.
- `/v1/voices` — **core**. Voice metadata is infrastructure, not app logic. Same misplacement.
- `/v1/models` — **core**. Model inventory should be a standalone route, not buried inside `/health` or `/capabilities`. Client apps need to query available models independently.

### Adapter / plugin surface

- `compare_pinyin` — **adapter/plugin**. Does not currently exist in the codebase. If it did, it would be PronunCo-specific phonetic comparison. No plausible cross-app demand.
- `normalize_pinyin` — **adapter/plugin**. Does not currently exist in the codebase. Same reasoning as compare_pinyin.
- `extract_lesson_items` — **adapter/plugin**. The word "lesson" is deeply PronunCo. Even if generalized to "extract structured items from educational material," the semantics are domain-specific.
- `generate_drill` — **adapter/plugin**. Drill generation is pedagogy. No plausible generalization beyond language-learning or training contexts.
- `explain_score` — **adapter/plugin**. Score semantics are defined by the app's rubric. A pronunciation score, a charisma score, and a tax-risk score have nothing in common at the explanation level.
- `chat_persona` — **adapter/plugin**. Persona assignment is prompt engineering, not a core primitive. Currently a capability flag only, not a dedicated route.

### App-owned surface

- PronunCo drill selection and teaching UX
- TelPro-Bro coaching loop design
- Lesson progression and score display
- All UI orchestration, presentation choices, and workflow sequencing

### Unsure / borderline

- `/v1/dialogue-session` and `/v1/dialogue-turn` — **unsure**. The seed lists simulation/roleplay as an open tension. These routes currently live in `plugins/pronunco.py` with PronunCo-specific scenario framing. The underlying primitive (turn management, context window, session lifecycle) is genuinely reusable across 6+ products. But the current implementation's scenario semantics are too tightly coupled to PronunCo. I lean toward extracting a core dialogue primitive with neutral semantics, but this is the single most debatable classification in the review.

## Leakage and confusion

### Concrete leakage

1. **ASR/TTS/voices routes defined inside the PronunCo plugin file.** This is the clearest example of boundary leakage in the current codebase. `/v1/transcribe-audio`, `/v1/synthesize-speech`, and `/v1/voices` in `plugins/pronunco.py` are general AI infrastructure consumed by 5+ portfolio products. Their physical location inside a plugin file makes the boundary invisible and signals incorrect ownership.

2. **Flat capability registry.** `capabilities.py` mixes core capabilities (`chat`, `translate`, `summarize`) with plugin capabilities (`extract_lesson_items`, `generate_drill`, `explain_score`) in a single flat namespace. A client app querying `/capabilities` cannot distinguish between "iHN guarantees this" and "this works only because a specific plugin is loaded."

3. **Plugin routes in the bare `/v1/` namespace.** `/v1/lesson-extract`, `/v1/dialogue-session`, `/v1/score-explain`, `/v1/drill-generate` sit at the same URL level as `/v1/chat` and `/v1/translate`. A client scanning the API surface has no visual cue to distinguish core from plugin.

4. **`/v1/image-extract` duplicates `/v1/vision/extract/{template}`.** Teaching-content image extraction is a special case of structured extraction. This stub route is redundant and should be deleted or folded into the vision router under a PronunCo-specific template.

### False product-level helpers

- `explain_score` — sounds like a general analytics feature. In practice it is PronunCo score pedagogy. The name leaks the product concept.
- `chat_persona` — sounds like identity or routing management. In practice it is model-tier selection for persona-based prompting.
- `extract_lesson_items` — the word "lesson" is deeply PronunCo. If this generalizes, the name should reflect the generalized concept. If not, it should live in a plugin namespace.

### Names and namespacing that should change

- All plugin routes should move from `/v1/route-name` to `/v1/plugins/{plugin_id}/route-name`. Example: `/v1/lesson-extract` → `/v1/plugins/pronunco/lesson-extract`.
- `/v1/dialogue-session` → `/v1/dialogue/sessions` (if extracted to core) or `/v1/plugins/pronunco/dialogue-sessions` (if it stays plugin).
- `/v1/score-explain` → `/v1/plugins/pronunco/score-explain`.
- `/v1/image-extract` → delete or fold into `/v1/vision/extract/lesson_image`.

## Minimal contract for client apps

The smallest stable public iHN surface a client app actually needs:

- `/health` — is the node alive?
- `/discover` — what is this node?
- `/capabilities` — what can it do (with core vs plugin distinction)?
- `/v1/models` — what models are available?
- `/setup/*` — trust establishment
- `/v1/chat` — primary AI capability
- `/v1/translate` — translation
- `/v1/transcribe-audio` — ASR
- `/v1/synthesize-speech` — TTS
- `/v1/voices` — voice discovery
- `/v1/docs/*` — document RAG
- `/v1/vision/*` — OCR and structured extraction
- `/v1/rules/evaluate` — deterministic rules evaluation
- `/v1/sessions` — session management
- `/system/stats` — operational visibility

That is approximately 15 route families. Everything else should be plugin-namespaced, app-owned, or internal.

What apps should own themselves:
- Pedagogy, lesson flow, and drill design
- Coaching loop design and score interpretation
- Domain-specific rules and compliance logic
- Investigation methodology and evidence packaging
- Persona assignment, scenario design, and prompt shaping
- All UI orchestration and presentation choices

## Recommendations

### Top 3 conceptual changes

1. **Add a stability tier dimension to the boundary model.** The current 3-layer model (core / adapter / app-owned) describes *where* things live but not *how they change*. I recommend adding explicit stability tiers:
   - **Tier 0 (bootstrap):** `/setup/*`, `/health`, `/discover`. Never break. Exists on the HTTP setup server.
   - **Tier 1 (core contract):** `/v1/chat`, `/v1/translate`, `/v1/docs/*`, `/v1/vision/*`, `/v1/rules/*`. Breaking changes require deprecation cycles and version bumps.
   - **Tier 2 (plugin namespace):** `/v1/plugins/{plugin_id}/*`. Plugins can evolve independently. No cross-plugin stability guarantees.
   - **Tier 3 (app-owned):** Everything above the API. No iHN stability guarantees.

   Without this dimension, the boundary will drift because "core" and "long-lived plugin" are indistinguishable in practice.

2. **Introduce a plugin namespace prefix at the URL level.** All plugin-owned routes should live under `/v1/plugins/{plugin_id}/...`. This makes the boundary visible without requiring documentation lookup. The PronunCo persistence router (`/v1/pronunco/...`) already follows this pattern informally — formalize it and extend it to all plugin routes.

3. **Split the capability registry response into core and plugin sections.** `/capabilities` should return:
   ```json
   {
     "core": { "chat": true, "translate": true, "transcribe_audio": true },
     "plugins": {
       "pronunco": { "extract_lesson_items": true, "generate_drill": false }
     }
   }
   ```
   This is a small schema change with large boundary payoff. A discovery-first client can immediately reason about what is guaranteed versus what is conditional.

### Top 3 cleanup actions for a later coding/testing sprint

1. **Extract speech domain from PronunCo plugin.** Move `/v1/transcribe-audio`, `/v1/synthesize-speech`, and `/v1/voices` from `plugins/pronunco.py` into a new `domains/speech.py`. Update `main.py` imports. This is a small mechanical change (~50 lines moved) that immediately clarifies the boundary.

2. **Enforce plugin namespace prefix.** Introduce `/v1/plugins/{plugin_id}/` for all plugin-owned routes. Move `lesson-extract`, `dialogue-session`, `dialogue-turn`, `score-explain`, `drill-generate`, and `image-extract` under `/v1/plugins/pronunco/`. Update the capability registry. Update the web UI to handle the new route shape.

3. **Create standalone `/v1/models` route.** Extract model inventory from `/health` and `/capabilities` into a dedicated endpoint returning model metadata (id, name, provider, specialty, context window, quantization). Both the Android app and `mlx-chat-wrapper` reference `/v1/models` when talking to local MLX sidecars — having it as a standalone endpoint normalizes this across platforms.

### One candidate follow-on coding/testing sprint

**"Speech extraction + plugin namespace enforcement" sprint.** Combine actions 1 and 2 above. Goal: after the sprint, no core infrastructure capability is defined inside a plugin file, and no plugin route lives in the bare `/v1/` namespace. Acceptance criteria:
- `curl https://localhost:17777/v1/transcribe-audio` returns 200 and the route is defined in `domains/speech.py`
- `curl https://localhost:17777/v1/lesson-extract` returns 404
- `curl https://localhost:17777/v1/plugins/pronunco/lesson-extract` returns 200
- `/capabilities` response distinguishes core from plugin capabilities

This is scoped enough to complete in one coding session and directly implements the boundary model decisions from this discussion round.

## Portfolio product reclassification

| Product | Current label | Proposed label | Reasoning |
|---|---|---|---|
| `RoadNerd` | deployment / sibling | **deployment** | Separate deployment model with different runtime contract. Should not drive iHN route design. |
| `Edge-Kite` | client / deployment | **node role** | Event-stream recorder and pre-analyzer on edge hardware. Infrastructure pattern, not a user-facing client. |
| `WhoWhe2Wha` | consumer / client | **consumer** | Reads events, plans, and deadlines from iHN. Output-oriented, not API-oriented. Should not shape the core route surface. |
| `ACTCLI` | unclear | **unclear** | Scope is undefined. Could be a thin CLI shell over core capabilities or a full product. Do not build routes for it yet. |
| `m-Beacon` | client | **client** | Analytics and conversion optimization is a real app consuming core capabilities. Good pressure test for whether generic analytics helpers belong in core or adapter. |
| `On-My-Watch` | client | **client** | Strong iHN client for vision and event summarization. Security workflow UX stays app-owned. |
| `iLegalFlow` | client | **client** | Heavy rules and document reasoning consumer. Good test of rules engine versus domain rule packs boundary. |

### Brain-demand cluster implications

| Cluster | Core primitive recommended? | Rationale |
|---|---|---|
| Perception/extraction | **Yes** — `/v1/vision/*`, `/v1/transcribe-audio` | Cross-app demand from 7+ products. General infrastructure. |
| Evaluation/coaching | **No** — score semantics stay adapter | Scores are app-defined. A "generic scorer" is a category mistake. |
| Planning/recommendation | **Partial** — core substrate for structured output | Raw chat and summarize can generate plans. Domain-specific planning logic stays adapter. |
| Simulation/roleplay | **Leaning yes** — core bounded-dialogue primitive | Turn management and session lifecycle are general. Scenario and persona stay in adapters. But this is the most debatable classification. |
| Rules/decision-support | **Yes for engine, no for packs** | `/v1/rules/evaluate` is core. Domain rule files (medical coding, legal compliance) are adapter content. |

## Disagreements, tensions, and uncertainties worth preserving

### 1. Dialogue primitive: core or plugin?

My leaning: extract a core `/v1/dialogue` primitive with neutral semantics (session create, turn add, session get, session delete). Six products want bounded dialogue with turn management.

**Counter-position worth preserving:** Dialogue semantics are inherently app-specific. A "PronunCo scenario rehearsal" is fundamentally different from a "TelPro-Bro roleplay coaching session" and different from "iLegalFlow deposition rehearsal." Extracting a generic dialogue primitive could produce an abstraction so thin it is useless, or so thick it leaks one app's assumptions into others. The safer bet is to keep dialogue in plugin space and let each app define its own session and turn contracts. Core iHN already provides the building blocks (chat, ASR, TTS) — dialogue is orchestration, not infrastructure.

**Why I still lean core:** The shared substrate (turn management, context window trimming, token accounting, session expiry) is genuinely reused. Apps can layer their own scenario semantics on top. The classification is reversible: if the core primitive ends up too thin, we can degrade it to plugin space.

### 2. Stability tiers are missing from the boundary model

The seed document treats the boundary as a spatial classification problem. But without explicit stability tiers, "core" and "long-lived plugin" are indistinguishable in practice. A route classified as core today but without a deprecation policy is functionally the same as a plugin route that happens to be stable.

**Counter-position worth preserving:** Adding stability tiers creates bureaucracy before it creates clarity. The portfolio is still small enough that informal stability is sufficient. Formal tiers should wait until there are enough plugins and clients to make the distinction painful.

**Why I still lean tiers:** The portfolio already has 13 products across multiple domains. The boundary problem exists *because* the portfolio is growing. Waiting for pain before adding structure is how the current leakage happened.

### 3. The over-pruning risk

The seed acknowledges this (open question #7). My concrete concern: if we aggressively push everything into plugin space "just to be safe," we lose the product identity of iHN itself. A Home AI platform that only exposes health, trust, chat, and storage is a thin operating system, not a brain product.

**Proposed heuristic:** "Delete the PronunCo plugin. What routes does the web command center still need?" Those routes are core. This keeps the boundary grounded in a real first-party client rather than abstract generalization.

### 4. The setup server as a litmus test

The separate HTTP setup server (port 17778) implicitly defines the minimum viable surface. Any route that does not appear on the setup server is by definition not needed for bootstrap. This is a useful litmus test: **if a route does not need to be on the setup server, it is not in the minimal core set.**

The setup server currently serves: `/setup/*`, `/discover/peers`, `/discover`, `/health`, `/v1/investigate/environment`, `/cluster/nodes`, `/system/stats`. That is the minimum. Everything else on the HTTPS server is additive.

This tension is worth preserving because it creates a natural boundary test that does not require committee decisions: if a route is not needed before trust is established, it is not Tier 0.

---

*End of Round 1 response. This viewpoint was formed independently, without reading other reviewers' Round 1 responses.*
