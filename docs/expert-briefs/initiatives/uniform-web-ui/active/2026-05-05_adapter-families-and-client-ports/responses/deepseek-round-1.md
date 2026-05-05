# Feedback: Adapter Families and Client Ports — Round 1

## Reviewer

- **Name / model:** DeepSeek-v4-pro
- **Date:** 2026-05-05

---

## 1. High-level reaction

### What feels right

The corrective framing is the strongest part of this seed. Shifting from "named
client apps as architecture units" to "need categories and adapter families as
the real unit" is the logical next step after the boundary review. The symptom the
seed diagnoses is real: the first boundary review leaned on PronunCo-as-canary,
which is correct for pressure-testing but dangerous as a permanent architecture
habit.

The proposed client-side split (app core / capability ports / provider adapters /
storage adapters / policy-orchestration) is a clean target. It's the right shape
even if no client implements it yet.

The "new client should require no iHN core change" hypothesis (H4) is the single
most important success criterion for this entire initiative. It forces discipline
that the current flat-plugin architecture lacks.

### What feels overfit, underfit, or still blurry

**Overfit: the provider adapter model assumes clients have multiple backends, but
the codebase has exactly two (Ollama, MLX) and the switch is server-side.**

The seed's PronunCo example lists `Azure`, `OpenAI`, `Alibaba` as provider
adapters. But the current iHN architecture is local-first: everything runs on the
node, ASR/TTS/chat/vision/embedding all hit local services. For a client to have
an `OpenAIProvider`, the client needs its own API key and its own direct
connection to OpenAI — which is a very different trust model than "everything
routes through the trusted local node." The seed should distinguish between:

- **Provider adapters that call iHN's unified surface** (the iHN node abstracts
  away the backend — this is the current model)
- **Provider adapters that bypass iHN entirely** (the client has its own
  credentials to external services — this is the seed's implied model)

Both are valid, but they have different security, privacy, and offline
characteristics. Conflating them produces a client architecture that looks
flexible in diagrams but collapses in practice when the client can't get an API
key or the user's data shouldn't leave the node.

**Underfit: the gap between the seed's target architecture and the current
codebase reality.**

The exploration reveals that:

- No client (Web, iOS, Android) has a capability port layer — they all call raw
  iHN endpoints directly
- No plugin registration system exists — plugins are hardcoded imports in
  `main.py`
- Capabilities are hardcoded in `capabilities.py`, not registered by plugins
- The only provider abstraction is a two-way if/else between Ollama and MLX

The seed proposes a target that is 2-3 layers of abstraction away from the
current codebase. That's fine for a discussion sprint — but the gap should be
acknowledged explicitly so future coding sprints can sequence the work correctly.
You can't build client-side provider adapters before the server has a provider
adapter framework. You can't build a provider adapter framework before plugins
have a registration mechanism. The dependency chain matters.

**Blurry: the seed conflates adapter families with the domains/plugins that
implement them.**

The proposed adapter families (speech, docs/rules, vision/evidence,
monitoring/triage, planning/recommendation, simulation/roleplay) are need
categories, not code units. A single server-side plugin might serve multiple
families. A single family might be served by core primitives plus multiple
plugins. The seed should distinguish:

- **Need category** — "what kind of brain work does this app ask for?"
  (already well-covered in the portfolio brain-demand clusters)
- **Adapter family** — "what reusable server-side code package serves this need
  across multiple clients?"
- **Core primitive** — "what stable iHN route makes this possible without any
  plugin?"

The current seed uses "adapter family" to mean all three, which produces blur.

---

## 2. Server-side adapter-family proposal

I propose **7 adapter families**, organized by where they live in the iHN
architecture. Each family should have a clear relationship to core primitives.

### Family 1: Speech/language processing

| Aspect | Detail |
|---|---|
| **Core primitives used** | `/v1/transcribe-audio`, `/v1/synthesize-speech`, `/v1/voices`, `/v1/translate` |
| **What the adapter adds** | Phoneme comparison, pronunciation scoring, accent analysis, language-specific normalization (pinyin, kana, IPA), prosody evaluation |
| **Clients that need it** | PronunCo, TelPro-Bro, potentially iMedisys (dictation quality), ACTCLI (live discussion analysis) |
| **Where it lives** | **Server-side installable plugin** — `/v1/plugins/speech/...` |
| **Thickness** | Thin (GLM's "capability adapter" category). Mostly stateless transforms. |
| **Stable core vs plugin** | ASR/TTS/voices/translate are core. Phoneme comparison, scoring, normalization are plugin. |

**Why not core:** Pronunciation scoring rubrics are domain-specific. A "generic
phoneme comparer" is a stateless utility that multiple apps can configure
differently, but it's not product-defining for iHN itself.

### Family 2: Document reasoning and rules

| Aspect | Detail |
|---|---|
| **Core primitives used** | `/v1/docs/*`, `/v1/rules/evaluate`, `/v1/chat`, `/v1/summarize`, `/v1/translate` |
| **What the adapter adds** | Domain-specific rule packs (.yaml files for medical coding, legal compliance, tax rules, insurance coverage), document classification, compliance checking, structured extraction schemas for domain-specific forms |
| **Clients that need it** | iMedisys, iLegalFlow, Tax copilot, iForeclosed, ScamHunters (evidence analysis), Kitchen (receipt classification) |
| **Where it lives** | **Mixed.** The rules engine (`/v1/rules/evaluate`) is core Tier 1. Domain rule packs live in **installable plugin space** — `/v1/plugins/rules-medical/...`, `/v1/plugins/rules-legal/...`, etc. |
| **Thickness** | Mixed. Rule evaluation is thin (deterministic engine). Rule pack authoring and domain-specific explanation is thick (requires domain expertise). |
| **Stable core vs plugin** | Core provides the evaluator and domain listing. Plugins provide the .yaml files and domain-specific explanation adapters. |

**Tension to preserve:** Should rule packs be server-side plugins or client-side
config? If a medical practice ships its own coding rules as a .yaml file loaded by
iHN, that's a server-side plugin. If the client app evaluates rules locally
against loaded documents, that's app-owned logic using `/v1/docs/ask` as
substrate. Both patterns are valid and the seed doesn't address this split.

### Family 3: Vision and evidence extraction

| Aspect | Detail |
|---|---|
| **Core primitives used** | `/v1/vision/analyze`, `/v1/vision/ocr`, `/v1/vision/extract/{template}`, `/v1/vision/templates` |
| **What the adapter adds** | Domain-specific extraction templates (medical image triage, security footage analysis, receipt/item extraction, tax form field extraction, contract clause extraction), evidence chaining (multi-image analysis across a timeline), batch processing |
| **Clients that need it** | On-My-Watch, iMedisys, ScamHunters, Kitchen/Restaurant, RoadNerd, Tax copilot, iForeclosed |
| **Where it lives** | **Server-side installable plugin.** Core vision router provides the engine and generic templates (receipt, invoice, medical_bill, tax_form, screenshot). Plugin provides domain-specific templates and chaining logic. |
| **Thickness** | Thin (templates are config, not code). The extraction engine is core; which templates are available is plugin. |
| **Stable core vs plugin** | Core: `/v1/vision/*` with a default template set. Plugin: additional templates registered via a template registry that the vision router queries. |

**Important correction to the seed:** The seed lists "vision/evidence extraction"
as one family, but "evidence extraction" is a workflow concern (multi-image
analysis, timeline construction, chain of custody) that goes beyond what
`/v1/vision/extract/{template}` provides. Evidence chaining should be its own
sub-family or a plugin that composes vision + docs + rules.

### Family 4: Monitoring and alerting

| Aspect | Detail |
|---|---|
| **Core primitives used** | `/v1/investigate/scan`, `/v1/investigate/environment`, `/health`, `/system/stats`, `/cluster/nodes`, `/discover/peers` |
| **What the adapter adds** | Alert threshold configuration, anomaly detection rules, event correlation, triage routing, notification policies, scheduled scanning, streaming event ingestion |
| **Clients that need it** | On-My-Watch, Edge-Kite, iHN Command Center (node health monitoring), ScamHunters (threat monitoring), iMedisys (patient monitoring) |
| **Where it lives** | **Server-side installable plugin.** Core provides the scan/environment primitives. Plugin provides scheduling, thresholding, correlation, and notification. |
| **Thickness** | Thick (GLM's "workflow plugin" category). Stateful, opinionated about what constitutes an alert, how often to scan, and who to notify. |
| **Stable core vs plugin** | Core: scan, environment, health, stats endpoints. Plugin: alert config, anomaly rules, event correlation, notification routing. |

**This family is the least mature in the current codebase.** `/v1/investigate/scan`
exists but is limited to four scan types. Streaming events and real-time
monitoring do not exist. Edge-Kite is designed for this use case but has no
implementation. **Recommend flagging this family as "designed but not yet
implementable"** — the core primitives it needs (event streaming, scheduled
scans, webhook notifications) don't exist yet.

### Family 5: Planning and recommendation

| Aspect | Detail |
|---|---|
| **Core primitives used** | `/v1/chat`, `/v1/summarize`, `/v1/rules/evaluate`, `/v1/docs/ask` |
| **What the adapter adds** | Structured planning output schemas (appointment schedules, task sequences, routing plans), recommendation scoring against criteria, deadline/project timeline construction, what-if scenario comparison |
| **Clients that need it** | WhoWhe2Wha, iMedisys (appointment planning), ScamHunters (prevention planning), PronunCo (progression planning), RoadNerd (route planning), Kitchen (menu/dish planning) |
| **Where it lives** | **Mostly client-side, with thin server-side helpers.** The core primitives (chat, summarize, rules) are sufficient to generate plans. The "planning adapter" is mostly prompt engineering and output schema validation — which can be client-side. A server-side plugin might provide: plan template schemas, structured output enforcement, plan comparison utilities. |
| **Thickness** | Thin server-side (schemas, comparison). Thick client-side (the app decides what a "good plan" means). |
| **Stable core vs plugin** | Core: chat, summarize, rules. Plugin: plan schemas and comparison utilities. Client-side: plan evaluation, plan UX, plan progression. |

**This is the most "aspirational" family.** No dedicated planning route exists in
the codebase. Planning is achieved through `/v1/chat` with prompts. Creating a
planning plugin before 2+ apps actually need structured planning output is
premature. **Recommend: keep this family in the conceptual model but do not
implement server-side planning adapters until WhoWhe2Wha or iMedisys demands
structured planning output.**

### Family 6: Simulation and dialogue

| Aspect | Detail |
|---|---|
| **Core primitives used** | `/v1/dialogue/sessions` (proposed core, not yet built), `/v1/chat`, `/v1/transcribe-audio`, `/v1/synthesize-speech` |
| **What the adapter adds** | Scenario templates, persona definitions, roleplay rubrics, scoring/evaluation for roleplay quality, session templates for common dialogue patterns (Socratic tutoring, sales roleplay, deposition rehearsal, interview practice) |
| **Clients that need it** | PronunCo, TelPro-Bro, iLegalFlow (deposition rehearsal), ScamHunters (scenario simulation), ACTCLI (live discussion), m-Beacon (conversational what-if) |
| **Where it lives** | **Server-side installable plugin** — `/v1/plugins/dialogue/...`. Layers on top of the proposed core `/v1/dialogue` primitive. |
| **Thickness** | Thick. Stateful, opinionated about dialogue structure, persona assignment, and evaluation criteria. |
| **Stable core vs plugin** | Core: `/v1/dialogue/sessions` (turn management, context trimming, token accounting). Plugin: scenario templates, persona configs, roleplay evaluation, dialogue scoring. Client-side: the UX loop, goals, progression. |

**Tension preserved from the prior boundary review:** This family only makes
sense if the core `/v1/dialogue` primitive exists. If dialogue stays in plugin
space, this family collapses into app-specific code. The seed should clarify that
Family 6 depends on the dialogue primitive resolution from the prior sprint.

### Family 7: Data and external connectors

| Aspect | Detail |
|---|---|
| **Core primitives used** | `/v1/persistence/*`, `/v1/docs/ingest`, potentially new `/v1/connectors/*` |
| **What the adapter adds** | Web search connectors, database bridges (SQL, NoSQL), external API bridges (GitHub, Google Drive, Dropbox), email/calendar integration, RSS/feed ingestion, data format transformers (CSV→JSON, XML→structured) |
| **Clients that need it** | iLegalFlow (USPTO API, court databases), iForeclosed (auction APIs, property databases), m-Beacon (analytics APIs), ScamHunters (threat intel feeds), iMedisys (medical database connectors) |
| **Where it lives** | **Server-side installable plugin** — `/v1/plugins/connectors/...`. Some connectors may be client-side if they need user credentials. |
| **Thickness** | Thin (stateless bridges to external APIs). |
| **Stable core vs plugin** | Core: `/v1/persistence/*` for storage, `/v1/docs/ingest` for document import. Plugin: individual connector implementations. |

**This family is not in the seed's list but is the most architecturally
important missing family.** Six portfolio products need external data connectors
(legal databases, medical databases, property auctions, threat feeds, analytics
APIs). Without a connector family, each client app implements its own API bridges
to external services, which creates the same fragmentation the initiative is
trying to prevent.

### Summary table

| Family | Lives in | Thickness | Current maturity | Core or plugin |
|---|---|---|---|---|
| 1. Speech/language | Server plugin | Thin | PronunCo has early examples | Plugin |
| 2. Document reasoning | Mixed | Mixed | `/v1/rules/*` and `/v1/docs/*` exist; domain packs don't | Core engine, plugin packs |
| 3. Vision/evidence | Server plugin | Thin | `/v1/vision/*` exists; domain templates are minimal | Core engine, plugin templates |
| 4. Monitoring/alerting | Server plugin | Thick | Minimal (scan endpoints only) | Plugin; core primitives incomplete |
| 5. Planning/recommendation | Mostly client-side | Thin server, thick client | None (chat-only) | Mostly app-owned; thin plugin schemas |
| 6. Simulation/dialogue | Server plugin | Thick | Depends on `/v1/dialogue` resolution | Plugin (layered on core dialogue) |
| 7. Data/connectors | Server plugin | Thin | None (ad-hoc per-client) | Plugin |

---

## 3. Client-side architecture proposal

### The target model

```
┌──────────────────────────────────────────────────┐
│ App Core                                         │
│ Lesson flow, drill sequencing, teacher support,  │
│ score presentation, workflow orchestration        │
├──────────────────────────────────────────────────┤
│ Capability Ports (interfaces, not implementations)│
│ LessonExtractionPort, DialoguePort,               │
│ TranslationPort, SpeechFeedbackPort,              │
│ DocumentSearchPort, StoragePort                   │
├──────────────────────────────────────────────────┤
│ Policy / Orchestration                            │
│ Provider selection, fallback logic,               │
│ privacy routing, offline/online switching,        │
│ capability-based degradation                      │
├──────────────────────────────────────────────────┤
│ Provider Adapters                                 │
│ IhnProvider, AzureProvider, OpenAIProvider,       │
│ AlibabaProvider, LocalOnlyProvider                │
├──────────────────────────────────────────────────┤
│ Storage/Search Adapters                           │
│ IhnPersistenceAdapter, LocalDiskAdapter,           │
│ GitHubAdapter, CloudStorageAdapter                │
└──────────────────────────────────────────────────┘
```

### What currently exists in code

| Layer | Web Command Center | iOS App | Android App |
|---|---|---|---|
| App Core | Yes — panel-based UI with direct `api.*()` calls | Partial — SwiftUI views with direct `IhnAPI` calls | Partial — Compose views with direct repository calls |
| Capability Ports | **None** — `api.ts` is a service layer, not an interface | **None** | **None** |
| Policy/Orchestration | **None** — always calls iHN | **None** — always calls iHN | **None** — always calls iHN |
| Provider Adapters | **None** — only iHN | **None** — only iHN | **None** — only iHN |
| Storage Adapters | **None** — localStorage only | **None** — UserDefaults/FileManager | **None** — SharedPreferences/Internal Storage |

**The gap:** The seed targets a 5-layer client architecture. The current codebase
has 1.5 layers (app core with a thin service layer). That's a 3-4 layer gap.

### Recommendation: sequence the client architecture

Don't attempt all layers at once. Sequence them:

**Phase 1: Define capability ports (interfaces, not implementations)**
- Define a `CapabilityPort` protocol for each app need: `ChatPort`,
  `TranscriptionPort`, `SynthesisPort`, `DocumentPort`, `VisionPort`,
  `DialoguePort`, `TranslationPort`
- Each port defines the minimal interface the app core needs (methods, not routes)
- Example: `ChatPort.sendMessage(text, history, options) → Promise<Message>`
- The port does NOT know about URLs, HTTP methods, or iHN route names
- This is the keystone layer — without it, provider adapters and policy are
  impossible

**Phase 2: Implement one provider adapter (iHN)**
- Build `IhnChatAdapter` that implements `ChatPort` by calling `/v1/chat`
- This is what `api.ts`, `IhnAPI.swift`, and `IhnGatewayRepository.kt` already
  do — just formalized behind the port interface
- All three current clients already have working iHN adapters; they're just
  not abstracted behind ports

**Phase 3: Add policy/orchestration**
- Build a `CapabilityRouter` that selects which provider adapter to use based on:
  - Capability availability (is the iHN node reachable? does it have the model?)
  - Privacy policy (is this data sensitive enough to keep local?)
  - Cost policy (is the request cheap enough to use cloud?)
  - Offline status
- This is the hardest layer to get right and should come last

**Phase 4: Add second provider (if needed)**
- Only after the first three layers exist, add a cloud provider adapter
- `OpenAIChatAdapter`, `AzureSpeechAdapter`, etc.
- These require client-side API keys and direct connections to external services

### Which client should prototype this first?

**PronunCo** is the right prototype client because:
- It has the richest need set (speech, dialogue, translation, docs, coaching)
- It already has a working plugin on the server side
- It was the canary for the boundary review and remains the canary here
- It exercises 4 of the 7 adapter families

But there's a sequencing problem: the PronunCo client app (if it exists as
separate code) may not be in this repo. The seed says to mirror the discussion
into PronunCo's repo. That's correct, but the first step is: does PronunCo
already have a separate client app? Or is the "PronunCo client" currently the
web Command Center using PronunCo plugins? If it's the latter, the Command
Center is the prototype client, and the capability port pattern should be
prototyped in the web frontend first.

---

## 4. Pressure-test clients

### Best speech-heavy pressure test

**PronunCo** — exercises the full speech pipeline: ASR, TTS, phoneme comparison,
pronunciation scoring, dialogue with voice. TelPro-Bro is a close second (coaching
feedback on delivery, not pronunciation). Together they cover the speech family
from two different angles (accuracy vs. delivery quality), which is the right
test for whether the speech adapter family is reusable or silently PronunCo-specific.

### Best docs/rules-heavy pressure test

**iLegalFlow** — exercises the document reasoning family at its hardest: complex
legal documents, multi-jurisdiction rules, contract clause extraction, compliance
checking against multiple rule domains. iMedisys is also a strong test (medical
coding rules, coverage analysis, regulated explanation). Using both ensures the
rules adapter family doesn't overfit to legal or medical semantics.

### Client most risky to treat as "normal"

**RoadNerd** — already classified as deployment/sibling, not a client. But the
seed lists it under "clients that reuse adapter families" and it would be a
mistake to let RoadNerd's travel/offline-focus shape the adapter family design.
RoadNerd is fundamentally a deployment model: a mobile node with intermittent
connectivity and different hardware constraints. Its needs (offline-first,
low-power vision, GPS-aware routing) are deployment concerns, not client-API
concerns. Treating RoadNerd as a normal client risks importing deployment
assumptions into the client port model.

**Second mention: m-Beacon** — marketing analytics and conversion optimization.
It's the only client that wants analytics/optimization rather than
perception/understanding. Its needs (A/B testing infrastructure, conversion
funnel analysis, marketing-language optimization) are fundamentally different
from every other client. Treating m-Beacon as a normal client risks creating
adapter families that serve marketing analytics but don't generalize. It should
be treated as a standalone test — "can the architecture handle m-Beacon without
creating a marketing adapter family?" — not as a family-defining canary.

---

## 5. Where I disagree

### Disagreement 1: Client repos should NOT start mirror discussions yet

The seed proposes (section "Proposed discussion sequence") mirroring the
discussion into PronunCo and iMedisys/iLegalFlow client repos after this round.
I think this is premature — and here's why:

**The current codebase has no capability port layer in any client.** If you
mirror the discussion into PronunCo's repo now, the PronunCo team will be asked
to design `CapabilityPort` interfaces without having seen a working example.
They'll design against their own app's needs, creating a `PronunCoPort` that is
no more reusable than the current `pronunco.py` plugin.

**Better sequence:**
1. Complete this cross-client adapter-family round (this sprint)
2. Prototype the capability port pattern in the **web Command Center** first —
   it's the iHN repo, it's the canonical first-party client, and it exercises
   the core surface directly
3. Extract one working example: `ChatPort` + `IhnChatAdapter` + policy router in
   the Command Center frontend
4. Then mirror the discussion into PronunCo — with a working reference
   implementation, not just a diagram

This prevents each client repo from independently designing its own port
abstractions before the pattern stabilizes. The Command Center is the natural
proving ground because it already consumes the full core surface.

### Disagreement 2: The seed lists 6 adapter families but omits the most architecturally important one

**Data/connectors** (Family 7 in my proposal above) is missing from the seed's
list. Six portfolio products need external data connectors:
- iLegalFlow: USPTO API, court databases, customs code databases
- iForeclosed: auction APIs, property databases, lien databases
- m-Beacon: analytics APIs, marketing data sources
- ScamHunters: threat intelligence feeds, scam databases
- iMedisys: medical coding databases, insurance APIs
- Kitchen: recipe databases, nutritional databases

Without a connector family, each client app builds its own API bridges. This is
the exact fragmentation the initiative is trying to prevent — just happening on
the client side instead of the server side. A connector family provides:
- Standardized connector interface (authenticate, query, transform, cache)
- Credential management (client-side secrets, not server-side)
- Rate limiting and retry policies
- Data normalization (each external API returns different shapes)

**Recommendation: Add "Data and external connectors" as the 7th adapter family.**

### Disagreement 3: The seed underweights the dependency chain between server-side and client-side architecture

The seed proposes server-side adapter families and client-side port/adapters as
parallel concerns. But they have a hard dependency:

1. Server-side plugins need a **plugin registration mechanism** before they can
   be "installable adapter families." Currently, plugins are hardcoded imports.
2. Plugin registration needs a **capability advertisement mechanism** before
   clients can discover what adapters are available. Currently, capabilities are
   hardcoded in `capabilities.py`.
3. Client capability ports need the **capability advertisement** to implement
   policy-based provider selection. "Is the speech adapter available on this
   node?" must be answerable before the client decides which provider to use.

The dependency chain is:

```
Plugin registration → Capability advertisement (tiered) → Client capability ports → Policy routing → Provider adapters
```

Each layer depends on the one before it. The seed treats them as independently
designable, but the implementation must be sequenced. **Recommendation: the
first coding sprint for this initiative should be "plugin registration +
capability advertisement," not "adapter family implementation."** Without those
foundations, adapter families are just a naming convention for current hardcoded
plugins.

### Uncertainty worth preserving: Should provider adapters be server-side or client-side?

The seed's PronunCo example shows client-side provider adapters (Azure, OpenAI,
Alibaba). But the current iHN architecture routes everything through the local
node — the node is the provider, and the node internally switches between Ollama
and MLX.

Two models are in tension:

**Model A (current iHN): Server-side provider switching**
- The client only talks to iHN
- iHN decides which backend to use (Ollama vs MLX, and potentially
  cloud fallback in the future)
- The client has no provider awareness
- Privacy is guaranteed because all data goes through the local node
- Disadvantage: the node is a single point of failure; if the node is down, the
  client has no fallback

**Model B (seed's proposal): Client-side provider switching**
- The client has capability ports that can be backed by iHN, OpenAI, Azure, etc.
- The client has its own API keys and direct connections
- The client can fall back to cloud when the node is unreachable
- Disadvantage: privacy is harder to guarantee; the client must decide which
  data goes where; API key management is a client concern

**My take: both models are valid for different use cases.** Model A serves
privacy-first, offline-resilient use cases (the current portfolio's primary
concern). Model B serves availability-first, multi-provider use cases. The seed
should acknowledge both models and clarify which use cases each serves, rather
than implying Model B is the universal target.

**Recommendation: Start with Model A (the current architecture) and add Model B
as an optional client-side enhancement.** The capability port interface should
be designed so that both models implement the same ports — the port doesn't care
whether the provider is iHN (server-side) or OpenAI (client-side). But the first
implementation should be Model A because it's what exists and what the portfolio's
privacy requirements demand.

---

## 6. Suggested next move

### Recommended: another discussion round before coding

This seed is a strong first draft, but there are enough open questions that a
second discussion round (Round 2, comparing responses from multiple reviewers)
would produce a sharper target. Specifically, Round 2 should resolve:

1. Whether "data/connectors" is accepted as the 7th adapter family
2. Whether the Command Center should prototype the capability port pattern
   before client repos mirror the discussion
3. Whether server-side or client-side provider switching is the primary model
   (or both)
4. Whether the 7 families should be formally typed by thickness (thin
   stateless adapters vs. thick stateful plugins — GLM's distinction)

### If coding must start now: "Plugin registration + capability advertisement" sprint

The highest-value, lowest-risk coding action is building the foundations that
adapter families need:

1. **Plugin registration mechanism** — a `register_plugin(name, version,
   capabilities, router)` function that replaces hardcoded imports in `main.py`
2. **Capability advertisement split** — already designed in the boundary review;
   implement the tiered `core` / `plugins` response in `/capabilities`
3. **Plugin manifest** — a minimal JSON or Python file that declares a plugin's
   name, version, capabilities, and route prefix
4. **Auto-discovery** — scan `plugins/` directory and load plugins by manifest,
   removing the need to edit `main.py` for each new plugin

This sprint doesn't implement any new adapter families — it builds the
infrastructure that makes adapter families installable rather than hardcoded.
Without it, the 7 adapter families are just a taxonomy for current code, not a
new architecture.

### Mirror discussion timing

Mirror into PronunCo's repo only after:
1. This cross-client round stabilizes the adapter family list
2. The Command Center has a working capability port prototype
3. The plugin registration mechanism exists so "installable adapter family"
   means something concrete

Recommended sequence:
1. This sprint (complete)
2. Round 2 synthesis of this sprint
3. Plugin registration + capability advertisement coding sprint (in iHN repo)
4. Command Center capability port prototype (in iHN frontend)
5. Mirror discussion into PronunCo repo (with working reference)
6. Coding sprint: first PronunCo adapter family implementation
7. Mirror discussion into iMedisys or iLegalFlow repo

That's a 3-4 week roadmap from "discussion document" to "two clients using
adapter families."

---

## Open tensions preserved for future rounds

1. **Provider switching: server-side or client-side?** Model A (iHN as sole
   provider, server-side backend switching) vs Model B (client-side multi-provider
   ports). Both valid, different trust/privacy models. Should not be resolved
   without concrete use cases.

2. **Adapter family thickness.** Seven families span from thin stateless
   transforms (speech normalization) to thick stateful orchestrators (simulation
   sessions, monitoring alerting). Should the plugin architecture distinguish
   these types, or is a single plugin contract sufficient? (GLM's unresolved
   insight.)

3. **Who owns external data connectors?** If a legal client connects to USPTO
   APIs, where do the API keys live? On the iHN node (server-side plugin with
   shared credentials) or in the client app (client-side connector with
   per-user credentials)? The seed doesn't address credential ownership, and it
   materially affects the connector family design.

4. **Does the Command Center get the capability port treatment?** The seed
   proposes a client-side architecture for external apps like PronunCo. But the
   Command Center is the canonical first-party client. Should it also adopt the
   port/adapter pattern, or is it exempt because it's co-located with the server?
   If exempt, the port/adapter pattern is only tested by external clients — a
   gap in validation.

5. **How many of the 7 families are implementable with current core primitives?**
   Families 1 (speech), 2 (docs/rules), 3 (vision), and 6 (dialogue) map to
   existing or planned core routes. Family 4 (monitoring) needs event streaming.
   Family 5 (planning) needs structured output. Family 7 (connectors) needs a
   connector framework. Three of seven families cannot be implemented today. Is
   the right move to design all seven now and implement the four that are
   possible, or to narrow the family list to what's implementable?

---

*End of Round 1 response. Formed by comparing the seed's proposals against the
current codebase's actual plugin, provider, and client patterns.*
