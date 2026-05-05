# Round 2 Response: Adapter Families and Client Ports

## Reviewer

- Name / model: glm-5.1
- Date: 2026-05-05

---

## Tension 1: Is Monitoring/triage a real adapter family?

**Position: No — but I've softened from my Round 1 stance.**

In Round 1 I said monitoring is "app-level orchestration of existing primitives (vision + chat + rules)." After reading the "yes" camp (DeepSeek, Codex, Grok, MiniMax, Nemotron), I see a better version of the argument: the *structural pattern* (watch → detect → prioritize → route) recurs across On-My-Watch, Edge-Kite, and parts of iMedisys/ScamHunters. That is a genuine shared shape.

But I still land on "no" for two reasons the "yes" camp has not adequately addressed:

1. **The core primitives monitoring needs do not exist yet.** DeepSeek themselves acknowledge: "streaming events and real-time monitoring do not exist. Edge-Kite is designed for this use case but has no implementation." A family built on non-existent primitives is aspirational taxonomy, not architecture. You cannot test whether the family boundary is right until the primitives it wraps actually exist.

2. **The monitoring pattern is a *composition pattern*, not a *capability pattern*.** Every other family in the Big 5 provides a capability that the app cannot build on its own (ASR, TTS, OCR, rule evaluation, document indexing). Monitoring composes those capabilities into a loop. The loop logic (threshold → detect → prioritize → notify) is client-owned workflow, even if the pattern recurs. The server should provide the primitives (scan, health, stats); the client should own the loop.

**Compromise worth considering:** Flag monitoring as a "candidate family" that becomes real when two conditions are met: (a) event streaming primitives exist on the node, and (b) 2+ clients actually implement monitoring loops that would benefit from shared server-side logic. Until then, it stays a documented pattern, not a plugin pack.

**Open question to preserve:** What is the minimum server-side primitive that would make monitoring a real family rather than a client composition? DeepSeek suggests "scheduled scanning, streaming event ingestion, webhook notifications." If iHN adds those, the calculus changes.

---

## Tension 2: Should Planning/recommendation be dropped as a family?

**Position: Yes, drop it.**

6/9 already favor dropping. I agree with the majority: planning is chat + structured output + domain rules, composed client-side. No server-side adapter family is needed.

After reading Grok and Codex (the holdouts for keeping it), their arguments are the weakest part of their responses. Grok lists it as a family but then says "core substrate (chat + summarize + structured output) + installable plugin for domain planning loops" — which is just describing chat with a prompt template, not a family. Codex similarly lists "plan generation, option ranking, next-best-action support" but these are all achievable via `/v1/chat` with structured output and `/v1/rules/evaluate`.

**New insight from reading others:** Qwen's observation that the seed's families are "need categories, not contract shapes" is directly relevant here. "Planning" is a need category. The contract shape for planning is "chat with structured output constraints" — which is already Family 1 (chat) plus a structured-output mode. That is not a new family.

**Open question to preserve:** If a future client (e.g., WhoWhe2Wha) needs structured planning output schemas that multiple apps reuse, does that justify a thin "plan template" plugin? I'd say no — it justifies a shared prompt library in client code, not a server-side family. But the threshold question is worth preserving.

---

## Tension 3: Should Data/external connectors be the 7th family?

**Position: Yes — but renamed and scoped carefully.**

DeepSeek is right that 6 portfolio products need external data connectors. In my Round 1, I had "Persistence and storage adapters" as Family 6. After reading DeepSeek's concrete examples (USPTO API, court databases, threat feeds, medical coding databases, auction APIs), I think the external-connector concern is distinct from persistence/storage and deserves its own slot.

However, I would **not** call it "Data and external connectors." That name invites scope creep (everything is data; every API is a connector). I would call it **"External ingestion bridges"** and scope it tightly:

- What it does: authenticate against and query external APIs, normalize responses into iHN-compatible document formats, and feed results into the document pipeline for RAG
- What it does NOT do: replace client-side SDK calls for user-facing features, manage arbitrary data pipelines, or become a general ETL framework

The key architectural insight: external connectors feed the *document pipeline*, not the app directly. A USPTO connector does not return patent data to iLegalFlow's UI; it ingests patent data into `/v1/docs/*` so the rules engine and RAG query can reason over it. The connector is an ingestion adapter, not a query proxy.

**Classification:** Installable plugin space. Each connector is a thin bridge that authenticates, fetches, normalizes, and ingests.

**Why this is different from persistence:** Persistence is about storing and retrieving app-owned data (learner profiles, case files, practice logs). External ingestion is about pulling third-party data into iHN's knowledge base. They serve different needs, have different trust models, and have different failure modes. Conflating them produces a "data" dumping ground.

**Open question to preserve:** Where do connector credentials live? DeepSeek raised this and it remains unresolved. If the USPTO API key lives on the iHN node, it's a server-side plugin with shared credentials. If it lives in the client app, the client must authenticate and route through iHN. The answer depends on the specific connector's terms of service and the user's privacy preferences. This should be decided per-connector, not as a blanket rule.

---

## Tension 4: Provider adapters — iHN-only or multi-provider client?

**Position: Model A is the primary architecture. Model B is a future option, not a design target for the first implementation.**

In Round 1 I was firmly in Model A. After reading Gemini's privacy argument and DeepSeek's nuanced "design for both, start with A," I still hold Model A as primary, but I accept DeepSeek's point that the port interface should not preclude Model B.

Gemini's argument is the strongest one: allowing client apps to directly contact OpenAI breaks the privacy and auditability promises of iHN. This is not hypothetical — iMedisys (HIPAA), iLegalFlow (attorney-client privilege), and ScamHunters (investigation evidence) all have data that must not leave the local trust boundary without explicit user consent and audit logging. If the client can bypass iHN, those guarantees are unenforceable.

DeepSeek's counter — that both models serve different use cases — is correct but the priority is clear: the portfolio's primary value proposition is local-first privacy. Model B serves availability; Model A serves trust. Trust is the harder promise to keep and the more distinctive one.

**Practical recommendation:**
- Design the `CapabilityPort` interface so that `IhnProviderAdapter` and `OpenAIProviderAdapter` implement the same interface
- Ship only `IhnProviderAdapter` in the first implementation
- If a future client needs cloud fallback, the node should provide it (node-to-cloud proxy), not the client (client-to-cloud direct)
- The policy/orchestration layer in the client decides *which capabilities* to invoke; it does not decide *where to route them*. Routing is the node's job.

**Open question to preserve:** Should iHN ever implement a server-side cloud proxy? If a user explicitly consents to "use OpenAI for creative writing but keep medical data local," should the node make that OpenAI call on the user's behalf (logging, auditing, caching), or should the client make it directly (faster, less infrastructure, but no audit trail)? This is a product decision, not an architecture decision, and it should stay open.

---

## Tension 5: Should "1 family = 1 plugin_id" be the mapping rule?

**Position: Accept, with one modification.**

I proposed this in Round 1. After reading all responses, I still think it's the cleanest mapping. It makes the relationship between conceptual families and the `/v1/plugins/{plugin_id}/...` namespace explicit, discoverable, and machine-checkable. A client can query `/capabilities` and know exactly which family a plugin belongs to.

The one modification: **a family may span both core primitives and a plugin pack.** For example, "Document Pipeline" has core primitives (`/v1/docs/*`) and plugin content (domain-specific schemas). The family identity is the same, but the implementation spans core + plugin. The mapping rule should be: "1 family = 1 conceptual unit = 0 or 1 plugin_ids." Families that are entirely core (like Speech) have no plugin_id. Families that are mixed (like Rules) have a plugin_id for their plugin component.

This avoids the confusion Kimi raised about monorepo vs. distributed packages. The family is a *conceptual boundary*; the plugin pack is its *installable manifestation*. They do not need to live in the same directory or repo. The manifest simply declares which family a plugin belongs to.

**Modified rule:**
- Each adapter family has a canonical name (e.g., `lang`, `medical`, `legal`, `dialogue`)
- A family may have zero or one plugin packs that carry its plugin-side content
- The plugin pack's `plugin_id` matches the family name: `/v1/plugins/lang/...`, `/v1/plugins/medical/...`
- Core primitives that serve the family do not use the plugin namespace; they live in `/v1/*` as Tier 1 routes

**Open question to preserve:** Should the capability registry in `/capabilities` use the family name as the grouping key for plugin capabilities? I think yes, but this is a schema decision that should be validated when the plugin registration mechanism is built.

---

## Tension 6: When should client-mirror discussions start?

**Position: Sequential, but with a tighter cycle than DeepSeek proposes.**

In Round 1 I said "mirror into PronunCo first, then iMedisys." After reading DeepSeek's argument about the implementation gap — no client has a capability port layer, no plugin registration exists — I'm persuaded that starting mirrors before a reference exists risks each client designing its own port abstractions.

But I also find Kimi's counter compelling: waiting for "stability" can produce a draft that is elegant but unimplementable. The resolution is not "wait" or "now" — it is **sequence tightly.**

Proposed sequence:

1. **Complete this Round 2 synthesis** (current sprint)
2. **One focused coding sprint**: plugin registration + capability advertisement tiering + speech domain extraction. This produces the first installable adapter family and the mechanism to register it. (~1 week)
3. **Prototype one capability port in the Command Center frontend**: `ChatPort` + `IhnChatAdapter`. This is the working reference that DeepSeek correctly argues is missing. (~2-3 days within the same sprint)
4. **Then mirror into PronunCo**: with a working port example + working plugin registration + working speech extraction, the PronunCo team can design against reality, not diagrams.
5. **Then mirror into iMedisys or iLegalFlow**: second client, different family mix.

The total time from "this discussion" to "first client mirror" is 1-2 weeks, not the 3-4 weeks DeepSeek proposed. The key is bundling the coding sprint tightly rather than treating each foundation as a separate sprint.

**Open question to preserve:** Should the Command Center's capability port prototype be considered "the reference" or "a throwaway spike"? If it's the reference, it constrains all future client ports. If it's a spike, it's less risky but also less valuable. I lean toward "reference with the expectation that it will be revised once" — the first client mirror will change it.

---

## Tension 7: Is policy/orchestration a separate layer or part of app core?

**Position: Modified — it should be a separate concern but not a separate layer in the call stack.**

7/9 say separate layer. I still think the "weird indirection" problem is real for mobile clients. But after reading Kimi's capability router diagram and Qwen's detailed policy breakdown, I see that the policy concern is genuinely distinct from the app core's domain logic.

The resolution: **policy/orchestration is a separate *module*, not a separate *layer in the call stack*.**

What I mean: the app core calls `ChatPort.sendMessage()`. It does not call `PolicyRouter.route(chatRequest)` first and then call the port. The policy logic is injected *into* the port implementation, not *between* the app core and the port. The port implementation internally decides which provider to use based on injected policy configuration.

```
App Core → ChatPort.sendMessage(text)
                │
                │ (port implementation internally applies policy)
                │
                ├── if privacy=sensitive → IhnChatAdapter
                └── if privacy=creative  → CloudChatAdapter
```

This avoids the indirection problem (app core still calls one method on one port) while keeping the policy concern cleanly separated (the policy is a configuration object injected into the port, not interleaved with domain logic).

For mobile clients, this means the port is a thin class that holds a reference to a policy config and delegates to the appropriate adapter. No extra layer in the call stack. For web clients with more complex routing, the same port implementation can hold a more sophisticated policy object.

**Why I changed from Round 1:** Kimi's argument that "without an explicit router, the fallback logic leaks into every capability port call site" convinced me that the policy concern needs a defined home. But I still reject the 5-layer call-stack model (core → policy → port → adapter) because it creates mobile-hostile indirection. The policy lives *inside* the port implementation, not *between* core and port.

**Open question to preserve:** How is policy configuration updated at runtime? If the user toggles "offline mode" or "privacy strict," does the port swap adapters immediately, or does it wait for the next request? This is an implementation detail that should not be decided architecturally now, but the port interface must support it.

---

## Summary of positions

| Tension | Position |
|---|---|
| 1. Monitoring/triage real family? | No — candidate family, not current family |
| 2. Drop Planning/recommendation? | Yes, drop it |
| 3. Data/connectors as 7th family? | Yes, scoped as "External ingestion bridges" |
| 4. Provider model? | Model A primary; Model B as future option; node proxies cloud |
| 5. 1 family = 1 plugin_id? | Accept with modification: families may span core + plugin |
| 6. Client mirror timing? | Sequential but tight: code first sprint + port prototype, then mirror |
| 7. Policy/orchestration? | Separate module inside port implementation, not separate call-stack layer |

## Revised adapter-family map (post-Round 2)

| # | Family | Core primitives | Plugin pack (plugin_id) | Status |
|---|---|---|---|---|
| 1 | Audio I/O | `/v1/transcribe-audio`, `/v1/synthesize-speech`, `/v1/voices` | `lang` (phonetic comparison, normalization) | Implementable now |
| 2 | Document Pipeline | `/v1/docs/*`, `/v1/summarize` | Domain-specific schemas per family | Implementable now |
| 3 | Vision & Extraction | `/v1/vision/*` | Domain templates registered via plugin | Implementable now |
| 4 | Rules Engine | `/v1/rules/evaluate` | `medical`, `legal`, `tax` (domain rule packs) | Implementable now |
| 5 | Dialogue Sessions | `/v1/dialogue/sessions` (proposed) | `dialogue` (scenario templates, persona configs) | Depends on dialogue primitive |
| 6 | External Ingestion | `/v1/docs/ingest` | `connectors` (USPTO, court feeds, threat feeds) | Needs connector framework |
| — | Monitoring/Triage | None (uses vision + chat + rules) | Candidate, not current | Deferred: primitives don't exist |

## Recommended next sprint

**"Plugin registration + speech extraction + ChatPort prototype"** — a combined sprint that produces:
1. Plugin registration mechanism + tiered capability advertisement
2. Speech domain extraction from `plugins/pronunco.py` to `domains/speech.py`
3. One capability port (`ChatPort` + `IhnChatAdapter`) in the Command Center frontend

This sprint bridges the gap between discussion and implementation. After it completes, client-mirror discussions can proceed with working reference code, not diagrams.
