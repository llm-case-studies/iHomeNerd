# Round 2 Synthesis — Adapter Families and Client Ports

**Synthesizer:** Gemini (orchestrator role)
**Date:** 2026-05-05
**Participants:** DeepSeek v4-pro, Kimi K2-6, Qwen, GLM 5.1, Grok 4.3, Codex, Gemini 3.1 Pro, MiniMax, Nemotron 3 Super Free
**Round:** 2 (critique and convergence — cross-reading enabled)

---

## Executive Summary

Round 2 produced decisive convergence on 5 of 7 tensions, meaningful
convergence on 1, and a narrow but clear split on 1. The panel is now
aligned enough to move from discussion to implementation.

**Key outcome:** The platform now has a concrete, defensible adapter
family list (5 settled + 1 narrow split), a clear provider model, a
sequencing plan, and a client architecture pattern — all grounded in
cross-reviewer critique.

---

## Tension 1: Is Monitoring/triage a real adapter family?

### Result: **Split 5/4 → remains unresolved, but reframed**

| Position | Round 1 | Round 2 | Movers |
|---|---|---|---|
| **Yes (narrow plugin)** | 5 | 4 | DeepSeek moved to "no" |
| **No (composition pattern)** | 4 | 5 | DeepSeek joined "no" camp |

**Round 2 "no" camp (5):** DeepSeek ⬇️, Kimi, Qwen, GLM, (DeepSeek)
**Round 2 "yes" camp (4):** Grok, Codex, Gemini ⬆️, MiniMax, Nemotron

> **DeepSeek changed sides** — the strongest move in Round 2. DeepSeek's
> test was decisive for their switch: "What would a monitoring adapter
> family contain that isn't already covered by existing core routes?"
> Answer: nothing.

> **Gemini changed sides** (to "yes") — arguing event loops should run
> on the node, not the client, to avoid bandwidth/battery waste from
> polling.

**Convergence despite the split:** Both camps now agree on:
- Monitoring is NOT a Tier 1 core concern
- If it exists, it's plugin-space only
- The real gap is **event streaming infrastructure** (WebSocket/SSE),
  not a monitoring-specific family
- Domain detection logic and alert UX stay app-owned

**Resolution (orchestrator recommendation):** **Defer as "candidate
family."** The split is genuinely unresolvable until the event streaming
primitive exists. GLM's compromise is the cleanest: monitoring becomes a
real family when (a) event streaming primitives exist on the node AND
(b) 2+ clients implement monitoring loops that would benefit from shared
server-side logic. Until then, it is a documented pattern, not a plugin
pack.

**Surviving question:** Does iHN need a streaming transport primitive
(WebSocket, SSE) for event delivery? This is a core infrastructure
question, not an adapter family question.

---

## Tension 2: Should Planning/recommendation be dropped?

### Result: **Decisive — 8/9 drop it** ✅

| Position | Round 1 | Round 2 |
|---|---|---|
| **Drop it** | 6 | 8 |
| **Keep it** | 3 | 1 (Nemotron only) |

**Codex changed sides** — dropped planning. Grok also dropped it.
Only **Nemotron** still advocates for a thin server-side planning family.

**Why 8/9 agree:** Planning fails every test:
- **Contract shape test (Qwen):** "Input: goal description → Output:
  plan" is just chat with structured output
- **Server-side structure test (DeepSeek):** Tax planning, lesson
  progression, and medical scheduling share zero server-side code
- **Promotion criteria test (Codex):** Planning is client-specific;
  it requires app vocabulary to be meaningful

**Decision: Planning/recommendation is DROPPED from the adapter family
list.** It survives as a client-side composition pattern. Clients may
implement a `PlanningPort` that composes chat + rules + structured
output, but no server-side family is needed.

---

## Tension 3: Should Data/external connectors be the 7th family?

### Result: **Split 5/4 — reframed into two distinct proposals**

| Position | Supporters |
|---|---|
| **Yes, server-side family** (as "External Ingestion Bridges") | GLM, Qwen, Codex, Gemini, Nemotron |
| **No, client-side pattern** | DeepSeek ⬇️, Kimi, Grok, MiniMax |

**DeepSeek reversed their own proposal** — moving connectors from
server-side family (their Round 1 idea) to client-side pattern, citing
credential ownership concerns.

**The productive reframing (GLM + Qwen):**
External connectors are not query proxies for the client. They are
**ingestion adapters that feed the document pipeline.** A USPTO connector
doesn't return patent data to iLegalFlow's UI — it ingests patent data
into `/v1/docs/*` so RAG and rules can reason over it.

This scoping resolves the credential tension:
- Connectors that use shared API keys (weather, news, USPTO) → server-side
- Connectors that require per-user OAuth (Google Drive, GitHub) → client-side
  authenticates, hands token to node for ingestion

**Two sub-positions within "yes":**

| Variant | Supporters | Scoping |
|---|---|---|
| **Ingestion bridges** (GLM/Qwen) | GLM, Qwen | Authenticate → fetch → normalize → ingest into docs pipeline |
| **Full connector family** (Codex/Nemotron) | Codex, Gemini, Nemotron | Also includes credential management, rate limiting, caching |

**Resolution (orchestrator recommendation):** **Accept as 6th family,
scoped as "External Ingestion Bridges."** GLM's tight scoping prevents
scope creep. Credential ownership is decided per-connector, not as a
blanket rule. The family lives in installable plugin space
(`/v1/plugins/ingest-{source}/`).

---

## Tension 4: Provider model — iHN-only or multi-provider?

### Result: **Decisive — 9/9 Model A as primary** ✅

| Position | Round 1 | Round 2 |
|---|---|---|
| **Model A primary** | 3 (strong) + 6 (lean) | 9/9 |
| **Model B as default** | 0 | 0 |

**Every reviewer now agrees:** Model A (iHN as sole provider) is the
primary architecture. Model B (client-side multi-provider) is an opt-in
extension with explicit user consent.

**Gemini's argument won the panel:** "Allowing client apps to directly
contact OpenAI breaks the privacy and auditability promises of the iHN
platform."

**The refinement (DeepSeek + Kimi + Codex):**
- Port interfaces remain provider-agnostic (support both models)
- Default shipping config: `IhnProviderAdapter` only
- Cloud fallback should be **node-orchestrated** (node-to-cloud proxy)
  rather than client-to-cloud direct
- Cloud adapters require explicit user opt-in and visible UI indication
- The node is the trust boundary, even when cloud is used

**Decision: Model A is the architecture. Model B is an opt-in exception
requiring explicit user consent, audit logging, and UI disclosure.**

---

## Tension 5: "1 family = 1 plugin_id" mapping rule?

### Result: **Modified — 8/9 accept the principle, modify the rule** ✅

| Position | Supporters |
|---|---|
| **Accept strict 1:1** | Gemini, Nemotron |
| **Accept principle, modify rule** | DeepSeek, Kimi, Qwen, GLM ⬇️, Grok, Codex, MiniMax |

**Even GLM (the original proposer) modified the rule** to allow families
spanning core + plugin.

**Converged modified rule:**

```
Core-only families (e.g., Speech/Audio I/O):
  → No plugin_id. Live at Tier 1 /v1/... routes.
  → Family = domain router (e.g., domains/speech.py)

Plugin-only families (e.g., Language adapters):
  → 1 family = 1 plugin_id. /v1/plugins/lang/...
  → GLM's original rule applies perfectly.

Mixed families (e.g., Rules, Vision, Documents, Dialogue):
  → Core engine at /v1/{family}/*
  → Domain packs at /v1/plugins/{family}-{domain}/
  → Multiple plugin_ids per family allowed
  → Plugin_id MUST contain the family name for visibility
```

**Codex's manifest addition (adopted by Kimi, Qwen, MiniMax):**
- Every plugin declares a primary `family_id` in its manifest
- Plugins may declare secondary family dependencies
- `/capabilities` exposes core capabilities, plugin capabilities, and
  family tags
- Route ownership remains `/v1/plugins/{plugin_id}/...`

**Decision: Accept modified rule. Families map to namespaces via manifest
declarations, not rigid 1:1 plugin_ids. Plugin_ids must contain the
family name.**

---

## Tension 6: When should client-mirror discussions start?

### Result: **Decisive — 8/9 sequential** ✅

| Position | Round 1 | Round 2 | Movers |
|---|---|---|---|
| **Sequential** | 4 | 8 | Kimi ⬇️, Grok ⬇️, Gemini ⬇️, GLM ⬇️ |
| **Parallel** | 5 | 1 (Codex only*) |

*Codex says "parallel discussions, sequential implementation" — which is
effectively sequential with spec-level mirrors.*

**The swing argument (DeepSeek):** "No client currently has a capability
port layer. No plugin registration exists. The gap is 3-4 layers deep."

**4 reviewers changed their position** from parallel to sequential:
- **Kimi** moved after DeepSeek's implementation gap analysis
- **Grok** moved after the same analysis
- **Gemini** moved after the same analysis
- **GLM** moved from "PronunCo first" to "tight sequence"

**Converged sequence (GLM + Kimi + Qwen + DeepSeek):**

```
1. Complete Round 2 synthesis                          (now)
2. One focused coding sprint:                          (~1 week)
   • Plugin registration mechanism
   • Capability advertisement tiering
   • Speech domain extraction (in progress on CoD branch)
   • One capability port prototype: ChatPort + IhnChatAdapter
     in the Command Center frontend
3. PronunCo mirror discussion                          (week 2)
   • Receives working reference, not diagrams
   • Produces: capability mapping, gap list, thickness check
   • Does NOT design its own port model
4. Second mirror: iLegalFlow or iMedisys               (week 2-3)
   • Different family mix, same exercise
5. Cross-client synthesis                              (week 3)
   • Compare mirror results → divergences are signals
   • First client coding sprint
```

**Decision: Sequential. Code first, mirror second. Total time to first
mirror: ~1-2 weeks, not 3-4.**

---

## Tension 7: Policy/orchestration — separate layer or app core?

### Result: **Strong convergence — 9/9 agree on substance** ✅

| Position | Round 1 | Round 2 |
|---|---|---|
| **Separate layer** | 7 | 7 (+ 2 modified) |
| **Collapse into app core** | 2 | 0 |

**Both GLM and Qwen changed their positions** — accepting policy as a
separate concern, but with a critical refinement.

**The refined model (GLM + Qwen, adopted by DeepSeek + Kimi):**

Policy is **architecturally separate** but **physically injected into
the port implementation**, not interposed as a separate call-stack layer:

```
App Core → ChatPort.sendMessage(text)
                │
                │ (port internally applies injected policy)
                │
                ├── if privacy=sensitive → IhnChatAdapter
                └── if privacy=creative  → CloudChatAdapter (opt-in)
```

This resolves GLM's "weird indirection" concern without collapsing the
separation:
- App core calls one method on one port (no extra layers)
- Policy is a config/routing object injected into the port
- Single-provider clients: policy is a thin config object
- Multi-provider clients: policy is a routing class
- Both implement the same `PolicyConfig` interface

**Decision: Policy is a separate module, injected into port
implementations. It is NOT a separate layer in the call stack between
app core and port.**

---

## Settled Adapter Family List (Post-Round 2)

### The Big 5 (consensus 8-9/9)

| # | Family | Contract Shape | Home | Status |
|---|---|---|---|---|
| 1 | **Audio I/O** | Stateless audio ↔ text; voice metadata | Core Tier 1 (`domains/speech.py`) | Implementable now |
| 2 | **Document Pipeline** | Collection-scoped ingest, RAG query, structured extraction | Core engine + plugin domain packs | Implementable now |
| 3 | **Vision & Extraction** | Stateless image → structured data via templates | Core engine + plugin templates | Implementable now |
| 4 | **Rules & Evaluation** | Stateless domain-scoped deterministic evaluation | Core evaluator + plugin rule packs | Implementable now |
| 5 | **Dialogue & Sessions** | Stateful session-scoped turn management, context trimming | Core primitive + plugin scenarios | Depends on dialogue primitive |

### The 6th Family (5/4 — accepted with tight scoping)

| # | Family | Contract Shape | Home | Status |
|---|---|---|---|---|
| 6 | **External Ingestion Bridges** | Authenticate → fetch → normalize → ingest into doc pipeline | Plugin only (`/v1/plugins/ingest-{source}/`) | Needs connector framework |

### Candidate Family (deferred — 4/5 split)

| # | Family | Contract Shape | Home | Status |
|---|---|---|---|---|
| — | **Event Triage** (monitoring) | Event subscription → detect → prioritize → route | Plugin only (candidate) | Deferred: primitives don't exist |

### Dropped (decisive majorities)

| Item | Why dropped | Round 2 vote |
|---|---|---|
| Planning/recommendation | Chat + structured output + domain rules | 8/9 drop |
| Simulation/roleplay | Absorbed into Dialogue + app personas | 7/9 drop (R1) |
| Coaching/evaluation | App-owned workflow using Rules packs | 7/9 drop (R1) |
| Language-learning | PronunCo-specific; not a family | 7/9 drop (R1) |

---

## Client-Side Architecture (settled)

```
┌─────────────────────────────────────────────────────┐
│                    App Core                          │
│     (domain logic, product features, UI state)       │
├─────────────────────────────────────────────────────┤
│              Capability Ports                        │
│  SpeechPort │ DocumentPort │ VisionPort │ RulesPort  │
│  DialoguePort │ PluginDiscoveryPort                  │
├─────────────────────────────────────────────────────┤
│       Provider Adapters (with injected policy)       │
│  IhnSpeechAdapter │ IhnDocumentAdapter │ etc.        │
│  (default: iHN-only; opt-in: cloud fallback)         │
├─────────────────────────────────────────────────────┤
│            Storage / Search Adapters                 │
│  (client-side persistence, cache, external SDKs)     │
└─────────────────────────────────────────────────────┘
```

**Policy** is injected into provider adapters, not interposed as a
separate layer. App core calls `port.method()` — the port internally
routes based on policy config.

---

## Namespace Mapping (settled)

```
/v1/transcribe-audio          ← Audio I/O (core)
/v1/synthesize-speech          ← Audio I/O (core)
/v1/voices                     ← Audio I/O (core)
/v1/docs/*                     ← Document Pipeline (core)
/v1/vision/*                   ← Vision & Extraction (core)
/v1/rules/*                    ← Rules & Evaluation (core)
/v1/dialogue/*                 ← Dialogue & Sessions (core, proposed)

/v1/plugins/lang/*             ← Language adapters (plugin, speech family)
/v1/plugins/rules-medical/*    ← Medical rules (plugin, rules family)
/v1/plugins/rules-legal/*      ← Legal rules (plugin, rules family)
/v1/plugins/ingest-uspto/*     ← USPTO bridge (plugin, ingestion family)
/v1/plugins/ingest-courtfeed/* ← Court data (plugin, ingestion family)
```

Each plugin manifest declares `family_id` and secondary dependencies.
`/capabilities` exposes family tags alongside capability names.

---

## Position Changes Across Rounds (notable moves)

| Reviewer | Changed on | From → To |
|---|---|---|
| **DeepSeek** | T1 (Monitoring) | Yes → **No** |
| **DeepSeek** | T3 (Connectors) | Yes (own proposal) → **Client-side** |
| **Gemini** | T1 (Monitoring) | No → **Yes** |
| **Gemini** | T6 (Timing) | Parallel → **Sequential** |
| **Kimi** | T6 (Timing) | Parallel → **Sequential** |
| **Grok** | T2 (Planning) | Keep → **Drop** |
| **Grok** | T6 (Timing) | Parallel → **Sequential** |
| **Codex** | T2 (Planning) | Keep → **Drop** |
| **GLM** | T5 (Mapping) | Strict 1:1 → **Modified** |
| **GLM** | T7 (Policy) | Collapse → **Separate module** |
| **Qwen** | T6 (Timing) | Parallel → **Sequential** |
| **Qwen** | T7 (Policy) | Collapse → **Separate module** |

---

## Guiding Principles (extracted from cross-reviewer consensus)

1. **Contract shape, not cognitive work** (Qwen) — families describe
   what the adapter manages, not what the user thinks about
2. **Need categories outrank client names** (seed) — architecture
   units are capabilities, not apps
3. **iHN is the trust boundary** (Gemini) — client apps do not bypass
   the node; cloud fallback is node-orchestrated
4. **Promotion criteria** (Codex) — promote to core when client-neutral,
   useful without app vocabulary, demanded by 2+ clients
5. **Family ↔ namespace mapping must be explicit** (GLM) — manifest-based,
   machine-checkable
6. **Code before mirrors** (DeepSeek) — working reference beats diagrams

---

## Next Steps: The Coding Sprint

### Sprint: "Plugin Registration + Speech Extraction + ChatPort Prototype"

**Scope (converged across 7+ reviewers):**

1. **Plugin registration mechanism** — replace hardcoded imports in
   `main.py` with manifest-based discovery. Each plugin declares
   `plugin_id`, `family_id`, routes, and dependencies.

2. **Capability advertisement tiering** — `/capabilities` response
   exposes core capabilities, plugin capabilities, and family tags.
   Clients discover what's installed without knowing route names.

3. **Speech domain extraction** — in progress on CoD branch
   (`feature/uniform-web-ui/speech-extraction-plugin-namespace`).
   Complete extraction of ASR/TTS/voices to `domains/speech.py` with
   `/v1/plugins/lang/...` namespace for PronunCo-specific adapters.

4. **One capability port prototype** — `ChatPort` + `IhnChatAdapter`
   in the Command Center web frontend. Proves the pattern is
   implementable. Creates the working reference for client mirrors.

**Timeline:** ~1 week for items 1-4 in parallel.

**Then:** PronunCo mirror discussion (week 2), second mirror (week 2-3),
cross-client synthesis (week 3).

---

## Open Questions Surviving into Coding Sprints

1. **Event streaming primitive** — does iHN need WebSocket/SSE for event
   delivery? (Prerequisite for monitoring candidate family)

2. **Connector credential ownership** — per-connector decision: shared
   API keys → server-side; per-user OAuth → client authenticates, hands
   token to node

3. **Plugin versioning** — independent versioning (`rules-medical@v2.1`)
   or bundled with iHN releases?

4. **Dialogue primitive thickness** — does `/v1/dialogue/sessions` become
   core? If not, Family 5 collapses into app-owned orchestration.

5. **Command Center exemption** — is the Command Center subject to the
   full port/adapter model? (If exempt, no first-party validation exists)

6. **Shared policy patterns** — any reusable policy patterns worth
   extracting? ("privacy-first: always prefer local",
   "offline-aware: cache and retry")

---

*End of Round 2 synthesis. This concludes the Adapter Families and Client
Ports discussion sprint (2 rounds, 9 reviewers, 18 responses). The next
action is the coding sprint described above.*
