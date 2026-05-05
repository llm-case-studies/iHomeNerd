# Client Surface Boundary Review - Codex Round 2

## Reviewer

- Name / model: Codex
- Date: 2026-05-04
- Inputs read: seed pack, orchestrator Round 1 synthesis, seven Round 1
  responses, synthesis template

## Decision Summary

- Stable core iHN surface: node identity, trust/bootstrap, health/discovery,
  capabilities, sessions, system stats, models, chat, translate, docs/RAG,
  vision/OCR, rules engine, speech primitives, persistence/artifact substrate.
- Adapter/plugin/helper surface: app/domain transforms, optional capability
  packs, schema/rubric binding, score explanation patterns, PronunCo helpers,
  domain rule packs, domain-specific structured extraction schemas.
- App-owned surface: pedagogy, coaching loops, drill selection, persona and
  scenario definitions, legal/medical/tax workflow decisions, investigation
  methodology, UX orchestration, presentation state.
- Additional bucket to preserve: deployment/node-role surface. RoadNerd,
  Edge-Kite, Android node-class app, Mac brain, and iOfficeNerd-like variants
  may shape runtime contracts without being ordinary client apps.

My conversion recommendation: ready for coding/testing work, but only for the
high-convergence cleanup lanes. Do not use the first coding sprint to settle
the dialogue primitive, full plugin invocation model, or formal stability
governance.

## Points Of Agreement

- The current boundary leak is real and not just aesthetic.
- `useful helper` is not the same as `stable iHN route`.
- Health, discovery, setup, stats, sessions, chat, translate, models, ASR, TTS,
  voices, docs, vision, and generic rules are core or very strong core
  candidates.
- PronunCo/language helpers should not live in the top-level stable route
  namespace.
- Speech routes are core even if their implementation currently sits near
  PronunCo. The strongest concrete correction is to extract ASR/TTS/voices into
  a core speech domain.
- `/capabilities` must stop making core and plugin/helper capabilities look
  equivalent.
- Plugin/helper routes need visible namespacing.
- Apps own pedagogy, score rubrics, persona/scenario semantics, and UX loops.

## Contradictions Between Reviewers

- Dialogue primitive: DeepSeek and Qwen lean core; Gemini and GLM lean against
  a separate core primitive; Grok and Kimi preserve uncertainty; my Round 1 view
  leaned core but reversible.
- Adapter/plugin shape: most reviewers accept one namespaced layer; GLM wants
  capability adapters vs workflow plugins; Gemini distinguishes iHN-hosted
  plugins from client-side adapters; Kimi proposes generic plugin invocation.
- Stability tiers: Qwen wants explicit tiers; Kimi and DeepSeek see value;
  others imply tiering but worry about process overhead.
- Structured extraction: Kimi argues `extract_lesson_items` reveals a general
  structured-extraction primitive; most reviewers classify the lesson helper as
  adapter/plugin because the word `lesson` carries PronunCo semantics.
- Over-pruning: GLM, Qwen, and DeepSeek warn that too much pruning hollows out
  iHN; Gemini and my Round 1 response bias toward conservative pruning.
- Product identity: Kimi calls out the household-vs-platform contradiction most
  sharply; the portfolio wants both household control and professional local AI
  clients.

## Five Tensions

### 1. Core bounded-dialogue primitive: yes, but not first implementation

My judgment: yes, a neutral core `/v1/dialogue` primitive is defensible, but it
should be specified before implementation and should not be bundled into the
first cleanup sprint.

The contract can be written without PronunCo vocabulary:

```http
POST /v1/dialogue/sessions
```

Request:

```json
{
  "model": "optional-model-id",
  "instructions": "optional app-provided behavior constraints",
  "ttlSeconds": 3600,
  "maxTurns": 20,
  "metadata": {
    "client": "optional-client-id"
  }
}
```

Response:

```json
{
  "id": "dlg_...",
  "createdAt": "2026-05-04T00:00:00Z",
  "expiresAt": "2026-05-04T01:00:00Z",
  "model": "resolved-model-id",
  "turns": [],
  "limits": {
    "maxTurns": 20
  }
}
```

```http
POST /v1/dialogue/sessions/{session_id}/turns
```

Request:

```json
{
  "role": "user",
  "content": "text",
  "attachments": []
}
```

Response:

```json
{
  "sessionId": "dlg_...",
  "turnId": "turn_...",
  "message": {
    "role": "assistant",
    "content": "text"
  },
  "usage": {
    "inputTokens": 123,
    "outputTokens": 45
  }
}
```

Also:

- `GET /v1/dialogue/sessions/{session_id}`
- `DELETE /v1/dialogue/sessions/{session_id}`

What is deliberately absent:

- no `persona_id`
- no `scenario`
- no `drill`
- no `score`
- no coaching rubric
- no PronunCo/TelPro-Bro vocabulary

This primitive is only server-managed turn state, expiration, context trimming,
model resolution, and usage accounting. Scenario semantics remain adapter or
app-owned. If this contract still feels too thin after route inventory, defer
it.

### 2. Adapter/plugin: one layer now, typed metadata later

Use one URL namespace now:

```text
/v1/plugins/{plugin_id}/...
```

But do not lose GLM's distinction. Add metadata in route inventory and
capability registry:

- `kind: capability_adapter`
- `kind: workflow_plugin`
- `host: ihn`
- `host: client`

Do not create separate route trees yet. Separate trees would add ceremony
before we know how many actual plugin/helper routes survive the audit.

### 3. Stability tiers: document now, partial schema later

Formalize tiers as decision vocabulary now:

- Tier 0: bootstrap/setup surface
- Tier 1: stable core iHN contract
- Tier 2: plugin/helper namespace
- Tier 3: app-owned
- Internal/experimental: visible only to operators or dev tools

Do not require a full deprecation governance system before the first cleanup
sprint. The first concrete step should be route/capability inventory fields:

- `surface`
- `stability`
- `owner`
- `namespace`

After that, `/capabilities` can expose enough metadata for clients without
turning Round 2 into standards work.

### 4. Over-pruning: thin core must still be useful Command Center product

Apply DeepSeek's test: delete the PronunCo plugin. What does Command Center
still need?

It still needs:

- node health, discovery, setup, trust, stats
- models and provider metadata
- chat
- docs/RAG
- vision/OCR
- rules engine, at least generic evaluator
- ASR/TTS/voices as general tools
- sessions and persistence/artifact handles
- capabilities split by core/plugin/internal

That feels like a product: a local Home brain control center with useful
general AI tools. If we prune below that into only health/trust/chat/storage,
iHN becomes a thin local AI OS and loses product identity. So speech, docs,
vision, rules-engine, and model inventory should stay core.

### 5. iHN identity: household product first, local AI platform second

iHN should stay anchored as a household/local node product: trust, discovery,
node control, local models, privacy, resilience, and first-party Command Center.

Healthcare, legal, marketing, investigation, and coaching clients should
pressure-test the general primitives and plugin system. They should not expand
core into medical, legal, tax, marketing, or investigation routes.

This preserves both truths:

- iHN can support professional/private local AI apps.
- iHN core should not become the union of those apps' domain nouns.

## Route / Capability Decisions

| Item | Current state | Recommended home | Notes |
|---|---|---|---|
| `/health` | core route | core, Tier 0/1 | Required for bootstrap and operation. |
| `/discover` | core route | core, Tier 0/1 | Should distinguish node identity from plugin inventory. |
| `/capabilities` | core route, flat semantics | core route with split sections | Must separate core, plugins, internal/experimental. |
| `/sessions` | core route | core with naming constraint | iHN runtime sessions, not app lesson/case sessions. |
| `/system/stats` | core route | core | Command Center and operators need it. |
| `/setup/*` | setup/core route | core, Tier 0 | Bootstrap and trust are product-defining. |
| `/v1/chat` | core route | core | Keep generic; no persona/scenario semantics. |
| `/v1/translate` | core route | core | General translation; lesson-aware translation stays plugin/app. |
| `/v1/transcribe-audio` | currently PronunCo-adjacent per reviewers | core speech domain | Highest-confidence coding move. |
| `/v1/synthesize-speech` | currently PronunCo-adjacent per reviewers | core speech domain | Same as ASR. |
| `/v1/voices` | currently PronunCo-adjacent per reviewers | core speech domain | Voice inventory is infrastructure. |
| `/v1/models` | core candidate / in progress elsewhere | core | Model inventory should be standalone. |
| `compare_pinyin` | helper/hypothetical | plugin capability adapter | Namespaced language/PronunCo helper. |
| `normalize_pinyin` | helper/hypothetical | internal or plugin capability adapter | Do not make public unless a plugin explicitly needs it. |
| `extract_lesson_items` | PronunCo-shaped helper | plugin workflow or adapter schema | Preserve Kimi's generic extraction point, but the lesson route is not core. |
| `generate_drill` | PronunCo-shaped helper | app-owned or workflow plugin | Pedagogy is not core. |
| `explain_score` | recurring pattern | plugin pattern, not single core route | Per-domain rubrics; shared pattern only. |
| `chat_persona` | capability/prompt pattern | app-owned or workflow plugin | Use core `instructions`/chat, not a core persona route. |

## Product Classification Decisions

- True/current clients: PronunCo, TelPro-Bro, On-My-Watch, iMedisys,
  iLegalFlow, ScamHunters, likely iForeclosed if pursued.
- Adapter-heavy clients: iMedisys, iLegalFlow, iForeclosed, tax/chooser,
  m-Beacon.
- Output consumers: WhoWhe2Wha, Crypto-Fakes-style publication outputs.
- Deployment/node-role/sibling pressure tests: RoadNerd, Edge-Kite, Android
  node-class app, Mac brain promotion path, iOfficeNerd-like variants.
- Unclear: ACTCLI until it is defined as product, shell, or operator workflow.

## Open Questions To Keep Open

- Exact `/v1/dialogue` contract and whether it should ship before the second
  real consumer exists.
- Whether plugin invocation should be direct namespaced routes or generic
  `POST /v1/plugin/invoke`.
- How much stability metadata belongs in `/capabilities` immediately versus
  documentation first.
- Whether structured extraction deserves a core schema-driven endpoint beyond
  existing docs/vision routes.
- Whether iOfficeNerd is a client, sibling, or deployment variant.

## Candidate Follow-On Sprints

1. `uniform-web-ui-route-inventory-and-surface-map`
   - no behavior change
   - inventory actual backend routes and advertised capabilities
   - classify each as Tier 0, core, plugin/helper, internal, app-owned bridge,
     or deployment/node-role
   - recommended first because several Round 1 responses referenced actual
     route placement and the next coding sprint should not rely on memory

2. `uniform-web-ui-speech-core-extraction`
   - move ASR/TTS/voices into a core speech domain router
   - preserve old routes only if needed as temporary aliases
   - update `/capabilities` to mark speech as core
   - focused, high-confidence, low conceptual risk

3. `uniform-web-ui-plugin-namespace-and-capability-split`
   - introduce `/v1/plugins/{plugin_id}/...` for PronunCo helpers
   - split `/capabilities` into core and plugin sections
   - leave dialogue primitive out unless a separate decision is made

I would not combine all three into one sprint. The first coding sprint should
be either inventory-only or speech extraction. Namespacing plus capability
schema changes can follow with better evidence.

## Conversion Decision

- Ready to convert into coding/testing sprint? `yes`
- Recommended first branch topic:
  `feature/uniform-web-ui/route-inventory-and-surface-map`
- If product momentum needs code immediately:
  `feature/uniform-web-ui/speech-core-extraction`

Round 2 has enough agreement to start. The unresolved tensions are useful, but
they do not block the first cleanup moves. They should shape the route
inventory and the plugin namespace design rather than freeze the initiative.
