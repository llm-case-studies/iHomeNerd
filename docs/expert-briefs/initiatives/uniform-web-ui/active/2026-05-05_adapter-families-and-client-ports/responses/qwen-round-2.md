# Round 2 Response — Adapter Families and Client Ports

## Reviewer

- Name / model: qwen
- Date: 2026-05-05
- Round: 2 (critique and convergence)

## Position changes from Round 1

Reading the other 8 reviewers changed my position on two items:

1. **Policy/orchestration as a layer:** I argued for collapsing it into app core (4 layers). After reading GLM's modified position and DeepSeek's concrete code sketch, I now accept that policy should be architecturally separate. But I agree with GLM that it should not be a separate call-stack layer — it should live inside the port implementation, not between app core and port.

2. **Client-mirror timing:** I argued for parallel mirrors. After reading DeepSeek's implementation gap analysis and GLM's tight sequencing proposal, I accept that mirrors should start after one coding sprint produces a working reference. But I would compress the timeline more than DeepSeek proposes.

All other positions are refinements, not reversals.

---

## Tension 1: Is Monitoring/triage a real adapter family?

**Position: No.**

I held this position in Round 1 and hold it more strongly after reading the Round 2 responses.

DeepSeek changed their position from "yes" to "no" and provided the clearest test: what would a monitoring adapter family contain that is not already covered by existing core routes? The answer is nothing. "Watch" is periodic calls to `/v1/vision/analyze` or `/v1/investigate/scan`. "Detect" is `/v1/rules/evaluate` with domain-specific alert conditions. "Prioritize" is `/v1/chat` or `/v1/summarize`. "Route" is notification policy — which is app-owned orchestration.

GLM's distinction between capability patterns and composition patterns is the decisive frame. Every other family in the Big 5 provides a capability the app cannot build on its own (ASR, TTS, OCR, rule evaluation, document indexing). Monitoring composes those capabilities into a loop. The loop logic is client-owned workflow, even if the pattern recurs.

Codex's counter — that the event lifecycle and triage envelope are reusable — is valid but does not justify a server-side family. The envelope can be a shared client-side interface (`EventTriagePort`) backed by existing core primitives. No new server routes needed.

**The one real gap:** event streaming. If On-My-Watch needs WebSocket or SSE from the node, that is a core infrastructure primitive (streaming transport), not a monitoring adapter family. The streaming primitive should be evaluated separately.

**Open question for coding sprints:** Does iHN need a streaming transport primitive (WebSocket, SSE, or similar) for event delivery? If yes, it is a core infrastructure question, not an adapter family question.

---

## Tension 2: Should Planning/recommendation be dropped as a family?

**Position: Yes. Drop it.**

I held this position in Round 1. The 6/3 majority is correct.

What I would add after reading the Round 2 responses: the planning family fails Qwen's own contract-shape test. What would the planning adapter contract look like? Input: a goal description. Output: a plan. That is chat with structured output. There is no distinctive adapter contract — no specific state management, no specialized input/output shape, no model routing that differs from chat. If chat + structured output already covers it, the family does not exist.

GLM's observation that Grok and Codex (the holdouts) described planning as "core substrate + installable plugin for domain planning loops" is devastating to the "yes" position. That is just chat with a prompt template. Not a family.

**What survives:** The need for structured planning output exists across 5+ clients. But the server-side answer is `/v1/chat` with structured output formatting. The client-side answer is a `PlanningPort` that composes chat + rules. No server-side family needed.

**Open question to preserve:** If a future client needs structured planning output schemas that multiple apps reuse, does that justify a shared prompt library in client code? Yes — but that is a client-side concern, not a server-side family.

---

## Tension 3: Should Data/external connectors be the 7th family?

**Position: Yes — but scoped as "External ingestion bridges" (GLM's term), not "Data connectors."**

I did not propose this family in Round 1. DeepSeek did. After reading the Round 2 responses, I find the argument for a 7th family persuasive but only under GLM's tight scoping.

The key insight from GLM: external connectors feed the document pipeline, not the app directly. A USPTO connector does not return patent data to iLegalFlow's UI; it ingests patent data into `/v1/docs/*` so the rules engine and RAG query can reason over it. The connector is an ingestion adapter, not a query proxy.

This scoping resolves the credential ownership tension. Connectors authenticate against external APIs, normalize responses into iHN-compatible document formats, and feed results into the document pipeline. They do not serve as query proxies for the app. This means:

- Connector credentials can live on the iHN node (the node is the ingestion endpoint)
- The connector is a thin bridge: authenticate → fetch → normalize → ingest
- The app queries the ingested data through `/v1/docs/*`, not through the connector

This is different from persistence (storing app-owned data) and different from provider adapters (implementing capability ports). It is a distinct contract shape: external API → normalized document → document pipeline.

**Classification:** Installable plugin space. Each connector is a plugin pack under the ingestion family namespace.

**Open question to preserve:** Where do connector credentials live for connectors that require per-user OAuth flows (Google Drive, GitHub, email)? The USPTO API can use a shared key. But OAuth-based connectors require user authentication in the client. Should the client authenticate and hand the token to the node for ingestion, or should the connector run client-side? This should be decided per-connector, not as a blanket rule.

---

## Tension 4: Provider adapters — iHN-only or multi-provider client?

**Position: Model A (iHN as sole provider) is the primary architecture. Model B is an opt-in extension that must not compromise the default privacy model.**

I argued for "both, sequenced" in Round 1. After reading Gemini's privacy argument and DeepSeek's strengthened Model A position, I agree: Model A is the architecture, not just the starting point.

Gemini's argument is decisive: allowing client apps to directly contact OpenAI breaks the privacy and auditability promises of the iHN platform. This is not a theoretical concern. iMedisys (HIPAA), iLegalFlow (attorney-client privilege), and ScamHunters (investigation evidence) all have data that must not leave the local trust boundary without explicit user consent and audit logging. If the client can bypass iHN, those guarantees are unenforceable.

DeepSeek's refinement is also correct: the capability port interface should support both models (the port does not care who implements it). But the default shipping configuration should be `IhnProviderAdapter` only. Cloud adapters should require explicit user opt-in and visible UI indication.

**Architectural implication:** The port interface is provider-agnostic. The default implementation is iHN-only. Cloud fallback is an exception, not a design target.

**Open question to preserve:** Should iHN ever implement a server-side cloud proxy? If a user explicitly consents to "use OpenAI for creative writing but keep medical data local," should the node make that OpenAI call on the user's behalf (with logging, auditing, caching)? This is a product decision, not an architecture decision.

---

## Tension 5: Should "1 family = 1 plugin_id" be the mapping rule?

**Position: Modify. Accept the principle, but allow families to span core routes and multiple plugin_ids.**

GLM's proposal is clean and forces discipline. But the actual family structure we have converged on does not fit a rigid 1:1 mapping:

| Family | Actually spans | Rigid 1:1 | Modified mapping |
|---|---|---|---|
| Speech/Audio I/O | Core only | Dummy plugin_id needed | No plugin_id — it's core |
| Documents & Knowledge | Core engine + plugin packs | One plugin_id for all | Core at `/v1/docs/*`; packs at `/v1/plugins/docs-{domain}/` |
| Vision & Extraction | Core engine + plugin templates | One plugin_id for all | Core at `/v1/vision/*`; templates via registry |
| Rules & Evaluation | Core evaluator + domain packs | One plugin_id for all | Core at `/v1/rules/*`; packs at `/v1/plugins/rules-{domain}/` |
| Dialogue & Sessions | Core primitive + plugin scenarios | One plugin_id for all | Core at `/v1/dialogue/*`; scenarios at `/v1/plugins/dialogue-{app}/` |
| External Ingestion | Plugin only | Works | `/v1/plugins/ingest-{source}/` |

Codex's counter-proposal (manifest-based family mapping with primary `family_id` and secondary dependencies) is the better approach. Every plugin declares its primary family in its manifest. The `/capabilities` response exposes family tags alongside capability names. Route ownership remains `/v1/plugins/{plugin_id}/...`.

This keeps the mapping explicit and machine-checkable without forcing false namespace symmetry. A `rules-medical` plugin and a `rules-legal` plugin both belong to the Rules family but have separate plugin_ids because their content is genuinely distinct.

**Modified rule:**
- Every plugin declares a primary `family_id` in its manifest
- Plugins may declare secondary family dependencies
- `/capabilities` exposes core capabilities, plugin capabilities, and family tags
- Route ownership remains `/v1/plugins/{plugin_id}/...`
- The plugin_id should contain the family name for visibility: `/v1/plugins/rules-medical/` not `/v1/plugins/med-rules-pack/`

**Open question to preserve:** Should the capability registry use the family name as the grouping key for plugin capabilities? I think yes, but this should be validated when the plugin registration mechanism is built.

---

## Tension 6: When should client-mirror discussions start?

**Position: Sequential but tight — one coding sprint + one port prototype, then PronunCo mirror.**

I argued for parallel mirrors in Round 1. After reading DeepSeek's implementation gap analysis and GLM's tight sequencing proposal, I accept that mirrors should start after a working reference exists.

DeepSeek's observation is sobering: no client currently has a capability port layer. No plugin registration exists. Only two providers (Ollama, MLX) with a server-side if/else. The dependency chain is:

```
Plugin registration → Capability advertisement (tiered) → Client capability ports → Policy routing → Provider adapters
```

Mirroring into PronunCo before any of this exists means the PronunCo team designs against diagrams, not code. They will optimize for their existing monolithic logic, producing non-reusable ports.

**Proposed sequence:**

1. Complete this Round 2 synthesis
2. One focused coding sprint: plugin registration + capability advertisement tiering + speech domain extraction + one capability port prototype (`ChatPort` + `IhnChatAdapter`) in the Command Center frontend (~1 week)
3. Mirror into PronunCo: with a working port example + working plugin registration, the PronunCo team can stress-test the cross-client draft against reality
4. Mirror into iMedisys or iLegalFlow: second client, different family mix
5. Synthesize mirror results and plan next coding sprints

The total time from this discussion to the first client mirror is 1-2 weeks, not the 3-4 weeks DeepSeek proposed. The key is bundling the coding sprint tightly.

**What PronunCo's mirror should produce:**
- A mapping: "Here are PronunCo's current capabilities, mapped to the proposed ports"
- A gap list: "Here's what PronunCo needs that no port covers"
- A thickness check: "Here's what is PronunCo-specific and should NOT be in a shared port"
- NOT: a PronunCo-designed port model

**Open question to preserve:** Should the Command Center's capability port prototype be "the reference" or "a throwaway spike"? I lean toward "reference with the expectation that it will be revised once" — the first client mirror will change it.

---

## Tension 7: Is policy/orchestration a separate layer or part of app core?

**Position: Architecturally separate module, but injected into the port implementation — not a separate call-stack layer.**

I argued for collapsing policy into app core in Round 1. After reading GLM's modified position and DeepSeek's concrete code sketch, I change my position — but with GLM's refinement.

The policy concern is genuinely distinct from the app core's domain logic. App core says what the product is trying to do. Policy says which adapter to use, under what privacy, latency, cost, offline, consent, or capability-discovery constraints. Mixing these makes the core brittle and hard to test.

But GLM is right that a 5-layer call-stack model (core → policy → port → adapter) creates mobile-hostile indirection. The resolution: **policy is a separate module injected into the port implementation, not a layer between app core and port.**

```
App Core → ChatPort.sendMessage(text)
                │
                │ (port implementation internally applies policy)
                │
                ├── if privacy=sensitive → IhnChatAdapter
                └── if privacy=creative  → CloudChatAdapter
```

This avoids the indirection problem (app core still calls one method on one port) while keeping the policy concern cleanly separated (the policy is a configuration object injected into the port, not interleaved with domain logic).

For a single-provider client, the policy is a thin config object. For a multi-provider client, the policy is a routing class. Both implement the same `PolicyConfig` interface. Both are separate from app core. But the implementation complexity scales with the number of providers, not with the architecture.

**Open question to preserve:** How is policy configuration updated at runtime? If the user toggles "offline mode" or "privacy strict," does the port swap adapters immediately, or does it wait for the next request? This is an implementation detail that should not be decided architecturally now, but the port interface must support it.

---

## New insights from reading other reviewers

### DeepSeek's implementation gap analysis

The observation that we are separated from this architecture by 3-4 layers of missing infrastructure is sobering and correctly calibrates how much refactoring is required. The dependency chain (plugin registration → capability advertisement → client ports → policy routing → provider adapters) is the main sequencing constraint. The architecture should not pretend these layers can be implemented independently.

### GLM's "External ingestion bridges" scoping

GLM's framing of connectors as ingestion adapters that feed the document pipeline — not query proxies that serve the app directly — is the cleanest resolution of the connector tension. It resolves the credential ownership question (credentials live on the node for ingestion) and prevents scope creep (connectors do not become a general ETL framework).

### Gemini's privacy-boundary argument

Gemini's position on Tension 4 is the strongest single opinion in any Round 2 response. It forced me to strengthen my Model A position from "start with Model A" to "Model A is the architecture." The privacy and auditability promises of iHN are not optional features — they are the platform's core value proposition.

### Codex's manifest-based family mapping

Codex's proposal (primary `family_id` + secondary dependencies in plugin manifest) is better than GLM's rigid 1:1 rule. It keeps the mapping explicit and machine-checkable without forcing false namespace symmetry.

---

## Final adapter family list (6 families, post-Round 2 convergence)

| # | Family | Contract shape | Home |
|---|---|---|---|
| 1 | **Audio I/O** | Stateless audio ↔ text; voice metadata | Core Tier 1 (`domains/speech.py`) |
| 2 | **Document Pipeline** | Collection-scoped ingest, RAG query, structured extraction | Core engine + plugin domain packs |
| 3 | **Vision & Extraction** | Stateless image → structured data via templates | Core engine + plugin templates |
| 4 | **Rules & Evaluation** | Stateless domain-scoped deterministic evaluation | Core evaluator + plugin rule packs |
| 5 | **Dialogue & Sessions** | Stateful session-scoped turn management with context trimming | Core primitive + plugin scenarios |
| 6 | **External Ingestion Bridges** | Authenticate → fetch → normalize → ingest into document pipeline | Plugin only (`/v1/plugins/ingest-{source}/`) |

**Dropped from seed:** Monitoring/triage (composition pattern, not capability), Planning/recommendation (chat + structured output).

---

## Recommended next sprint

**"Plugin registration + speech extraction + ChatPort prototype"** — a combined sprint that produces:

1. Plugin registration mechanism + tiered capability advertisement
2. Speech domain extraction from `plugins/pronunco.py` to `domains/speech.py`
3. One capability port (`ChatPort` + `IhnChatAdapter`) in the Command Center frontend

This sprint bridges the gap between discussion and implementation. After it completes, client-mirror discussions can proceed with working reference code, not diagrams.

---

*End of Round 2 response. Formed by reading all 8 other Round 1 responses, the orchestrator synthesis, and 4 Round 2 responses, then refining my positions on the 7 tensions.*
