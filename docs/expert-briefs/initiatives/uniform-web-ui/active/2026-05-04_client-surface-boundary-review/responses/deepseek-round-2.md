# Round 2 Synthesis — Client Surface Boundary Review

## Synthesizer

- **Name / model:** DeepSeek-v4-pro
- **Date:** 2026-05-04
- **Round:** 2 (critique and synthesis)

---

## Decision summary

### Stable core iHN surface

These are the routes that survive the "delete PronunCo plugin" heuristic — the
Command Center still needs every one of them:

| Route family | Classification | Notes |
|---|---|---|
| `/health` | **core (Tier 1)** | Uncontroversial. Setup server mirrors this — Tier 0 eligible. |
| `/discover` | **core (Tier 1)** | Needs tiered response (core vs plugin sections). Setup server Tier 0. |
| `/capabilities` | **core (Tier 1)** | Needs core/plugin split in response. 5/7 reviewers agree. |
| `/sessions` | **core (Tier 1)** | With naming discipline: iHN runtime sessions only, not app lesson sessions. |
| `/system/stats` | **core (Tier 1)** | Uncontroversial. |
| `/setup/*` | **core (Tier 0)** | Bootstrap trust. The only routes the HTTP setup server (17778) serves. |
| `/v1/chat` | **core (Tier 1)** | Must stay generic. No persona/scenario/roleplay params. Accepts `system_prompt`. |
| `/v1/translate` | **core (Tier 1)** | General AI primitive. |
| `/v1/summarize` | **core (Tier 1)** | Not in seed item list but active in codebase. Cross-app demand. |
| `/v1/transcribe-audio` | **core (Tier 1)** | Currently in `plugins/pronunco.py`. Must move to core domain router. |
| `/v1/synthesize-speech` | **core (Tier 1)** | Same misplacement. |
| `/v1/voices` | **core (Tier 1)** | Same misplacement. |
| `/v1/models` | **core (Tier 1)** | Should be standalone, not embedded in `/health`. |
| `/v1/docs/*` | **core (Tier 1)** | RAG infrastructure. Cross-app demand from 6+ products. |
| `/v1/vision/*` | **core (Tier 1)** | OCR, image analysis, structured extraction templates. Cross-app. |
| `/v1/investigate/*` | **core (Tier 1)** | Node environment discovery. Infrastructure, not app-specific. |
| `/v1/control/*` | **core (Tier 1)** | SSH node control plane. |
| `/v1/agents/*` | **core (Tier 1)** | Agent listing and task delegation. |
| `/v1/builder/*` | **core (Tier 1)** | Image building infrastructure. |
| `/v1/rules/evaluate` | **core (Tier 1)** | The rules evaluation engine is general. Domain rule *packs* are adapter. |
| `/v1/rules/domains` | **core (Tier 1)** | Discovery of available rule domains. |
| `/v1/persistence/*` | **core (Tier 1)** | Generic app storage. |

**Total: ~20 route families.** Larger than the "12-16" quoted in the synthesis
because it includes domain routers (docs, vision, rules, investigate, control,
agents, builder, persistence) that were not in the seed's item list.

### Adapter / plugin / helper surface

| Item | Classification | Notes |
|---|---|---|
| `compare_pinyin` | **adapter/plugin** | Does not exist in codebase. Hypothetical. If created: `/v1/plugins/pronunco/pinyin-compare`. |
| `normalize_pinyin` | **adapter/plugin** | Does not exist in codebase. Hypothetical. If created: `/v1/plugins/pronunco/pinyin-normalize`. |
| `/v1/lesson-extract` | **adapter/plugin** | Move to `/v1/plugins/pronunco/lesson-extract`. The "lesson" noun is PronunCo-specific. |
| `/v1/dialogue-session` | **adapter/plugin — with a note** | The current PronunCo-specific implementation belongs in plugin space. A *generic* bounded-dialogue primitive is the most contested classification (see Tension 1 below). |
| `/v1/dialogue-turn` | **same as dialogue-session** | Move with its parent. |
| `/v1/score-explain` | **adapter/plugin** | Stub (501). Move to `/v1/plugins/pronunco/score-explain`. Score semantics are domain-specific. |
| `/v1/drill-generate` | **adapter/plugin** | Stub (501). PronunCo pedagogy. Move to `/v1/plugins/pronunco/drill-generate`. |
| `/v1/image-extract` | **delete** | Stub (501). Redundant with `/v1/vision/extract/{template}`. Add a `lesson_image` template to the vision router if needed. |
| `/v1/pronunco/*` (19 persistence routes) | **adapter/plugin** | Already correctly namespaced. Model for other plugins. |
| `chat_persona` | **adapter/plugin** | Capability only, no route. Persona is prompt engineering — pass as `system_prompt` to `/v1/chat`. Not a core route. |
| `explain_score` (capability) | **adapter/plugin — but treat as pattern** | GLM's insight: this is N different domain-specific explanation functions with a shared structural pattern. It should be an adapter template, not a route. |
| `extract_lesson_items` (capability) | **adapter/plugin** | Keep in PronunCo plugin. Kimi's proposal to generalize to core `/v1/extract-structured` is architecturally sound *in principle* but premature — only one consumer exists. Defer. |
| `generate_drill` (capability) | **adapter/plugin** | PronunCo pedagogy. Uncontroversial. |

### App-owned surface

- All pedagogy, lesson flow, drill design (PronunCo)
- Coaching loop design and score rubrics (TelPro-Bro)
- Medical coding logic, coverage rules, compliance workflows (iMedisys)
- Legal strategy, filing checklists, exhibit workflows (iLegalFlow)
- Investigation methodology, evidence packaging (ScamHunters)
- Persona assignment, scenario design, prompt shaping
- All UI orchestration, presentation choices, and workflow sequencing
- Domain-specific rule packs (medical coding .yaml, legal compliance .yaml, tax rules .yaml)

### Product reclassification

| Product | Current | Recommended | Rationale |
|---|---|---|---|
| `RoadNerd` | deployment / sibling | **deployment** | 4/7 reviewers agree. Separate deployment model, not a client. |
| `Edge-Kite` | client / deployment | **node role** | 4/7 reviewers want a "runtime participant" category. Kimi and GLM note this gap. |
| `WhoWhe2Wha` | consumer / client | **consumer** | Output-oriented. Doesn't drive interactive iHN APIs. |
| `ACTCLI` | unclear | **unclear** | Scope undefined. Cannot classify. Don't build routes. |
| `Crypto-Fakes` | sibling | **destination** | Publication destination, not an API client. |

---

## Points of agreement (7/7 reviewers)

1. The 3-layer model (core / adapter-plugin / app-owned) is workable and necessary
2. ASR/TTS/voices are core infrastructure, not PronunCo features
3. Their current location in `plugins/pronunco.py` is the clearest boundary leak
4. Plugin routes need explicit namespacing — flat `/v1/` for both core and plugin is unsustainable
5. All pinyin helpers, drill generation, score explanation, and chat persona belong in adapter/plugin or app-owned space
6. Route usefulness during a spike does not qualify a route for stable core status
7. Apps should own pedagogy, coaching, scoring rubrics, workflow UX, and persona

## Points of agreement (5-6/7 reviewers)

1. `/capabilities` response should distinguish core from plugin capabilities
2. `RoadNerd` and `Edge-Kite` should be reclassified as deployment/node-role, not clients
3. A standalone `/v1/models` route is needed
4. The PronunCo persistence router (`/v1/pronunco/...`) already demonstrates correct plugin namespacing
5. The setup server (port 17778) implicitly defines a minimum viable surface

---

## Response to the five specific tensions from Round 2 kickoff

### Tension 1: Core bounded-dialogue primitive — yes or no?

**My answer: Yes, with a strictly minimal contract that passes the "no PronunCo vocabulary" test.**

The split is 3/7 yes, 3/7 no, 2/7 unsure — genuine deadlock. The way through is to
test whether a contract can be written that is useful without being leaky.

Here is a concrete route contract that uses zero PronunCo, coaching, or pedagogy vocabulary:

```
POST /v1/dialogue/sessions
  Request: { model: string, system_prompt?: string, max_turns?: number,
             voice?: string, context_window?: number }
  Response: { session_id: string, created: timestamp }

POST /v1/dialogue/sessions/{session_id}/turns
  Request: { text: string, audio?: binary }
  Response: {
    turn_id: string,
    response_text: string,
    response_audio?: binary,
    turn_number: int,
    tokens_used: int,
    session_truncated: bool
  }

GET /v1/dialogue/sessions/{session_id}
  Response: { session_id, status, turn_count, created, last_active }

DELETE /v1/dialogue/sessions/{session_id}
  Response: 204

GET /v1/dialogue/sessions  (optional, with ?active=true filter)
```

**What this adds over `/v1/chat`**: Server-side turn history management. With
`/v1/chat`, the client must resend the full message array on every turn. With
`/v1/dialogue`, the server maintains the context window, trims when needed, and
reports truncation. This is the shared substrate that 6 products are
reimplementing independently.

**What this does NOT include**: No scenario, persona, roleplay, score, rubric,
retry policy, coaching loop, drill, or lesson vocabulary. No app-specific params.

**The reversible bet**: If this proves too thin to be useful, it degrades to
plugin space. If it proves too thick, we trim it. The classification is
reversible. But extracting it *later* after 6 apps have built their own
incompatible dialogue state machines is harder.

**My recommendation for Round 2 decision**: Do not build `/v1/dialogue` in the
first sprint. Do not decide permanently. Instead: implement the first sprint
(speech extraction + plugin namespacing), then observe how PronunCo's dialogue
code looks when extracted to plugin space. If it reveals a clean extractable
core, pull it up in sprint 2. If it stays deeply PronunCo-specific, leave it.

### Tension 2: Adapter/plugin — one layer or two?

**My answer: One layer with namespacing for now. GLM's insight is sharp but premature to formalize.**

GLM's distinction between stateless capability adapters (pinyin normalizer) and
stateful workflow plugins (drill generator) is correct at the conceptual level.
But implementing it means designing two registration mechanisms, two versioning
models, and two stability contracts — for a system that doesn't yet have even
one.

**Recommendation**: Ship `/v1/plugins/{plugin_id}/...` namespacing first. If,
after 2-3 plugins exist, the distinction between thin stateless adapters and
heavy stateful plugins creates real pain, then formalize the split. The
namespacing alone will prevent the worst leaks — the sub-typing is an
optimization, not a prerequisite.

Kimi's proposal of a generic `POST /v1/plugin/invoke` route is a **wrong turn**.
It obscures the API surface, breaks OpenAPI/Swagger discoverability (which
FastAPI auto-generates), and makes per-route versioning and deprecation harder.
Explicit namespaced routes (`/v1/plugins/pronunco/lesson-extract`) are the
correct pattern.

### Tension 3: Stability tiers — formalize now or defer?

**My answer: Document tiers; defer formal enforcement to a later sprint.**

Qwen's Tier 0-3 model maps cleanly to the existing architecture:

| Tier | What | Where | Stability promise |
|---|---|---|---|
| Tier 0 | Bootstrap | Setup server (17778) + main server | Never break. Hardest contract. |
| Tier 1 | Core product | `/v1/` (domain routers, not plugins) | Deprecation cycle, version bumps. |
| Tier 2 | Plugins | `/v1/plugins/{id}/` | No cross-plugin guarantees. Can break in minor versions. |
| Tier 3 | App-owned | Above the API | iHN makes no promises. |

The counter-argument — "this is premature bureaucracy" — has merit. But the
portfolio already spans 13 products. The boundary problem exists *because* the
portfolio is growing faster than the architecture. Waiting for pain before adding
structure is exactly how the ASR-in-PronunCo-plugin leakage happened.

**Recommendation**: Formalize Tier 0 and Tier 1 by documenting them in the UI
Contract. Tier 0 is already implicit (setup server routes) and costs nothing to
name. Tier 1 is descriptive of current behavior. Do not build enforcement tooling
(deprecation linters, version-bump CI checks) yet — just write down which routes
are in which tier. The `/capabilities` split (core vs plugin) naturally encodes
the Tier 1 vs Tier 2 distinction in the API response. This is enough for now.

### Tension 4: Over-pruning risk — apply DeepSeek's heuristic

**"Delete the PronunCo plugin. What does the Command Center still need?"**

Here is the full inventory after removing every route that lives in or depends on
`plugins/pronunco.py` and `plugins/pronunco_persistence.py`:

| Remaining surface | Route families |
|---|---|
| Node identity and health | `/health`, `/discover`, `/capabilities`, `/system/stats` |
| Trust and bootstrap | `/setup/*` (6 routes) |
| AI primitives | `/v1/chat`, `/v1/translate`, `/v1/summarize` |
| Document intelligence | `/v1/docs/collections`, `/v1/docs/ingest`, `/v1/docs/ask` |
| Vision intelligence | `/v1/vision/analyze`, `/v1/vision/ocr`, `/v1/vision/extract/{template}`, `/v1/vision/templates`, `/v1/vision/status` |
| Investigation | `/v1/investigate/environment`, `/v1/investigate/scan` |
| Rules engine | `/v1/rules/evaluate`, `/v1/rules/domains`, `/v1/rules/validate/{domain}`, `/v1/rules/files/{domain}` |
| Node control plane | `/v1/control/nodes`, `/v1/control/preflight`, `/v1/control/promote`, `/v1/control/nodes/{id}/actions`, `/v1/control/nodes/{id}/updates`, `/cluster/nodes` |
| Agents and builder | `/v1/agents`, `/v1/agents/{id}/task`, `/v1/builder/resources`, `/v1/builder/build` |
| Persistence | `/v1/persistence/apps`, `/v1/persistence/apps/{app}`, `/v1/persistence/stats` |
| Session management | `/sessions` |
| Peer discovery | `/discover/peers` |

**After removing the PronunCo plugin, the surface loses:**
- `/v1/lesson-extract` (active PronunCo helper)
- `/v1/dialogue-session` and `/v1/dialogue-turn` (active, but PronunCo-specific framing)
- `/v1/score-explain` (stub)
- `/v1/drill-generate` (stub)
- `/v1/image-extract` (stub)
- `/v1/transcribe-audio`, `/v1/synthesize-speech`, `/v1/voices` (extracted to core in sprint 1)
- All 19 PronunCo persistence routes under `/v1/pronunco/`

**What remains is a substantial product:**
- It has node control (6 route families)
- It has AI capabilities in 6 domains (chat, translate, docs, vision, rules, investigation)
- It has cluster orchestration (control, agents, builder)
- It has generic infrastructure (sessions, persistence, peer discovery)
- It has ~40 active endpoints across 10+ domain routers

**Verdict: This is not hollow.** The Command Center alone provides a rich local
AI platform. The "over-pruning" risk is real in theory but overstated in
practice. The proposed core surface is conservative without being anemic.

### Tension 5: iHN identity — household product or general local AI platform?

**My answer: This is a product decision, not an architecture decision. Flag for Alex. The proposed boundary model works either way.**

Kimi flagged this most sharply and it matters. But the architecture doesn't need
an answer today because the core surface we've converged on is identity-agnostic:

- Household-as-platform: `/health`, `/discover`, `/setup`, `/control`, chat, ASR,
  TTS, docs, vision, rules — these all serve privacy-first household computing.
- General local AI platform: the same surface also serves iMedisys, iLegalFlow,
  ScamHunters, m-Beacon — domain-specific logic is in adapters, not core.

The boundary model doesn't change. What changes is *which adapters and plugins
get first-class support*.

**Recommendation**: Preserve this as a product-strategy tension, not an
architecture blocker. If Alex decides iHN is household-only, then iMedisys and
iLegalFlow become sibling products using a shared runtime rather than "clients"
of iHN's core surface. If Alex decides iHN is a general platform, the core
surface remains the same but the adapter ecosystem gets richer. Either way, the
boundary model we've designed works.

---

## Explicit contradictions between reviewers

### Contradiction 1: `extract_lesson_items` — adapter or core generic extraction?

| Position | Advocates |
|---|---|
| Purely adapter/plugin — "lesson" is PronunCo vocabulary | DeepSeek, Qwen, Gemini, Codex, GLM, Grok (6/7) |
| Extract a generic core `/v1/extract-structured` primitive | Kimi (1/7) |

**Resolution**: Kimi is architecturally right that "structured extraction from
documents" is a general pattern. But generalizing it now — with only one consumer
(PronunCo) — risks designing a generic API in a vacuum. **Defer to a future
sprint.** When a second product asks for structured extraction (iMedisys for
medical bills, iLegalFlow for contracts, Kitchen for receipts), then generalize
with real requirements. For now, keep `lesson-extract` in the PronunCo plugin
namespace and use `/v1/vision/extract/{template}` for the templates that already
exist (receipt, invoice, medical_bill, tax_form).

### Contradiction 2: Dialogue primitive — 3 vs 3 deadlock

Covered in Tension 1 above. **Recommendation: defer decision, observe after
sprint 1.**

### Contradiction 3: Plugin URL scheme — namespaced routes vs generic invoke

| Position | Advocates |
|---|---|
| Explicit namespaced routes: `/v1/plugins/{id}/...` | DeepSeek, Qwen, Gemini, Grok, Codex (5/7) |
| Generic invoke: `POST /v1/plugin/invoke` | Kimi (1/7) |
| Adapter-prefix scheme: `/adapters/lang/...` | GLM (1/7) |

**Resolution**: Namespaced routes win. Generic invoke hides the API surface,
breaks tooling (OpenAPI/Swagger), and prevents per-route versioning. GLM's
`/adapters/` prefix is interesting but adds a second URL root that competes with
`/v1/plugins/`. **Settle on `/v1/plugins/{plugin_id}/...` for all plugin-owned
routes.**

### Contradiction 4: `generate_drill` — adapter/plugin or app-owned?

| Position | Advocates |
|---|---|
| Adapter/plugin | DeepSeek, Qwen, Gemini, Grok, Kimi (5/7) |
| App-owned | GLM, Codex (2/7) |

**Resolution**: Both positions agree it's not core, which is the only boundary
that matters for this sprint. GLM and Codex argue drill generation is pure
pedagogy that should live in the PronunCo client. Pragmatically, since it's a
stub (501) today, the question is moot until someone implements it. **Classify as
adapter/plugin** (under `/v1/plugins/pronunco/`) since PronunCo needs a server
side to call the models, but with the understanding that the "Pedagogy" flag
means it could be reclassified as app-owned if PronunCo implements it client-side.

### Contradiction 5: `Edge-Kite` classification

| Position | Advocates |
|---|---|
| Separate deployment / node role | DeepSeek, Grok, Codex, Qwen (4/7) |
| Deployment variant of client pattern (similar to On-My-Watch) | GLM (1/7) |
| Missing "runtime participant" category | Kimi (1/7) |

**Resolution**: GLM has a sharp observation — both On-My-Watch and Edge-Kite
want event monitoring and triage. But the interaction model differs: On-My-Watch
has a human-in-the-loop watching events; Edge-Kite runs autonomously as an edge
pre-analyzer. The boundary model doesn't need to resolve this for the client
surface review because Edge-Kite isn't a client app consuming iHN routes — it's
more likely an autonomous agent or sidecar that uses internal/investigation
primitives. **Classify as "node role / autonomous agent."** If it needs routes,
they are investigation/event primitives already in core, not new client-facing
routes.

---

## Which open questions still deserve to remain open

### Keep open for Round 3 or later:

1. **Bounded-dialogue primitive** — 3/3/2 split is genuine deadlock. Observe
   after sprint 1 whether the extracted dialogue-session code in plugin space
   reveals a clean extractable core. If yes, propose a PR. If no, close the
   question.

2. **Adapter sub-typing (capability adapters vs. workflow plugins)** — GLM's
   insight is valuable but premature to implement. Revisit after 2-3 plugins
   exist and their lifecycle needs differ in practice.

3. **Formal stability tier enforcement** — Document tiers now (costs nothing).
   Build enforcement tooling later (when deprecation is painful).

4. **iHN product identity** — This is Alex's call. The architecture doesn't
   block on it.

5. **`extract_lesson_items` → generic extraction** — Revisit when a second
   product needs structured extraction from documents.

### Resolved (close these):

1. ASR/TTS/voices belong in core → **resolved. Extract to `domains/speech.py`.**
2. Plugin namespacing is needed → **resolved. Use `/v1/plugins/{plugin_id}/...`.**
3. `/capabilities` must distinguish core from plugin → **resolved. Split the response.**
4. `/v1/models` should be standalone → **resolved. Create the route.**
5. `RoadNerd` is deployment, not client → **resolved. Reclassify.**
6. `Edge-Kite` is node role, not client → **resolved. Reclassify.**
7. `WhoWhe2Wha` is consumer → **resolved. Reclassify.**
8. `compare_pinyin`/`normalize_pinyin` are adapter → **resolved. Hypothetical anyway.**
9. `generate_drill` is adapter/plugin → **resolved for now. Revisitable.**
10. `chat_persona` is adapter/app-owned → **resolved. Pass as `system_prompt` to chat.**
11. `explain_score` is adapter (pattern, not route) → **resolved. GLM's pattern insight accepted.**
12. Generic invoke (`/v1/plugin/invoke`) vs namespaced routes → **resolved. Namespaced routes win.**

---

## Conversion readiness assessment

**Yes — ready to convert into coding/testing work.**

The first two sprints are clear, uncontroversial, and directly validate the
boundary model. Deeper disagreements (dialogue primitive, adapter sub-typing,
stability enforcement) are not blocking — they are open questions that subsequent
sprints can address with real code rather than speculation.

What must be true before coding starts:

1. The exit condition from the seed (`01-seed.md`) is satisfied: we can state the
   stable core surface, the adapter/plugin surface, and the app-owned surface
   with reasonable confidence.
2. The unresolved tensions are informative, not blocking.
3. The first sprint action (extract speech domain) is scoped, mechanical, and
   reverses an acknowledged error — low risk, high signal.

---

## Candidate follow-on sprints (smallest useful first)

### Sprint 1: Extract speech domain + capability registry split

**Priority: highest. Unanimously endorsed.**

Scope:
- Create `domains/speech.py` with `APIRouter(prefix="/v1")`
- Move `/v1/transcribe-audio`, `/v1/synthesize-speech`, `/v1/voices` from `plugins/pronunco.py:352-433` to the new router
- Update imports in `main.py` — include the speech router, keep PronunCo plugin imports for remaining routes
- Update `/capabilities` response to distinguish `core` from `plugins`:
  ```json
  {
    "core": { "chat": true, "translate": true, "transcribe_audio": true, ... },
    "plugins": { "pronunco": { "extract_lesson_items": true, ... } }
  }
  ```
- Update `capabilities.py` to support the split registration

Acceptance criteria:
- `curl https://localhost:17777/v1/transcribe-audio` returns 200 and route is in `domains/speech.py`
- `/capabilities` returns core/plugins split
- PronunCo's dialogue-session code still works (it imports from speech domain)
- No regression in the Command Center UI (any page that used transcribe/synthesize/voices)

Effort: ~2 hours. Highest signal-to-effort ratio of any possible action.

### Sprint 2: Plugin namespace enforcement

**Priority: high. 5/7 reviewers recommend.**

Scope:
- Move all remaining PronunCo plugin routes under `/v1/plugins/pronunco/`:
  - `/v1/lesson-extract` → `/v1/plugins/pronunco/lesson-extract`
  - `/v1/dialogue-session` → `/v1/plugins/pronunco/dialogue-sessions`
  - `/v1/dialogue-turn` → `/v1/plugins/pronunco/dialogue-sessions/{id}/turns`
  - `/v1/score-explain` → `/v1/plugins/pronunco/score-explain`
  - `/v1/drill-generate` → `/v1/plugins/pronunco/drill-generate`
  - `/v1/image-extract` → delete (redundant with vision router), or move to plugin namespace
- Update `plugins/pronunco_persistence.py` if needed (already at `/v1/pronunco/`)
- Update capability registry entries to reflect new names
- Update any web UI references to these routes

Acceptance criteria:
- `curl https://localhost:17777/v1/lesson-extract` returns 404
- `curl https://localhost:17777/v1/plugins/pronunco/lesson-extract` returns 200
- No PronunCo-specific route lives in bare `/v1/` namespace
- Capability registry references the new namespaced paths

Effort: ~3-4 hours. Larger mechanical change but high boundary payoff.

### Sprint 3: Standalone `/v1/models` route

**Priority: medium. May already be in progress via `frontend-model-selector` sprint.**

Scope:
- Create `GET /v1/models` returning model metadata (id, name, provider, specialty, context_window, quantization)
- Update references in `/health` and `/capabilities` to point to the models route
- Update frontend model selector to use the dedicated endpoint

Effort: ~1 hour. Small but important normalization.

### Future sprint (not yet scheduled): Bounded-dialogue evaluation

**Priority: low. Depends on observing sprint 2 outcome.**

Scope:
- After plugin namespacing, inspect the extracted PronunCo dialogue-session code
- Determine if a generic `/v1/dialogue` primitive is extractable
- If yes: propose a PR with the concrete contract from Tension 1 above
- If no: document why and close the question

**Do not schedule this until sprint 2 is complete.**

---

## Final boundary model

```
┌─────────────────────────────────────────────────┐
│ App-owned                                       │
│ Pedagogy, coaching, scoring rubrics, workflow   │
│ UX, persona, domain rule packs                  │
├─────────────────────────────────────────────────┤
│ Adapter/Plugin (Tier 2)                         │
│ /v1/plugins/{plugin_id}/...                     │
│ PronunCo helpers, TelPro-Bro adapters,          │
│ domain transforms, persona config               │
├─────────────────────────────────────────────────┤
│ Core iHN (Tier 1)                               │
│ /v1/chat, /v1/translate, /v1/transcribe-audio,  │
│ /v1/synthesize-speech, /v1/voices, /v1/models,  │
│ /v1/docs/*, /v1/vision/*, /v1/rules/*,          │
│ /v1/investigate/*, /v1/control/*, /v1/agents/*, │
│ /v1/builder/*, /v1/persistence/*, /sessions     │
├─────────────────────────────────────────────────┤
│ Bootstrap (Tier 0)                              │
│ /setup/*, /health, /discover, /system/stats,    │
│ /discover/peers, /cluster/nodes                 │
│ (served on both setup and main server)          │
└─────────────────────────────────────────────────┘

Sibling/Deployment (not clients):
  RoadNerd, Edge-Kite, iOfficeNerd
  (may share runtime, don't drive route design)

Consumers (not API clients):
  WhoWhe2Wha, Crypto-Fakes
  (consume outputs, don't drive route design)
```

---

*End of Round 2 synthesis. Formed by comparing 7 independent Round 1 responses
against the seed document, portfolio inventory, and actual codebase route
surface.*
