# Round 2 Response — Adapter Families and Client Ports

## Reviewer

- **Name / model:** DeepSeek-v4-pro
- **Date:** 2026-05-05
- **Round:** 2 (critique and convergence)

---

## Position changes from Round 1

Reading the other 8 reviewers changed my position on two items:

1. **Monitoring/triage**: I was "yes" in Round 1. Now I'm "no." Kimi, Qwen, and GLM convinced me that it's a consumption pattern (vision + chat + rules), not a server-side family. Only two clients need it, and one (Edge-Kite) is a node role, not a client.

2. **Data/connectors**: I proposed this as Family 7. Now I'm revising it to a **client-side adapter pattern** with shared conventions, not a server-side family. The implementations need user credentials that don't belong on the node.

All other positions are refinements, not reversals.

---

## Tension 1: Is Monitoring/triage a real adapter family?

**Position: No. Drop it as a server-side adapter family.**

I changed my position after reading Kimi's family-to-client matrix and GLM's deployment-pattern argument.

The "yes" camp (which included me in Round 1) argues the structural pattern is shared: watch → detect → prioritize → route. That pattern is real. But it's a **consumption pattern** — how clients compose core primitives — not a **server-side adapter** — what the server provides.

Here's the concrete test: what would a monitoring adapter family contain that isn't already covered by existing core routes?

- "Watch" → periodic calls to `/v1/vision/analyze` or `/v1/investigate/scan`. Already core.
- "Detect" → rules engine evaluating domain-specific alert conditions. `/v1/rules/evaluate` already provides this.
- "Prioritize" → chat-based summarization and triage logic. `/v1/chat` and `/v1/summarize` already provide this.
- "Route" → notification policy. No current core route, but adding one would duplicate what `/v1/investigate/*` and app-level orchestration already handle.

A monitoring family would end up as either:
- A thin wrapper around existing core primitives (adds no value), or
- A thick domain-specific orchestrator (duplicates app-owned logic)

Neither outcome is a good adapter family. The "no" camp is right: monitoring is app-level orchestration using core primitives.

**Open question for coding sprints:** Does On-My-Watch need event streaming (server-sent events, WebSocket) from the iHN node to implement monitoring? If yes, that's a core infrastructure need (streaming), not a monitoring adapter family. The streaming primitive should be evaluated separately.

---

## Tension 2: Should Planning/recommendation be dropped as a family?

**Position: Yes. Drop it. 6/3 is a clear signal.**

I held this position in Round 1 and hold it more strongly after reading the other responses.

Kimi made the strongest argument: tax planning, medical appointment planning, lesson progression planning, and travel planning share almost no server-side structure. They all reduce to "chat + structured output + domain rules." A "planning" family would be a dumping ground.

Qwen's contract-shape framing strengthens this: what would the planning adapter contract look like? Input: a goal description. Output: a plan. That's just chat with structured output. There's no distinctive adapter contract — no specific state management, no specialized input/output shape, no model routing that differs from chat. If chat + structured output already covers it, the family doesn't exist.

Two of the three "yes" voters (Grok, Codex, Nemotron) placed planning in installable plugin space anyway — which means they agree it's not core. The disagreement is only whether planning deserves a named family at all versus being implicit in the existing families.

**What survives:** The *need* for structured planning output exists across 5+ clients. But the server-side answer is already provided by `/v1/chat` with structured output formatting. The client-side answer is a `PlanningPort` that composes chat + rules. No server-side family needed.

**A specific note on Grok's position from Round 1:** Grok listed planning as Family 5 but with "core substrate + installable plugin for domain planning loops." The core substrate (chat + summarize + structured output) already exists. The "plugin for domain planning loops" is what I'm arguing would be a false generalization — each domain's planning loop is so different that the plugin would be a thin wrapper around chat with no reusable logic.

---

## Tension 3: Data/external connectors — 7th family?

**Position: Revise. Connectors are a client-side adapter pattern with shared interface conventions, not a server-side adapter family.**

I proposed this family in Round 1. Reading the 7/9 who did NOT adopt it, I'm revising my position — but preserving the *need*.

The strongest counter-argument (implicit in most responses, explicit in Gemini's and Kimi's): external connectors require credentials. API keys for USPTO, GitHub tokens, database passwords — these are user-owned secrets that should not live on the iHN node. Placing connectors server-side means the node holds credentials for external services, which:
- Breaks the privacy model (the node shouldn't proxy authenticated external API calls)
- Creates a credential management problem (who configures them? how are they rotated?)
- Makes the node a single point of credential compromise

**Revised proposal: Connectors as a client-side pattern, not a server-side family.**

iHN should provide:
1. A **connector interface convention** — standard interface shapes for external data sources (`IDataConnector`, `IStreamConnector`, `ISearchConnector`)
2. A **credential management pattern** — how client apps store and use API keys securely (keychain on iOS, Keystore on Android, WebCrypto in browser)
3. **Ingest primitives for imported data** — once a client pulls data from an external source, `/v1/docs/ingest` and `/v1/persistence/*` store it locally

Clients should implement:
1. Individual connector implementations (`USPTOConnector`, `GitHubConnector`, `AuctionAPIConnector`)
2. Credential management (per-client, per-user)
3. Rate limiting and caching (client-side, since credentials are client-side)

**What this means for the family list:** Connectors drop from the 7 server-side families. A new section on "Client-side adapter patterns" should document the connector interface convention as a shared pattern, not a server-side family.

**Open question:** If two clients (iLegalFlow and iForeclosed) both need USPTO API access, do they share a connector library, or does each implement independently? Answer: they should share a library. But that library lives in client-side package space, not in iHN's server-side plugin space.

---

## Tension 4: Provider adapters — iHN-only or multi-provider client?

**Position: Model A (iHN as sole provider) is the primary architecture. Model B is an opt-in escalation with explicit user consent.**

I argued for "both, sequenced" in Round 1. Reading Gemini's stronger dissent and the general drift toward Model A across the panel, I'm strengthening my position toward Model A while preserving Model B as an explicit opt-in.

**Why Model A must be primary:**

1. **Privacy promise.** The iHN value proposition is "your data stays local." Client-side cloud adapters with direct OpenAI/Azure connections break that promise. The user can't trust that their medical records or legal documents aren't being sent to a cloud provider without their knowledge.

2. **Auditability.** If the iHN node is the sole API surface, all AI traffic is auditable (node logs, capability usage, session history). If clients can bypass the node, there's no central audit point.

3. **Simplicity.** Current codebase has 2 backends (Ollama, MLX) with server-side switching. Adding client-side multi-provider switching adds 3-4 layers of abstraction before any client benefits from it.

4. **Gemini's argument accepted:** "Allowing client apps to directly contact OpenAI breaks the privacy and auditability promises of the iHN platform." This is correct.

**When Model B is legitimate:**

A client that needs offline resilience might want: "try iHN first, if unreachable, fall back to Azure." This is a legitimate need. But it should be:

- Explicitly configured by the user (API key entry, consent screen)
- Visibly indicated in the UI ("Using cloud provider because iHN node is offline")
- Logged on both client and server (when the server comes back online)
- The exception, not the default

**Architectural implication:** The capability port interface should support both models (the port doesn't care who implements it). But:
- Default shipping configuration: ports are backed by `IhnProviderAdapter` only
- Cloud adapters (`AzureProviderAdapter`, `OpenAIProviderAdapter`) are available in a client-side library but require explicit user opt-in
- The policy/orchestration layer enforces: "never use cloud unless user consented AND iHN is unreachable"

**Refinement of my Round 1 position:** I said "design for both, start with Model A." I now say: **Model A is the architecture. Model B is an optional extension that must not compromise the default privacy model.**

---

## Tension 5: Should "1 family = 1 plugin_id" be the mapping rule?

**Position: Modify. Accept the principle, but allow families to span core routes and multiple plugin_ids.**

GLM's proposal is clean and forces discipline: one conceptual family, one namespace, one plugin pack. This prevents the ambiguity of "which plugin_id does this adapter belong to?"

But the rule is too rigid for the actual family structure we've converged on:

| Family | Actually spans | Rigid 1:1 mapping | Modified mapping |
|---|---|---|---|
| Speech/Audio I/O | Core only (no plugin) | Would need a dummy plugin_id | No plugin_id needed — it's core |
| Documents & Knowledge | Core engine + plugin packs | One plugin_id for all doc packs | Core engine at `/v1/docs/*`; plugin packs at `/v1/plugins/docs-medical/`, `/v1/plugins/docs-legal/` |
| Vision & Extraction | Core engine + plugin templates | One plugin_id for all templates | Core engine at `/v1/vision/*`; plugin templates registered via template registry |
| Rules & Evaluation | Core engine + domain packs | One plugin_id for all rule packs | Core evaluator at `/v1/rules/*`; domain packs at `/v1/plugins/rules-medical/`, `/v1/plugins/rules-legal/` |
| Dialogue & Sessions | Core primitive + plugin scenarios | One plugin_id for all scenarios | Core primitive at `/v1/dialogue/*`; scenario packs at `/v1/plugins/dialogue-pronunco/`, `/v1/plugins/dialogue-coaching/` |
| Language adapters | Plugin only | Works perfectly | `/v1/plugins/lang/pinyin-compare`, etc. |

**Modified rule:**

1. **Families that are entirely core** (Speech/Audio I/O) — live at Tier 1 `/v1/...` with no plugin_id. The "family" is the domain router.

2. **Families that are entirely plugin** (Language adapters) — one family = one plugin_id. `/v1/plugins/lang/...` is the canonical example.

3. **Families that are mixed** (Documents, Vision, Rules, Dialogue) — the core engine lives at Tier 1 `/v1/...`; domain packs live under family-aligned plugin_ids. Multiple plugin_ids are allowed when sub-domains are genuinely distinct (e.g., `rules-medical` vs `rules-legal`).

4. **The plugin_id should contain the family name** — so the mapping is visible. `/v1/plugins/rules-medical/` makes the family relationship clear. `/v1/plugins/med-rules-pack/` does not.

This is a modification, not a rejection. The principle (family-to-namespace mapping should be explicit) is preserved. The rigid 1:1 rule is relaxed for mixed families and multi-domain families.

---

## Tension 6: When should client-mirror discussions start?

**Position: PronunCo mirror starts in parallel now. Second mirror (iLegalFlow or iMedisys) waits until after one coding sprint.**

The split is 4/5 (wait vs parallel). I was in the "wait" camp (4/9) in Round 1. Reading Kimi, Qwen, Grok, and GLM's arguments for parallel, I'm moving to a hybrid position.

**Why I moved:** The "wait" argument (which I advanced) says client repos shouldn't design ports against their own needs before the cross-client pattern stabilizes. That's correct. But the cross-client pattern will never stabilize without real client feedback. Waiting for "completeness" before engaging PronunCo is the same mistake the boundary review sprint corrected: designing in abstraction without grounding in implementation.

**Hybrid approach:**

1. **PronunCo mirror starts now** (in parallel with this Round 2). But frame it as **validation, not design**. PronunCo receives the current draft and answers: "Can we build the proposed ports? Where does this break against our existing code?" PronunCo does NOT design its own port model from scratch. It stress-tests the cross-client draft.

2. **Second mirror (iLegalFlow or iMedisys) waits** until after:
   - Round 2 synthesis of this sprint
   - Coding Sprint 1 (speech extraction + plugin namespace)
   - PronunCo mirror reports its findings

   Why wait? Because the first mirror will reveal whether the port model is implementable. Starting the second mirror before the first mirror reports back is starting two validation exercises with an unvalidated model. Sequence: validate with PronunCo → refine the model → validate with the second client.

3. **All other client mirrors wait** until the model is validated against two clients. No need to mirror into RoadNerd, On-My-Watch, ScamHunters, etc. until the pattern is proven.

**What PronunCo's mirror should produce:**

- A mapping: "Here are PronunCo's current capabilities, and here's how they'd map to the 5-7 ports"
- A gap list: "Here's what PronunCo needs that no port covers"
- A thickness check: "Here's what's PronunCo-specific and should NOT be in a shared port"
- NOT: a PronunCo-designed port model

**This approach prevents two failure modes:**
- Waiting too long (the "wait" camp's mistake — designing in abstraction)
- Starting too many mirrors in parallel (the "parallel" camp's risk — diverging independently before the cross-client pattern converges)

---

## Tension 7: Policy/orchestration — separate layer or part of app core?

**Position: Architecturally separate. Physically co-locatable for thin clients.**

The split is 7/9 for separate layer, 2/9 (GLM, Qwen) for collapsing into app core. I was in the separate-layer camp and remain there, but with a refinement based on GLM's concern.

**Why it should be architecturally separate:**

1. **Testability.** If policy is embedded in app core, you can't test the app core without provider selection logic. With policy separate, you test: (a) app core with mock ports, (b) policy with mock adapters, (c) integration with real adapters. Three test surfaces, three levels of isolation.

2. **Reusability across providers.** The app core should not change when you switch from iHN-only to iHN+Azure fallback. If policy is in app core, adding a second provider touches the app core. If policy is separate, adding a provider touches only the policy layer and the new adapter.

3. **Single-provider vs multi-provider clients.** A client with one provider (iHN only, the default) may not need a visible policy layer. A client with multiple providers (iHN + Azure, with consent) needs explicit policy. The architecture should support both without restructuring.

**GLM's concern is valid and addressed:** "Too many layers for mobile." A lightweight mobile client with one provider shouldn't have a 5-layer hierarchy where the policy layer is one if/else.

**Refinement:** The policy layer is **architecturally distinct** (separate module, separate test surface, explicit interface to the app core) but may be **physically thin** (a single file, or even a configuration object) for single-provider clients. When a second provider is added, the policy layer expands to handle the new routing logic without touching app core.

Concretely:

```typescript
// Single-provider client (thin policy)
const policy: PolicyConfig = {
  chat: { primary: ihnProvider, fallback: null },
  speech: { primary: ihnProvider, fallback: null },
};

// Multi-provider client (thicker policy)
class PrivacyAwarePolicy implements PolicyLayer {
  async routeChat(request: ChatRequest): Promise<ChatPort> {
    if (isSensitiveData(request) || !userConsentedToCloud) return ihnChatProvider;
    if (!await ihnChatProvider.isAvailable()) return azureChatProvider;
    return ihnChatProvider;
  }
}
```

Both implement the same `PolicyLayer` interface. Both are separate from app core. But the implementation complexity scales with the number of providers, not with the architecture.

**Position: Architecturally separate layer. Implementations range from thin config to thick routing logic based on the number of providers.**

---

## New insight from reading other reviewers

### Kimi's family-to-client matrix

Kimi built a concrete matrix mapping 7 clients to 6 families (in an appendix). This is the single most useful artifact from any Round 1 response. It validates Families 1-5 with hard evidence and shows Family 6 (Monitoring) is weak (2 clients, one of which is a node role).

**Recommendation:** Adopt Kimi's matrix as a living document in the initiative. Update it when new clients or families are proposed. Use it as the primary evidence for family promotion/demotion.

### Qwen's contract-shape framing

Qwen argued families should be organized by contract shape, not cognitive work. "Speech" is a brain-demand cluster; "Audio I/O with model routing and voice selection" is an adapter family. This distinction is sharp and should be adopted.

**Refinement to my Round 1 family definitions:** Each family should have a one-line contract-shape description:
- Speech: "Stateless audio input → text output; text input → audio output; voice metadata"
- Documents: "Collection-scoped ingest and query with structured/semantic retrieval"
- Vision: "Stateless image input → structured data output via registered templates"
- Rules: "Stateless domain-scoped deterministic evaluation of facts against rule sets"
- Dialogue: "Stateful session-scoped turn management with context trimming and token accounting"
- Language: "Stateless domain-specific transforms bridging speech/translation primitives to language-learning needs"

### Gemini's strongest position: client apps should NOT bypass iHN

Gemini's position on Tension 4 is the strongest single opinion in any Round 1 response. It forced me to strengthen my Model A position. Even though I already favored Model A as the starting point, Gemini's framing made me realize Model B isn't just "another option" — it's a privacy-model change that should require explicit user consent and architecture gating.

### GLM's 1:1 mapping proposal

GLM's "one family = one plugin_id" rule was the most architecturally specific proposal for the namespace mapping. I'm modifying rather than accepting it, but the impulse — making the family-to-namespace relationship explicit and machine-checkable — is correct and should be preserved.

---

## Open questions that should survive into coding sprints

1. **Streaming primitives for Monitoring.** If we drop the monitoring family, On-My-Watch still needs event streaming from the node. Does iHN need a WebSocket or SSE primitive for event delivery? This is a core infrastructure question, not an adapter family question — but it needs an answer before On-My-Watch can be implemented.

2. **Connector library sharing.** If iLegalFlow and iForeclosed both need USPTO API access, do they share a client-side connector library? Where does that library live? In a shared client-side package? In the iHN repo as reference implementations? Answering this determines whether connectors are a truly shared pattern or just a naming convention.

3. **Plugin loading contract.** Every adapter family that's "installable plugin space" needs a loading mechanism. Currently plugins are hardcoded imports in `main.py`. Coding Sprint 1 (speech extraction) doesn't fix this. A follow-on sprint must design the plugin manifest, registration, and discovery contract — and Kimi's question about monorepo vs distributed packages needs resolution.

4. **Dialogue primitive thickness.** The dialogue family depends on whether `/v1/dialogue/sessions` becomes core. If it stays plugin-only, the dialogue family collapses into app-owned orchestration. The first coding sprint (speech extraction) will expose whether PronunCo's dialogue code is extractable — this question is scheduled but not yet answered.

---

## Final adapter family list (6 families, post-Round 2 convergence)

| # | Family | Contract shape | Home |
|---|---|---|---|
| 1 | **Speech & Audio I/O** | Stateless audio ↔ text; voice metadata | Core Tier 1 (`domains/speech.py`) |
| 2 | **Documents & Knowledge** | Collection-scoped ingest, RAG query, structured extraction | Core engine + plugin domain packs |
| 3 | **Vision & Extraction** | Stateless image → structured data via templates | Core engine + plugin templates |
| 4 | **Rules & Evaluation** | Stateless domain-scoped deterministic evaluation | Core evaluator + plugin rule packs |
| 5 | **Dialogue & Sessions** | Stateful session-scoped turn management with context trimming | Core primitive + plugin scenarios |
| 6 | **Language & Speech adapters** | Stateless domain transforms bridging core speech to app needs | Plugin only (`/v1/plugins/lang/...`) |

**Dropped from seed:** Monitoring/triage, Planning/recommendation.  
**Dropped from my Round 1:** Data/connectors (moved to client-side pattern).  
**Retained:** Language adapters (my Round 1 Family 1, now more clearly scoped as plugin-only speech transforms).

---

*End of Round 2 response. Formed by reading all 8 other Round 1 responses and the orchestrator synthesis, then refining my positions on the 7 tensions.*
