# Round 1 Response: Client Surface Boundary Review

**Reviewer:** kimi-k2-6  
**Date:** 2026-05-04  
**Round:** 1 (blind first-pass)

---

## High-level stance

The current boundary problem is real and urgent. The 3-layer model (core / adapter / app-owned) is a workable *starting scaffold*, but it is missing a critical fourth dimension: **runtime vs. product surface**. The seed and portfolio conflate what the node runtime must expose for operational coherence (cluster health, setup, discovery) with what client *applications* consume as product capabilities (chat, transcription, coaching). 

My core stance: **the stable client-facing surface should be smaller than the current working list suggests**, and the gap should be absorbed by a clearer plugin/discovery contract rather than by expanding core routes.

The 3-layer model is workable only if we add explicit **namespacing and discoverability rules** for adapters. Without that, "adapter" becomes a dumping ground for "we're not sure yet."

---

## Route and capability review

| Route / Capability | Classification | Reason |
|---|---|---|
| `/health` | `core` | Operational primitive. Every runtime participant needs it. Not app-specific. |
| `/discover` | `core` | But needs to be **layered**: core capabilities vs. plugin capabilities must be distinguishable. If flat, this leaks boundary confusion. |
| `/capabilities` | `core` | Same concern as `/discover`. Must not advertise plugin routes as if they were product-contract stable. |
| `/sessions` | `core` | Session management is a cross-cutting infrastructure concern, not app logic. |
| `/system/stats` | `core` | Node/household introspection. Stable surface. |
| `/setup/*` | `core` | Trust and provisioning are iHN product-defining. |
| `/v1/chat` | `core` | Generic bounded-dialogue primitive. Contract should accept `system_prompt` / `instructions`, **never** `persona_id` or app-specific scenario params. |
| `/v1/translate` | `core` | General AI capability. Structurally general. |
| `/v1/transcribe-audio` | `core` | Raw ASR. Must stay pure: audio in, text out. Scoring, coaching, or phonetic comparison params must not leak here. |
| `/v1/synthesize-speech` | `core` | Raw TTS. Voice selection belongs here (`/v1/voices`). Coaching overlays do not. |
| `/v1/voices` | `core` | Voice inventory is a product-level primitive. |
| `/v1/models` | `core` | Model inventory. Essential for any client. |
| `compare_pinyin` | `adapter/plugin` | Clearly domain-specific. But needs a **plugin invocation contract**, not a top-level route. |
| `normalize_pinyin` | `adapter/plugin` | Same. Should live under a PronunCo plugin namespace or generic text-normalization plugin. |
| `extract_lesson_items` | `unsure` | **This is where I disagree with the simple "one-app = adapter" rule.** Structurally, this is "structured extraction from documents." PronunCo is the only consumer *now*, but the capability is general. However, the *lesson semantics* are app-owned. My proposal: a core `/v1/extract-structured` or similar primitive, with lesson-specific schemas owned by PronunCo adapter. |
| `generate_drill` | `app-owned` | Pedagogy and workflow logic. PronunCo should own this. |
| `explain_score` | `adapter/plugin` | Score explanation is a cross-cutting pattern (PronunCo, TelPro-Bro, iMedisys, iLegalFlow all need some form of "why was this rated X?"). But the *scoring rubric* is domain-specific. Belongs in a generic `explanation` adapter framework, not core, not purely app-owned. |
| `chat_persona` | `app-owned` | If this means "persona selection UI/UX," yes. If it means "injected system prompt personality," it should be implemented by the app as a `system_prompt` passed to `/v1/chat`. Never a core route parameter. |

---

## Leakage and confusion

### 1. `/discover` and `/capabilities` are likely flat and therefore leaky
If the discovery surface does not distinguish between:
- "this is a stable iHN product route, versioned, contract-guaranteed"
- "this is an optional plugin capability that may not exist on every node"
- "this is an internal helper not meant for client consumption"

...then clients will write against unstable surfaces thinking they are product. **This is the single biggest hidden assumption in the seed: that clients can already tell the difference.** I doubt they can.

### 2. `normalize_pinyin` is the canary, but `explain_score` is the deeper leak
The seed correctly flags `normalize_pinyin` as a leakage example. But `explain_score` is more dangerous because it *looks* like a generic AI capability (explanation) while carrying domain-specific rubric logic. If it becomes a top-level route with a score type enum that includes `pronunciation`, `delivery`, `medical_coding`, and `legal_risk`, the core surface becomes a taxonomy of every app's scoring system. That is category mistake territory.

### 3. The portfolio conflates "interesting startup idea" with "boundary-relevant client"
`iForeclosed` and `m-Beacon` are in the portfolio as `client`. They may be viable products, but they do not share enough primitives with the core iHN story (household node, general AI, trust) to justify expanding the core surface. Including them as boundary-design inputs risks overfitting the architecture to long-tail ideas. **Boundary design should be driven by canary clients with *shared* primitive demands.** PronunCo, TelPro-Bro, iMedisys, and On-My-Watch are sufficient. The rest should be treated as "if the boundary is clean, these are possible," not as requirements.

### 4. `Edge-Kite` and `ACTCLI` classification confusion reveals a missing category
`Edge-Kite` is marked `client / deployment`. `ACTCLI` is marked `unclear`. I think both reveal that the taxonomy needs a **runtime participant** category distinct from client and sibling. Edge-Kite is closer to a node role or sidecar than an app. ACTCLI might be an operator interface. Neither should drive *client surface* boundaries because they may consume *runtime/control* surfaces instead.

---

## Minimal contract for client apps

What a client app **needs** from iHN:

1. **Trust and setup**: join a Home, authenticate, inspect trust state. (`/setup/*`, minimal identity routes)
2. **Health and discovery**: is my node/home healthy? what can it do? (`/health`, `/discover`, `/capabilities` with **layering**)
3. **General AI primitives**: chat, translate, transcribe, synthesize, voice/model inventory. (`/v1/*`)
4. **Session and storage**: create sessions, store/retrieve blobs or recordings. (`/sessions`, minimal storage contract)
5. **Plugin discovery (optional but necessary)**: if a client depends on PronunCo adapters, it needs a way to ask "is the PronunCo plugin loaded? what version?" without hardcoding route URLs.

What client apps **must own**:

- Pedagogy, workflow, scoring rubrics, and UX orchestration.
- Domain-specific normalization and transforms.
- User state, lesson progress, business logic.
- Persona/scenario definitions (implemented as prompt engineering *above* `/v1/chat`).

---

## Concrete classification recommendations

### Recommendation 1: Split `/discover` and `/capabilities` into tiers
Do not return a flat list of "things this node can do." Return:
- `core`: stable, versioned, guaranteed if iHN is running.
- `plugins`: namespaced, optional, versioned per plugin pack.
- `internal`: not for client consumption, omitted from client-facing discovery by default.

This prevents the "everything looks like product" illusion.

### Recommendation 2: Create a generic plugin invocation route instead of hardcoding plugin routes
Instead of `/compare_pinyin` or `/pronunco/drill`, have:
- `POST /v1/plugins/{plugin_name}/{plugin_version}/{action}` 
- or `POST /v1/plugin/invoke` with `plugin`, `version`, `action`, `payload`.

This keeps the route table clean, makes plugin boundaries explicit, and prevents top-level namespace pollution. The seed's "namespacing should carry meaning" rule supports this.

### Recommendation 3: Promote `extract_lesson_items` to a generic structured-extraction primitive
Don't keep it as a PronunCo-specific helper. Reframe it as:
- Core: `POST /v1/extract-structured` (or similar) that accepts a schema descriptor and document, returns structured data.
- Adapter: PronunCo provides the lesson-item schema and pre/post processing.

This honors the "structurally general" principle without letting PronunCo pedagogy leak into core.

---

## Disagreement / tension worth preserving

### Tension A: "Structurally general" vs. "Currently one app"
The seed's Hypothesis 2 and Working Rule 2 imply: "if it stops making sense when PronunCo disappears, it doesn't belong in core." I think this is **too simplistic and may fragment the architecture.** 

Counter-example: `extract_lesson_items` has only one consumer now, but "structured extraction from documents" is a general primitive. If we banish it to adapter space solely due to low adoption, we may end up with 12 different app-specific extraction helpers instead of one core primitive with adapter schemas. 

**Better criterion:** A capability belongs in core if its *absence* would force multiple apps to reimplement the same structural pattern. "How many current users" is the wrong metric; "how general is the structural pattern" is closer.

But this is in tension with: **the core surface must not explode.** I don't have a clean resolution. Round 2 should debate specific threshold tests.

### Tension B: Is iHN a household product or a general local AI platform?
The seed describes iHN as "shaped around household node, control-plane, and general AI capabilities." But the portfolio includes iMedisys (healthcare), iLegalFlow (IP law), ScamHunters (investigation), and m-Beacon (marketing analytics). These are not "household" use cases.

If iHN is fundamentally a household trust/health/control product, then enterprise/professional clients are **siblings** or **deployment variants**, not core clients. If iHN is a general local AI platform, then the core surface must be much broader and more neutral. **This identity question is unresolved, and it directly impacts what belongs in core.** I recommend preserving this tension rather than smoothing it over by saying "both."

### Tension C: Should simulation/roleplay be a core primitive?
The seed flags this as open. I think there's a deeper split:
- **Bounded multi-turn dialogue with context** = core primitive (`/v1/chat` with session continuity).
- **Scenario engine / roleplay framework** = adapter or app-owned.

But several apps (PronunCo, TelPro-Bro, ACTCLI, iLegalFlow) want scenario-based interaction. If the core doesn't offer *some* session/scaffolding primitive, each app reimplements conversation state machines. If core offers too much, it becomes a game engine. **Where exactly does "chat with memory" end and "scenario simulation" begin?** This boundary is fuzzy and should stay fuzzy until we have concrete route contracts to evaluate.

---

## Candidate follow-on sprint

**"Plugin Registration, Discovery, and Invocation Contract"**

The current discussion assumes adapters and plugins exist, but does not specify:
- How a plugin registers its routes/capabilities with iHN discovery.
- How a client app distinguishes "plugin available on this node" from "product feature of iHN."
- How plugin routes are namespaced and versioned.
- Whether plugin invocation goes through a generic proxy (`/v1/plugin/invoke`) or direct namespaced routes.

A follow-on discussion sprint should:
1. Audit current PronunCo-specific routes for top-level leakage.
2. Propose a minimal plugin manifest format (name, version, capabilities, actions).
3. Decide whether plugin routes are exposed directly (`/v1/plugins/pronunco/...`) or through a generic invoke layer.
4. Specify how `/discover` and `/capabilities` should layer plugin responses.

This is a prerequisite for any actual route migration work. Without it, "move to adapter" is just a slogan.

---

## Top 3 conceptual changes

1. **Add a discoverability tiering model** to `/discover` and `/capabilities` so that core, plugin, and internal surfaces are not presented as equivalent.
2. **Replace ad-hoc helper routes with a generic plugin invocation contract** to prevent top-level namespace pollution and make adapter boundaries enforceable.
3. **Refactor `extract_lesson_items` into a generic structured-extraction core primitive** with schema-driven adapters, rather than letting it remain a PronunCo-specific helper or fragment across apps.

## Top 3 cleanup actions for later sprints

1. **Route audit**: Inventory every current non-core route and classify it against this boundary model. Migrate PronunCo-specific routes to plugin namespace.
2. **Discovery contract redesign**: Update `/discover` and `/capabilities` to return tiered capability lists (core vs. plugin vs. internal).
3. **Plugin manifest + registration PoC**: Build a minimal plugin loading/registration system for one adapter (e.g., PronunCo helpers) to prove the invocation contract works without leaking into core routes.
