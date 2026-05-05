# Feedback: Adapter Families and Client Ports

## Reviewer

- Name / model: qwen
- Date: 2026-05-05
- Round: 1 (blind first-pass)

## 1. High-level reaction

**What feels right:**

The seed's core corrective — "need categories should outrank client names" — is the right move. The previous sprint successfully pruned app-specific routes from the core surface, but it still used client names (PronunCo, TelPro-Bro, iMedisys) as the primary organizing vocabulary. That worked for boundary detection but will not scale for architecture design.

The client-side ports-and-adapters sketch is also directionally sound. Separating app core from capability ports from provider adapters is a well-established pattern that prevents direct binding to raw routes or provider APIs.

**What feels overfit, underfit, or still blurry:**

1. **The proposed server-side adapter families are still too close to the previous sprint's "brain-demand clusters."** The seed lists: speech, docs/rules, vision/evidence extraction, monitoring/triage, planning/recommendation, simulation/roleplay. These are need categories, not adapter families. An adapter family should describe a *contract shape* — what goes in, what comes out, what state it manages — not a type of cognitive work. "Speech" is a brain-demand cluster. "Audio I/O with model routing and voice selection" is an adapter family. The distinction matters because it determines what the adapter actually does.

2. **The client-side sketch is under-specified on the policy/orchestration layer.** The seed lists it as item 5 but gives no concrete description. This is where the real architectural decisions live: which provider to call, when to fall back, how to chain primitives, what to cache, what to retry. Without defining this layer, the ports-and-adapters model is incomplete.

3. **The seed does not address the relationship between server-side adapter families and client-side capability ports.** Are they mirrors of each other? Does every server-side adapter family imply a client-side port? Or can a client-side port aggregate multiple server-side families? This mapping is the most important design question in the sprint and it is not explicitly asked.

## 2. Server-side adapter-family proposal

I propose 6 adapter families organized by contract shape, not by cognitive work:

### Family 1: Audio I/O (speech)

- **What it does:** Accept audio, return text (ASR). Accept text, return audio (TTS). Provide voice inventory. Route to appropriate model/runtime.
- **Home:** Stable core (Tier 1). Already resolved by the previous sprint — being extracted to `domains/speech.py`.
- **Contract shape:** Stateless input/output with model selection and voice metadata. No session state.
- **Consumers:** PronunCo, TelPro-Bro, On-My-Watch (audio evidence), iMedisys (dictation), any client that needs speech.

### Family 2: Document Pipeline (docs + RAG)

- **What it does:** Ingest documents (text, PDF, images), index them, answer queries against collections, manage collection lifecycle.
- **Home:** Stable core (Tier 1). Already exists as `/v1/docs/*`.
- **Contract shape:** Stateless ingest and query with collection-scoped state. The collection is the stateful unit, not the individual request.
- **Consumers:** iMedisys, iLegalFlow, ScamHunters, iForeclosed, Tax copilot, PronunCo (lesson materials).

### Family 3: Vision / Structured Extraction

- **What it does:** Accept images, return structured data via named templates (receipt, invoice, medical_bill, tax_form, etc.). Also provides general image analysis.
- **Home:** Stable core (Tier 1) for the engine; templates are adapter/plugin space (Tier 2). Already exists as `/v1/vision/*`.
- **Contract shape:** Stateless extraction with template-registered schemas. The templates are the adapter surface — new templates can be added without changing core.
- **Consumers:** On-My-Watch, iMedisys, ScamHunters, RoadNerd, Kitchen, Tax copilot, iForeclosed.

### Family 4: Rules Engine

- **What it does:** Evaluate named rule domains against fact sets. List available domains. Validate rule syntax.
- **Home:** Stable core (Tier 1) for the evaluator; domain rule packs are adapter/plugin space (Tier 2). Already exists as `/v1/rules/*`.
- **Contract shape:** Stateless evaluation with domain-scoped rule definitions. The rule files are the adapter surface.
- **Consumers:** iMedisys (medical coding), iLegalFlow (compliance), iForeclosed (lien analysis), Tax copilot.

### Family 5: Dialogue Session Manager

- **What it does:** Create bounded multi-turn sessions, append turns, return assistant responses, manage context window trimming, track token usage, handle session expiry.
- **Home:** Stable core (Tier 1). Resolved by the previous sprint's Round 2 — concrete contract sketched without app vocabulary.
- **Contract shape:** Stateful session lifecycle with turn history. The session is the stateful unit.
- **Consumers:** PronunCo (scenario rehearsal), TelPro-Bro (roleplay coaching), ACTCLI (live discussion), iLegalFlow (deposition practice).

### Family 6: Plugin Adapter Framework

- **What it does:** Provide the namespace, registration, discovery, and invocation surface for domain-specific plugins. Not a capability family itself — it is the mechanism by which new families are added.
- **Home:** Stable core (Tier 1) for the framework; individual plugins are Tier 2.
- **Contract shape:** Plugin manifest (name, version, capabilities, routes), namespace isolation (`/v1/plugins/{plugin_id}/...`), capability advertisement in `/capabilities` response.
- **Consumers:** All plugin authors. This is the meta-family that enables the others to grow without core changes.

### What I excluded and why:

- **Monitoring/triage** — not a distinct adapter family. It is a consumption pattern: clients poll or subscribe to node events, then apply their own triage logic. The node-side surface is already covered by `/v1/investigate/*` and `/system/stats`. No new family needed.
- **Planning/recommendation** — not a distinct adapter family. Planning is a composition of chat, docs, and rules. The core provides the primitives; the app or plugin provides the planning logic. Adding a "planning" family would be a category mistake — it would be a workflow, not an adapter.
- **Simulation/roleplay** — absorbed into the Dialogue Session Manager family. The seed asks whether this should be one family or several. My answer: it is not its own family. Scenario semantics belong in the app or plugin; the core provides only the session lifecycle (Family 5).

## 3. Client-side architecture proposal

The client-side model should have five layers with explicit responsibilities:

### Layer 1: App Core

The domain logic that defines the product. For PronunCo: lesson flow, drill sequencing, teacher support, score presentation. For iMedisys: case intake, coverage analysis, billing review, appointment planning.

**Owns:** Business rules, pedagogy, workflow state, UX orchestration, domain-specific data models.

**Does not own:** How to call iHN, which provider to use, how to handle failures, where to store data.

### Layer 2: Capability Ports

Abstract interfaces that the app core depends on. Named for what the app needs, not for how it is implemented.

For PronunCo:
- `SpeechService` — transcribe audio, synthesize speech, list voices
- `DialogueService` — create sessions, add turns, retrieve history
- `TranslationService` — translate text between languages
- `DocumentService` — ingest materials, query collections
- `StorageService` — save/retrieve learner data, practice logs, weak spots

For iMedisys:
- `DocumentService` — ingest medical records, query collections
- `RulesService` — evaluate coding rules, check coverage
- `VisionService` — extract structured data from medical images
- `StorageService` — save/retrieve case data, patient records

**Key principle:** The same port name (`DocumentService`) should appear across multiple clients with the same interface shape. The implementation differs, but the contract is shared.

### Layer 3: Provider Adapters

Concrete implementations of capability ports. Each port has one or more providers.

For `SpeechService`:
- `iHNSpeechProvider` — calls `/v1/transcribe-audio`, `/v1/synthesize-speech`, `/v1/voices`
- `AzureSpeechProvider` — calls Azure Speech SDK
- `OpenAISpeechProvider` — calls OpenAI Whisper/TTS APIs
- `LocalFallbackProvider` — on-device model or cached results

For `DocumentService`:
- `iHNDocsProvider` — calls `/v1/docs/*`
- `LocalDiskProvider` — local file-based indexing
- `CloudProvider` — cloud-based RAG service

**Key principle:** Provider adapters should be swappable at configuration time, not hardcoded. The app core should not know which provider is active.

### Layer 4: Storage/Search Adapters

Separate from provider adapters because storage has different lifecycle concerns (persistence, sync, offline, migration).

- `iHNPersistenceProvider` — calls `/v1/persistence/*`
- `LocalDiskProvider` — SQLite, file system
- `CloudSyncProvider` — cloud backup and sync
- `GitHubProvider` — version-controlled storage for specific use cases

### Layer 5: Policy/Orchestration

The layer the seed under-specifies. This is where the real decisions happen:

- **Provider selection:** Which provider to use for a given request? Based on capability availability, cost, latency, privacy requirements, offline status.
- **Fallback chains:** If iHN is unavailable, fall back to Azure. If Azure fails, fall back to local cached results.
- **Request shaping:** Transform app-core data structures into provider-specific request formats. Combine multiple primitives into a single logical operation.
- **Caching strategy:** What to cache, for how long, when to invalidate.
- **Retry policy:** When to retry, how many times, with what backoff.
- **Privacy filtering:** What data to send to cloud providers vs. keep local.

**Where this layer lives:** This is the most debatable placement. My recommendation: **in the client app, not on the node.** The policy layer is app-specific — PronunCo's fallback chain (iHN → Azure → local) is different from iMedisys's (iHN → local only, no cloud for HIPAA reasons). Putting policy on the node would force a one-size-fits-all orchestration model that does not fit any client well.

**Exception:** If a plugin on the node needs to chain multiple core primitives (e.g., a PronunCo plugin that calls ASR → compare_pinyin → generate_drill), the plugin has its own internal policy layer. But this is plugin-internal, not a shared node-side concern.

## 4. Pressure-test clients

### Best speech-heavy pressure test: **TelPro-Bro**

TelPro-Bro is a better speech pressure test than PronunCo because it is narrower: delivery coaching, recording continuity, score explanation. It does not have the pedagogical complexity of PronunCo (lesson design, drill sequencing, teacher support). If the Audio I/O family works for TelPro-Bro, it will work for PronunCo. PronunCo is the more complex client, but TelPro-Bro is the cleaner pressure test for speech specifically.

### Best docs/rules-heavy pressure test: **iMedisys**

iMedisys combines document ingestion (medical records, bills), rules evaluation (coding, coverage), and vision extraction (medical images). It is the most demanding client for the Document Pipeline, Rules Engine, and Vision families simultaneously. If the adapter model works for iMedisys, it will work for iLegalFlow and ScamHunters.

### Client most likely to mislead the architecture: **RoadNerd**

RoadNerd is a deployment variant, not a client app. Treating it as a normal client would pressure-test the wrong boundaries: offline behavior, edge routing, device constraints. These are deployment concerns, not adapter-family concerns. RoadNerd should be used to test the node-side runtime contract, not the client-side ports-and-adapters model.

## 5. Where I disagree

### Disagreement 1: The seed's proposed adapter families are need categories, not contract shapes

The seed lists "speech," "docs/rules," "vision/evidence extraction," "monitoring/triage," "planning/recommendation," "simulation/roleplay." These describe what the brain does, not what the adapter contract looks like. I replaced them with families organized by contract shape: Audio I/O (stateless input/output), Document Pipeline (collection-scoped state), Vision/Structured Extraction (template-registered schemas), Rules Engine (domain-scoped evaluation), Dialogue Session Manager (session lifecycle), Plugin Adapter Framework (meta-family).

The distinction matters because it determines what the adapter actually manages. A "speech" family could mean anything from raw audio passthrough to full pronunciation coaching. An "Audio I/O" family has a clear boundary: audio in, text out; text in, audio out; voice metadata. Nothing more.

### Disagreement 2: Policy/orchestration belongs in the client, not on the node

The seed does not explicitly place the policy/orchestration layer. I argue it belongs in the client app because:

1. Different clients have different privacy requirements (iMedisys cannot use cloud providers; PronunCo can).
2. Different clients have different fallback chains based on their use case.
3. Different clients have different caching strategies based on their data sensitivity.

A node-side policy layer would force uniformity where diversity is required. The node should provide primitives; the client should decide how to compose them.

**Counter-position worth preserving:** If a plugin on the node chains multiple primitives (e.g., ASR → pinyin comparison → drill generation), the plugin has its own internal policy. This is acceptable because the plugin is scoped to one domain and one client's needs. The node-side policy is plugin-internal, not a shared concern.

### Disagreement 3: Mirror discussions should start in client repos now, not after this draft stabilizes

The seed proposes: finish this cross-client round → mirror into PronunCo → mirror into iMedisys or iLegalFlow → compare → code sprints.

I propose: finish this cross-client round → **simultaneously** mirror into PronunCo and one non-speech client → compare → code sprints.

Reason: the cross-client draft will never be "stable enough" without real client feedback. The best way to test whether the adapter families are real or imaginary is to apply them to actual client code. Waiting for perfect cross-client consensus before engaging client repos is the same mistake that caused the original boundary leakage — designing in abstraction without grounding in implementation.

The mirror discussions do not need to be complete before coding sprints begin. They need to be started. The first coding sprint (speech extraction + plugin namespace) can proceed in parallel with client-mirror discussions.

## 6. Suggested next move

**Another discussion round** — but structured differently. Instead of another cross-client round, run parallel mirror discussions:

1. **PronunCo mirror:** Apply the 6 adapter families to PronunCo's actual code. Map each PronunCo capability to a family. Identify gaps and overlaps.
2. **iMedisys mirror:** Apply the same 6 families to iMedisys. Compare the mapping with PronunCo's. Where do they agree? Where do they diverge?
3. **Cross-client synthesis:** Compare the two mirror results. Families that map cleanly in both clients are real. Families that only work for one client need rethinking.

**In parallel:** Begin the first coding sprint (speech extraction + plugin namespace). This does not depend on the mirror discussions being complete. The speech extraction validates the Audio I/O family; the plugin namespace validates the Plugin Adapter Framework family.

**Timeline:**
- Week 1: Mirror discussions in PronunCo and iMedisys repos
- Week 1-2: Coding Sprint 1 (speech extraction + plugin namespace)
- Week 2: Cross-client synthesis of mirror results
- Week 3: Coding Sprint 2 (capability registry tiering + `/v1/models`)
- Week 3+: Coding Sprint 3 (conditional — dialogue primitive extraction)
