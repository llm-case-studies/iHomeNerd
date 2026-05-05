# Round 2 Response: Adapter Families and Client Ports — Critique and Synthesis

**Reviewer:** kimi-k2-6  
**Date:** 2026-05-05  
**Round:** 2 (critique and synthesis)

---

## Context

This response synthesizes my Round 1 position with the full panel of 9 Round 1 responses (DeepSeek, Gemini, GLM, Grok, Codex, Qwen, MiniMax, Nemotron, and my own). I address the 7 specific tensions flagged by the orchestrator.

---

## Tension 1: Is Monitoring/triage a real adapter family?

**Round 1 split:** 5/4 (yes/no).  
**My Round 2 position: NO. Not a real adapter family.**

After reading the full panel, I am moving from my Round 1 uncertainty to a firm "no." The "yes" camp (Grok, Codex, MiniMax, Nemotron, DeepSeek) correctly identifies a shared structural pattern: watch → detect → prioritize → route. But where they locate that pattern is wrong.

**What the "yes" camp misses:** The structural pattern is client-side orchestration, not server-side reusable code. On-My-Watch and Edge-Kite consume the SAME core primitives (vision, chat, investigate, system stats) that every other client uses. What differs is how they compose those primitives into a monitoring loop — and that composition is app-owned, not adapter-reusable.

DeepSeek's own analysis undermines the "yes" position: "Family 4 (monitoring) is the least mature in the current codebase... core primitives it needs (event streaming, scheduled scans, webhook notifications) don't exist yet." If the family requires core primitives that don't exist, then the "family" is actually a request for new core infrastructure, not an adapter family.

**What IS real:**
- Core: `/v1/investigate/*`, `/system/stats`, `/health` — already exist
- Possible future core: event streaming primitive, scheduled scan trigger
- App-owned: triage logic, alert thresholds, notification routing, evidence chains
- Plugin space: domain-specific detection models (surveillance classifier, medical alert rules)

**What is NOT real:** A "monitoring adapter family" that sits between core and app. There is no shared server-side code that On-My-Watch and Edge-Kite would both call. They would each call core investigate + vision + chat differently.

**Recommendation:** Drop "Monitoring/triage" from the adapter family list. Replace with a note: "Monitoring clients are a deployment pattern + app orchestration, not an adapter family. Future work may add event-streaming core primitives."

**Open question to preserve:** Should iHN add event streaming / webhook primitives to core? If so, is that a new family or just infrastructure?

---

## Tension 2: Should Planning/recommendation be dropped as a family?

**Round 1 split:** 3/6 (yes/no, with strong majority for dropping).  
**My Round 2 position: YES. Drop it.**

My Round 1 already excluded planning. The panel consensus (6/3) confirms this. The case is overwhelming:

- Tax planning, medical appointment scheduling, lesson progression, and travel logistics share ZERO server-side structure. They all reduce to "chat + structured output + rules + app interpretation."
- DeepSeek correctly calls this the "most aspirational family" and says "no dedicated planning route exists in the codebase. Planning is achieved through `/v1/chat` with prompts."
- Qwen: "Planning is a composition of chat, docs, and rules. Adding a 'planning' family would be a category mistake — it would be a workflow, not an adapter."
- GLM: "Domain-specific planning is covered by docs/rules adapters + dialogue adapters. A planning family would become a 'misc' category."

The 3 who said "yes" (Grok, Codex, Nemotron) mostly framed it as "plugin, mostly client-side" — which means they don't actually believe it's a server-side family either. They just want a conceptual bucket.

**Recommendation:** Remove "Planning/recommendation" from the server-side adapter family list entirely. It is a client-side composition pattern. The cross-client draft should mention it as a "brain-demand cluster" that clients implement via core primitives, not as an adapter family.

**Open question to preserve:** When a client like WhoWhe2Wha or iMedisys needs structured plan output (appointment schedules, task sequences), should core provide a generic "structured output with JSON schema" helper, or is that already covered by chat with schema prompting?

---

## Tension 3: Should Data/external connectors be the 7th family?

**Round 1 split:** 2/7 (only DeepSeek proposed it as a full family).  
**My Round 2 position: The PROBLEM is real, but the SOLUTION belongs client-side, not in iHN.**

DeepSeek's diagnosis is correct: "Six portfolio products need external data connectors. Without a connector family, each client app implements its own API bridges, which creates the same fragmentation the initiative is trying to prevent."

But DeepSeek's prescription — a server-side iHN plugin family for connectors — is wrong for privacy and credential reasons:

- USPTO API keys, court database credentials, medical API tokens, and threat feed subscriptions are **per-user, per-app secrets**. They should NOT live on the iHN node, which is a shared household device.
- If iHN holds the credentials, any household member's app could potentially access another member's legal or medical data through the shared connector plugin.
- OAuth flows and API rate limits are user-specific, not household-specific.

**Where connectors DO belong:**
- **Client-side:** Each client app holds its own credentials and manages its own external connections. This preserves privacy boundaries.
- **Client-side library pattern:** A reusable connector SDK (not an iHN plugin) that standardizes authentication, query, transform, cache, and retry patterns across client apps. This solves DeepSeek's fragmentation problem without importing credentials into iHN.

**Where iHN CAN help:**
- `/v1/persistence/*` can cache external data locally after the client fetches it
- Core could provide a generic `/v1/connectors/proxy` or webhook endpoint for simple cases where the node SHOULD mediate (e.g.,统一 callback handling)

**Recommendation:** Do NOT add Data/external connectors as a server-side adapter family. Instead, add it as a **client-side architecture concern** — a standard connector SDK pattern that client repos can share. DeepSeek's fragmentation problem is real and important, but the solution belongs in client-side ports, not server-side plugins.

**Open question to preserve:** Are there ANY external connectors where the iHN node should hold credentials? (e.g., household-wide services like weather, news, or smart home APIs?)

---

## Tension 4: Provider adapters — iHN-only or multi-provider client?

**Round 1 split:** Gemini/GLM/MiniMax strongly favor Model A (iHN-only). DeepSeek/Kimi/Qwen/Grok/Codex say "both, sequenced."  
**My Round 2 position: Model A is PRIMARY; Model B capability is PRESERVED in port design but not default.**

Gemini's argument is the strongest in the panel: "If iHN is the central 'local AI platform,' the client app should not bypass iHN to talk directly to external clouds. The iHN node should be the privacy boundary, proxy, and audit log."

This is not just philosophy — it is product identity. If clients can phone home to OpenAI directly, iHN's "local-first, privacy-first" value proposition is undermined. The user bought a Home node to keep data local. Allowing the client to leak data to Azure because "it's cheaper" defeats the purpose.

**However:** The capability port interface should NOT hardcode iHN. It should be provider-agnostic so that Model B remains architecturally possible.

**Why preserve Model B capability:**
- Some use cases genuinely need cloud models (e.g., large-context legal analysis that won't fit on local hardware)
- Some clients may be used outside the Home (travel, field work)
- Testing and development need cloud fallbacks

**The right model:**
- **Default:** Client only talks to iHN. Node handles backend switching (Ollama ↔ MLX ↔ optional cloud fallback).
- **Opt-in:** Client capability ports can be backed by direct cloud providers, but this requires explicit user consent and privacy acknowledgment.
- **The node is the trust boundary:** Even when Model B is used, sensitive data should still route through iHN when possible.

DeepSeek's sequencing is correct: "Start with Model A because it's what exists and what the portfolio's privacy requirements demand."

**Recommendation:** Architecture should support both, but Model A is the default and product commitment. Model B is an advanced/opt-in pattern. The first port implementations should be iHN-only.

**Open question to preserve:** If the node adds cloud fallback internally (Model A with node-side cloud proxy), does that preserve privacy? The data still leaves the node, but the client doesn't know. Is that acceptable?

---

## Tension 5: Should "1 family = 1 plugin_id" be the mapping rule?

**Round 1:** GLM proposed this. Others left it implicit.  
**My Round 2 position: ACCEPT with modification — applies only to fully-plugin families. Mixed families map to "core routes + N plugin packs."**

GLM's rule is elegant: "One adapter family = one plugin pack = one plugin_id in the namespace. So `/v1/plugins/lang/compare-pinyin` belongs to the `lang` adapter family."

But it breaks down for mixed families where part is core and part is plugin:

- **Speech family:** Core has `/v1/transcribe-audio`, `/v1/synthesize-speech`. Plugin has `/v1/plugins/lang/compare-pinyin`. What is the "plugin_id" for speech? There isn't one — speech is split.
- **Rules family:** Core has `/v1/rules/evaluate`. Plugins have `/v1/plugins/rules-medical/...`, `/v1/plugins/rules-legal/...`. One family, multiple plugin_ids.
- **Document family:** Core has `/v1/docs/*`. Plugins have `/v1/plugins/tax-form-extract`, `/v1/plugins/medical-bill-extract`. Again, one family, many plugin_ids.

**Modified rule:**
```
If family is ENTIRELY plugin space:
    1 family = 1 plugin pack = 1 plugin_id
    (e.g., lang adapters → plugin_id: lang)

If family is MIXED (core + plugin):
    Family is a CONCEPT, not a plugin_id
    Core part: stable routes, no plugin_id
    Plugin parts: N plugin packs, each with its own plugin_id
    (e.g., rules family → core: /v1/rules/evaluate;
           plugins: rules-medical, rules-legal, rules-tax)

If family is ENTIRELY core:
    No plugin_id at all
    (e.g., speech primitives → domains/speech.py)
```

This preserves GLM's clarity for plugin-only families while acknowledging that many important families span both core and plugin space.

**Recommendation:** Adopt the modified rule. Update the adapter-family documentation to show which families are core-only, mixed, or plugin-only, and map each plugin pack to a concrete plugin_id.

**Open question to preserve:** Should plugin packs be versioned independently (e.g., `rules-medical@v2.1`) or bundled with iHN releases?

---

## Tension 6: When should client-mirror discussions start?

**Round 1 split:** 4/5 (wait/parallel).  
**My Round 2 position: SEQUENTIAL — but with a SHORT timeline. First prototype ONE port in Command Center, THEN parallel mirrors.**

I changed my position from Round 1. I originally said "start PronunCo mirror in parallel." After reading DeepSeek's implementation-gap analysis, I now agree with the "wait" camp.

DeepSeek's gap analysis is devastating and accurate:
- "No client (Web, iOS, Android) has a capability port layer — they all call raw iHN endpoints directly"
- "No plugin registration system exists — plugins are hardcoded imports in `main.py`"
- "The gap is 3-4 layers of abstraction"

If we mirror into PronunCo now, PronunCo will design ports against its own app needs without a working reference. The risk is real: "They'll design against their own app's needs, creating a `PronunCoPort` that is no more reusable than the current `pronunco.py` plugin." (DeepSeek)

**However:** Waiting for "full stability" is also wrong. Qwen and I correctly argued that drafts without client feedback risk being unimplementable.

**The right compromise:**
1. Complete Round 2 synthesis (now)
2. Prototype ONE capability port in the **Command Center** (the canonical first-party client in the iHN repo)
   - e.g., `ChatPort` + `IhnChatAdapter`
   - This proves the pattern is implementable
   - It creates a working reference without cross-repo coordination
3. Once the prototype works (days, not weeks), mirror into **PronunCo** and **iMedisys/iLegalFlow** in parallel
4. Compare mirror results — divergences are the most important signals

**Recommendation:** Sequential with short timeline. Command Center prototype first, then parallel client mirrors.

**Open question to preserve:** Should the Command Center adopt the full port/adapter model, or is it exempt because it's co-located with the server? If exempt, how do we validate the pattern without a first-party example?

---

## Tension 7: Is policy/orchestration a separate layer or part of app core?

**Round 1 split:** 7/2 (separate/collapse). GLM and Qwen said collapse into app core.  
**My Round 2 position: SEPARATE LAYER, but lightweight and app-specific.**

After reading GLM and Qwen carefully, I think the disagreement is mostly SEMANTIC, not architectural. Both sides agree on the substance:
- Policy is client-side, not node-side
- Policy is app-specific (iMedisys HIPAA rules differ from PronunCo cost limits)
- App core should not contain provider-selection logic

GLM says: "Policy decisions are made by the app core. If you separate them, you create weird indirection."  
Qwen says: "The node should provide primitives; the client should decide how to compose them."

The "separate layer" camp (Grok, Codex, DeepSeek, MiniMax, Nemotron, Kimi, Gemini) says: Policy should not be SCATTERED throughout app core. It should be isolated so it can change independently and be tested independently.

**The synthesis:** Policy IS a separate layer, but it is:
- **Lightweight:** A simple router/factory, not a workflow engine
- **App-specific:** Each client has its own policy layer
- **Client-side:** Never on the node
- **Thin:** "Which adapter for which call under what conditions"

For mobile clients (GLM's concern about "weird indirection"), the policy layer can be as simple as:
```typescript
// PronunCo policy
const speechProvider = iHNAvailable ? iHNSpeechAdapter : azureSpeechAdapter;
const chatProvider = privacyMode ? iHNChatAdapter : openAIChatAdapter;
```

This is not heavy indirection. It is a single configuration point that the app core reads from.

**Recommendation:** Keep policy as a separate layer in the client architecture model. Document it as "lightweight, app-specific routing logic." Address GLM's concern by explicitly stating it should NOT be a framework or engine.

**Open question to preserve:** If policy is app-specific, is there ANY shared policy pattern worth extracting into a client-side library? (e.g., "privacy-first: always prefer local" or "offline-aware: cache and retry")

---

## Summary: Refined Adapter Family List

Based on Round 2 resolutions:

| # | Family | Classification | Plugin_id(s) |
|---|---|---|---|
| 1 | **Audio I/O** (ASR, TTS, voices, audio format) | Core only | None |
| 2 | **Document Pipeline** (ingest, RAG, query, summarize) | Core only | None |
| 3 | **Vision / Structured Extraction** (OCR, templates, image analysis) | Core engine + plugin templates | `vision-tax`, `vision-medical`, etc. |
| 4 | **Rules Engine** (evaluate, domain registry, validation) | Core engine + plugin packs | `rules-medical`, `rules-legal`, `rules-tax` |
| 5 | **Dialogue Session Manager** (sessions, turns, context trimming) | Core primitive + plugin scenarios | `dialogue-pronunco`, `dialogue-legal` |
| 6 | **Plugin Adapter Framework** (registration, discovery, namespace) | Core meta-mechanism | None (enables others) |

### Dropped from Round 1 proposals:
- ~~Monitoring/triage~~ → deployment pattern + app orchestration
- ~~Planning/recommendation~~ → client-side composition pattern
- ~~Simulation/roleplay~~ → absorbed into Dialogue + app-owned scenarios
- ~~Data/external connectors~~ → client-side SDK pattern, not server-side family
- ~~Coaching/evaluation~~ → app-owned workflow using Evaluation adapter packs
- ~~Language-learning~~ → domain-specific, PronunCo-overfit

### New from Round 2:
- **Plugin Adapter Framework** (Qwen's Family 6) — the meta-family that makes the others installable. This was underweighted in Round 1 but is architecturally essential.

---

## Server-to-Client Mapping

How do server-side families map to client-side ports?

| Server Family | Client Port(s) | Notes |
|---|---|---|
| Audio I/O | `SpeechPort` (transcribe, synthesize, voices) | Direct 1:1 mapping |
| Document Pipeline | `DocumentPort` (ingest, query, summarize) | Direct 1:1 mapping |
| Vision / Extraction | `VisionPort` (extract, analyze, templates) | Direct 1:1 mapping |
| Rules Engine | `RulesPort` (evaluate, list domains) | May include rubric evaluation if rubric is loaded as plugin |
| Dialogue Session Manager | `DialoguePort` (create session, add turn, get history) | Scenario/persona config stays app-owned |
| Plugin Adapter Framework | `PluginDiscoveryPort` (list plugins, check capabilities, invoke plugin actions) | New port type needed for client plugin awareness |

---

## Recommended Next Moves

### Move 1: Command Center port prototype (Week 1)
- Implement ONE capability port in the web Command Center: `ChatPort`
- Implement `IhnChatAdapter` backed by `/v1/chat`
- Show that the Command Center's chat panel calls `ChatPort.sendMessage()` instead of `api.post('/v1/chat')`
- This is a small refactor that validates the pattern without cross-repo coordination

### Move 2: Plugin registration sprint (Week 1-2, parallel)
- Build the plugin registration mechanism (DeepSeek's recommendation from prior sprint)
- Replace hardcoded plugin imports in `main.py` with manifest-based discovery
- This is the foundation that makes "adapter families" installable rather than hardcoded

### Move 3: Parallel client mirrors (Week 2-3)
- Mirror discussion into PronunCo repo: map existing capabilities to ports
- Mirror discussion into iLegalFlow or iMedisys repo: same exercise
- Both mirrors have the Command Center prototype as a working reference

### Move 4: Cross-client synthesis (Week 3)
- Compare PronunCo and iLegalFlow mirror results
- Identify where port contracts diverge — divergences = most important design signals
- Cut first client-side coding sprint: implement shared `ChatPort` and `DocumentPort` contracts

---

## Contradictions Worth Preserving into Coding Sprints

1. **Connector credential ownership:** DeepSeek's fragmentation problem is real, but placing connectors server-side breaks privacy. The client-side SDK solution needs validation.

2. **Command Center exemption:** If the Command Center is exempt from port/adapter architecture (because it's co-located), we have no first-party validation. If it's not exempt, refactoring it is high-value but nontrivial.

3. **Plugin versioning:** Should plugin packs version independently or bundle with iHN? Independent versioning enables faster adapter evolution but increases matrix testing.

4. **Evaluation as a family vs. pattern:** GLM proposed "Evaluation and explanation adapters" as Family 5. I think it's a pattern, not a family. But if PronunCo, TelPro-Bro, and iMedisys all need scoring rubrics, a thin reusable rubric framework might be justified. This should be tested in the PronunCo mirror.

---

*End of Round 2 response. Formed by comparing all 9 Round 1 responses and the orchestrator synthesis. Positions updated from Round 1 where the evidence supports a cleaner decision.*
