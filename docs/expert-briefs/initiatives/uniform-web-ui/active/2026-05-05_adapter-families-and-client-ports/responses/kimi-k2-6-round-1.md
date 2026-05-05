# Round 1 Response: Adapter Families and Client Ports

**Reviewer:** kimi-k2-6  
**Date:** 2026-05-05  
**Round:** 1 (blind first-pass)

---

## 1. High-level reaction

### What feels right

- The corrective framing is essential. The previous sprint correctly pruned app-specific routes from core, but it did leave PronunCo as the implicit center of gravity. Shifting from "client apps as architecture units" to "need categories + adapter families" fixes that bias.
- The client-side port/adapter model is the right abstraction. Client apps should not bind directly to raw route names or provider APIs. The "app core → capability ports → provider adapters → storage adapters → policy" split is structurally sound.
- The discussion sequence (cross-client draft first, then mirror to client repos) is correct. Starting in client repos first would produce N incompatible local optima.

### What feels overfit, underfit, or blurry

- The proposed server-side families (`speech`, `docs/rules`, `vision/evidence extraction`, `monitoring/triage`, `planning/recommendation`, `simulation/roleplay`) mix **genuinely reusable infrastructure** with **domain-specific workflows disguised as families**. In particular, `planning/recommendation` and `simulation/roleplay` are at risk of becoming buckets for "whatever apps do that isn't core."
- The client-side model under-specifies the **policy/orchestration layer**. It shows provider adapters as a flat list (iHN, Azure, OpenAI, Alibaba) but doesn't address how a client app decides WHICH provider to use for WHICH call under WHICH conditions. In practice, every serious client will need a capability router, not just a provider adapter.
- The seed says "node-side adapters belong in iHN" but doesn't address whether they belong in the **iHN monorepo** or as **separate installable packages**. This is a hidden scalability assumption that will become painful quickly.

---

## 2. Server-side adapter-family proposal

I propose 6 families, not 7. I removed `planning/recommendation` because it is not a reusable server-side family — it is a client-side orchestration pattern that uses core primitives. I split `simulation/roleplay` into its infrastructural half (dialogue, already resolved as core) and its semantic half (scenarios, as a plugin family).

| # | Adapter Family | Classification | Reason |
|---|---|---|---|
| 1 | **Speech & Voice** (ASR, TTS, voice inventory, voice selection) | `core` | Cross-app demand from 5+ products. General AI infrastructure. Already being extracted to `domains/speech.py`. |
| 2 | **Document Intelligence** (ingest, RAG query, summarize, structured extract) | `core` | Cross-app demand from iMedisys, iLegalFlow, ScamHunters, Tax, iForeclosed. The general primitive belongs in core; domain-specific schemas (tax form, medical bill, legal contract) belong in adapter content. |
| 3 | **Vision & Structured Perception** (OCR, template extraction, image analysis, video frame analysis) | `core` | Cross-app demand from 7+ products. The template mechanism is core; templates themselves are adapter/plugin content. |
| 4 | **Rules & Policy Engine** (rule evaluation, validation, domain listing) | `core engine` + `plugin domain packs` | The evaluator is general infrastructure. Domain rule packs (medical coding, legal compliance, tax rules, foreclosure rules) are plugin content. This split was resolved in the previous sprint and should be preserved. |
| 5 | **Dialogue & Session Infrastructure** (session create/turn/get/delete, context trimming, token accounting) | `core` | Cross-app demand from PronunCo, TelPro-Bro, ACTCLI, iLegalFlow, ScamHunters. The previous sprint resolved this as a core primitive with neutral contract. Scenario/persona semantics stay out. |
| 6 | **Monitoring & Event Triage** (stream watch, anomaly detection, event prioritization, routing) | `plugin/adapter family` | Reusable across On-My-Watch, Edge-Kite, and parts of iMedisys (health alert routing). The structural pattern is shared even though domains differ (security vs health vs network). Not core because most clients don't need it. |

### Families I deliberately excluded

- **Planning / Recommendation** — This is not a server-side adapter family. Tax planning, medical appointment planning, lesson progression planning, and travel planning share almost no server-side structure. They are client-side orchestration patterns that call core primitives (chat, docs, rules). Treating them as a "family" would create a false generalization bucket.
- **Coaching / Evaluation Overlay** — I considered this, but it collapses into domain-specific rubrics. A pronunciation rubric, a delivery-charisma rubric, a medical-coverage rubric, and a legal-risk rubric share the *pattern* (compare against standard, explain gap, suggest improvement) but not the *content*. The pattern belongs in client-side policy/orchestration; the rubrics belong in app-owned logic. There is not enough shared server-side structure to justify a reusable adapter family.
- **Simulation / Roleplay** — The previous sprint correctly split this: dialogue infrastructure is core (family #5 above), scenario/persona configuration is app-owned. A "scenario engine" adapter would be so thin (session + constraints config) that it is essentially a client-side library, not a server-side family.

### What about language-learning helpers?

PronunCo's phonetic comparison, lesson extraction, and drill generation do not form a reusable "language" family. They are domain-specific transforms that happen to be language-related. If generalized, `compare_pinyin` and `normalize_pinyin` belong in a **text-normalization adapter pack** that could serve any app needing phonetic transforms — but that pack is still domain-specific, not core. I would not elevate "language" to a family name; it invites over-generalization.

---

## 3. Client-side architecture proposal

The seed's diagram is directionally correct but under-specifies the **routing/policy layer**. Here is my refined model:

```
┌─────────────────────────────────────────────────────────────┐
│                      APP CORE                                │
│  (business logic, UX state, workflow, pedagogy, scoring)    │
└────────────────────┬────────────────────────────────────────┘
                     │ uses
┌────────────────────▼────────────────────────────────────────┐
│                CAPABILITY PORTS                              │
│  (interface definitions: WHAT the app needs)                │
│  e.g., SpeechService, DocumentQueryService,                 │
│        DialogueService, RulesService, VisionService         │
└────────────────────┬────────────────────────────────────────┘
                     │ implemented by
┌────────────────────▼────────────────────────────────────────┐
│              CAPABILITY ROUTER / POLICY                      │
│  (decides WHICH provider for WHICH call under WHAT rules)   │
│  e.g., "speech → always iHN (privacy)"                     │
│        "chat general → iHN; chat creative → OpenAI"        │
│        "docs → iHN when online; local cache when offline"  │
└────────────────────┬────────────────────────────────────────┘
                     │ routes to
┌────────────────────▼────────────────────────────────────────┐
│              PROVIDER ADAPTERS                               │
│  (interface implementations: HOW to talk to each backend)   │
│  iHNAdapter, AzureAdapter, OpenAIAdapter,                   │
│  AlibabaAdapter, LocalFallbackAdapter                       │
└────────────────────┬────────────────────────────────────────┘
                     │ talks to
┌────────────────────▼────────────────────────────────────────┐
│              STORAGE / SEARCH ADAPTERS                       │
│  (persistence abstractions)                                 │
│  LocalDisk, GitHub, iHNPersistence, CloudStorage            │
└─────────────────────────────────────────────────────────────┘
```

### Key refinement: the Capability Router is not optional

The seed shows provider adapters as if each capability port maps to one adapter. In reality, client apps need **composite routing**: a single `ChatService` port may route sensitive queries to iHN and creative queries to OpenAI, based on content classification, cost, latency, or privacy policy. This router/policy layer is where the client's "local-first" or "privacy-critical" or "offline-resilient" strategy lives.

Without an explicit router, the fallback logic leaks into every capability port call site, creating a brittle mess.

### What the app core owns

- Pedagogy, workflow sequencing, screen logic
- Domain-specific rubrics, scoring, evaluation criteria
- User state, preferences, progress
- Policy rules about WHEN to use WHICH provider (but the router enforces them)

### What the ports define

- Language-agnostic service interfaces
- No provider-specific types (no OpenAI `ChatCompletion` objects leaking into app core)
- No route names (no `/v1/chat` strings in app core)
- Domain models that the app core understands

### What the provider adapters handle

- Mapping port calls to provider-specific APIs (OpenAI SDK, Azure SDK, iHN REST routes)
- Authentication, retry, error translation
- Rate limiting and backoff
- Response normalization (convert provider-specific formats to port domain models)

### What the storage adapters handle

- Abstracting where app state lives (local SQLite, iHN persistence, GitHub, cloud)
- Sync strategy (when to push/pull from remote)
- Search/indexing abstraction

---

## 4. Pressure-test clients

### Best speech-heavy pressure test: TelPro-Bro

Not PronunCo. PronunCo is too deeply tied to language-learning pedagogy (pinyin, lesson items, vocabulary progression). TelPro-Bro tests speech in a more general coaching context: delivery speed, intonation, charisma, sentence structure. It pressure-tests the speech core (ASR/TTS) and asks whether coaching/evaluation overlays can be generic enough to reuse. If the architecture works for TelPro-Bro without knowing what a "lesson" is, it is genuinely general.

### Best docs/rules-heavy pressure test: iLegalFlow

iLegalFlow demands document RAG across multiple document types (contracts, patents, exhibits, customs codes), deterministic rules across jurisdictions, and structured extraction from legal forms. It is more structurally complex than iMedisys because legal reasoning spans heterogeneous sources and evolving regulations. If the document + rules families handle iLegalFlow cleanly, they will handle iMedisys and Tax comfortably.

### Client most likely to mislead the architecture: PronunCo

PronunCo is the oldest, most developed client with the most accumulated helper routes. If treated as "normal," it will overfit the architecture to language-learning specifics. It also has the most existing server-side coupling (routes in `plugins/pronunco.py`). PronunCo should be a **canary for plugin migration**, not a **template for new clients**.

**Runner-up:** Edge-Kite. It is infrastructure (event-stream recorder/pre-analyzer), not a user-facing client. If treated as a "client," it will push for node-level control-plane APIs that don't belong in the client-facing surface.

---

## 5. Where I disagree

### Disagreement A: Should adapter families live in the iHN monorepo or as separate packages?

The seed assumes adapter families live inside the iHN repo ("node-side adapters belong in iHN"). I think this is a **hidden scalability trap** that should be challenged now, not discovered later.

**Monorepo model (current implicit assumption):**
- Adapter families are files/directories inside `backend/app/plugins/` or `backend/app/domains/`
- iHN releases are coupled to adapter changes
- Adapter authors need iHN repo access and follow iHN release cadence
- Simple now; painful at 10+ adapter families

**Distributed package model (my proposal to consider):**
- iHN exposes a **plugin registration contract** (manifest format, loading API, namespace rules)
- Adapter families are separate installable packages (e.g., `ihn-monitoring`, `ihn-language-helpers`, `ihn-scenario-engine`)
- They can be developed, versioned, and released independently
- iHN core only knows the loading contract, not the adapter content
- Harder now; scales correctly

**Why this matters:** The seed proposes 5-7 adapter families. If we add tax adapters, medical adapters, legal adapters, investigation adapters, and coaching adapters, the iHN repo becomes a monolith of domain logic. That contradicts the boundary work from the previous sprint.

**My stance:** Preserve this as an open tension. Do not decide now. But the first coding sprint should design the plugin registration/loading contract with the **assumption that adapters may eventually be external packages**, even if the first ones are internal files.

### Disagreement B: Is "Monitoring & Event Triage" truly a reusable adapter family?

I listed it as family #6 above, but I am uncertain. On-My-Watch wants security monitoring (video analysis, anomaly detection, alert routing). Edge-Kite wants edge event pre-analysis (stream filtering, batch triage). iMedisys wants health alert routing (lab results, appointment triggers). These share the structural pattern (watch → detect → prioritize → route) but the detection models, alert formats, and routing targets are completely different.

**Risk:** "Monitoring & Event Triage" becomes a false generalization where the "shared" layer is so thin ("here is a stream, here is a callback") that it provides no value, while the "domain" layer is so thick that it should just be app-owned logic.

**Counter-position worth preserving:** Maybe monitoring is not an adapter family at all. Maybe it is a **deployment pattern** (Edge-Kite, On-My-Watch nodes run with different sensor configs) that consumes core primitives (vision, chat, rules) directly, with no special adapter layer needed.

### Disagreement C: Should client-side discussions start now or later?

The seed proposes: finish cross-client draft → mirror to PronunCo → mirror to iLegalFlow/iMedisys → compare → then coding.

I think this is too sequential. The client-side port/adapter model will not be validated until a real client repo tries to implement it. The cross-client draft is an abstraction that might look elegant on paper but break when faced with PronunCo's existing codebase or TelPro-Bro's SwiftUI architecture.

**My proposal:** Start the **PronunCo mirror discussion in parallel**, not sequentially. The cross-client draft and the first client mirror will inform each other. Waiting for "stability" before mirroring risks producing a draft that is elegant but unimplementable.

However, I agree with the seed that **all client mirrors should not start at once**. Only PronunCo (as the canary) and one non-speech client (iLegalFlow or iMedisys) should mirror in parallel. The rest wait.

---

## 6. Suggested next move

**Step 1: Parallel tracks (next 1-2 days)**
- Track A: Continue refining this cross-client adapter-family draft (1 more round of critique/synthesis)
- Track B: Start the **PronunCo client-mirror discussion** immediately. Ask: "Given the proposed port/adapter model, how would PronunCo's existing Swift code map to capability ports and provider adapters?"

**Step 2: Synthesis and validation**
- Compare the cross-client draft with the PronunCo mirror. Where do they diverge? The divergences are the most important signals.
- Decide on the plugin registration/loading contract (monorepo vs. distributed).

**Step 3: First coding sprint (after synthesis)**
- **"Speech domain extraction + plugin contract design"** — mechanical extraction of ASR/TTS/voices to `domains/speech.py` (carryover from previous sprint)
- **PLUS** design the plugin manifest/registration contract, with an eye toward future external packages
- Acceptance criteria: a second plugin family (e.g., monitoring stubs or language-helper stubs) can be registered and discovered through `/capabilities` without modifying `main.py`

**Why this sequence:** It validates both the server-side boundary (speech extraction) and the adapter extensibility model (plugin contract) in one sprint. Without the plugin contract, the next adapter family will require another round of "where do we put the files" debate.

---

## Appendix: Family-to-client mapping

| Client | Uses Family 1 (Speech) | Uses Family 2 (Docs) | Uses Family 3 (Vision) | Uses Family 4 (Rules) | Uses Family 5 (Dialogue) | Uses Family 6 (Monitoring) |
|---|---|---|---|---|---|---|
| PronunCo | Heavy | Light | Light | No | Heavy | No |
| TelPro-Bro | Heavy | Light | No | No | Heavy | No |
| iMedisys | Light (dictation) | Heavy | Heavy (bills, scans) | Heavy | Light | Light (alerts) |
| iLegalFlow | Light | Heavy | Heavy (exhibits) | Heavy | Light | No |
| ScamHunters | No | Heavy | Heavy (evidence) | Light | Light | No |
| On-My-Watch | No | No | Heavy (video) | No | No | Heavy |
| ACTCLI | Light | Light | No | Light | Heavy | No |

This matrix confirms that Families 1-5 have strong cross-client justification. Family 6 (Monitoring) is weaker but still supports 2+ clients. The excluded families (Planning, Coaching) would show as "every client uses it differently" rather than "many clients share the same server-side structure."

---

*End of Round 1 response. Formed independently without reading other reviewers' responses.*
