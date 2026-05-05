# Round 1 Synthesis — Adapter Families and Client Ports

**Synthesizer:** Gemini (orchestrator role)
**Date:** 2026-05-05
**Participants:** DeepSeek v4-pro, Kimi K2-6, Qwen, GLM 5.1, Grok 4.3, Codex, Gemini 3.1 Pro, MiniMax, Nemotron 3 Super Free
**Round:** 1 (9 independent responses)

---

## Executive Summary

The seed's corrective framing — **need categories should outrank client names**
— received unanimous endorsement from all 9 reviewers. The client-side
ports-and-adapters (hexagonal) pattern was also universally accepted.

However, the panel diverged on several important questions:
- How many adapter families? (5 to 7)
- Which families are real vs. disguised client workflows?
- Where does the policy/orchestration layer live?
- Should client-side provider adapters bypass iHN?
- When should client-mirror discussions start?

---

## Areas of Consensus (7+/9 agreement)

### 1. "Need categories outrank client names" — Unanimous (9/9)

Every reviewer endorsed the shift from organizing around named apps (PronunCo,
iMedisys) to organizing around recurring capability shapes. Client apps are
pressure tests and discovery tools, not architecture units.

### 2. Core adapter families — Strong consensus on the "big 5"

All 9 reviewers independently proposed families that converge on 5 clearly
shared families:

| # | Family | Core / Plugin | Agreement |
|---|---|---|---|
| 1 | **Speech & Audio I/O** (ASR, TTS, voices) | Core (Tier 1) | 9/9 |
| 2 | **Document & Knowledge** (docs, RAG, summarize, ingest) | Core engine + plugin domain packs | 9/9 |
| 3 | **Vision & Structured Extraction** (OCR, templates) | Core engine + plugin templates | 9/9 |
| 4 | **Rules & Evaluation Engine** (evaluate, domain rule packs) | Core engine + plugin packs | 9/9 |
| 5 | **Dialogue & Session Management** (sessions, turns, context) | Core primitive + plugin scenarios | 8/9 |

### 3. Client-side architecture — Hexagonal pattern accepted (9/9)

All 9 reviewers accepted the ports-and-adapters model with minor variations:

```
App Core → Capability Ports → Provider Adapters → Storage/Search Adapters
```

The 5-layer model (app core / ports / providers / storage / policy) was
accepted by 7/9. GLM and Qwen argued for collapsing policy/orchestration into
the app core (4 layers instead of 5).

### 4. PronunCo as most risky canary (7/9)

Most reviewers flagged PronunCo as the client **most likely to mislead** the
architecture if treated as "normal." Its deep pedagogy and accumulated helper
routes can make app-owned logic look like platform capability.

- **PronunCo = migration canary**, not template for new clients
- 5/9 preferred **TelPro-Bro** over PronunCo as the speech pressure test
  (cleaner test of pure speech primitives without pedagogical baggage)

### 5. Docs/rules pressure test — iLegalFlow or iMedisys (9/9)

Split roughly 5/4:
- **iLegalFlow** (5/9): Codex, Kimi, Grok, Gemini, Nemotron — more
  structurally complex, multi-jurisdiction
- **iMedisys** (4/9): DeepSeek, Qwen, GLM, MiniMax — crosses 3 families
  simultaneously (docs/rules, vision, evaluation)

Both are valid. iLegalFlow tests depth; iMedisys tests breadth.

---

## Productive Tensions (requiring Round 2 resolution)

### Tension 1: Monitoring/triage — real family or not? (Split 5/4)

| Position | Supporters |
|---|---|
| **Yes, real family** | Grok, Codex, MiniMax, Nemotron, DeepSeek |
| **No, it's app-level orchestration of existing primitives** | Kimi, Qwen, GLM, Gemini |

"No" camp argument: What On-My-Watch and Edge-Kite actually consume is
perception (vision) + summarization (chat) + alert routing. A monitoring-specific
family would create parallel routes that duplicate vision + docs + chat.

"Yes" camp argument: The structural pattern (watch → detect → prioritize →
route) is shared across clients, even if the domain logic differs.

### Tension 2: Planning/recommendation — real family or not? (Split 3/6)

| Position | Supporters |
|---|---|
| **Yes, include it** | Grok, Codex, Nemotron |
| **No, it's chat + structured output + domain rules** | DeepSeek, Kimi, Qwen, GLM, Gemini, MiniMax |

Strong majority says planning is a **client-side composition pattern**, not a
server-side adapter family. Tax planning, lesson progression, and medical
appointment planning share almost no server-side structure.

### Tension 3: Data/external connectors — missing 7th family? (Split 2/7)

DeepSeek proposed a **Data & External Connectors** family (database bridges,
external APIs, feed ingestion). Only DeepSeek made this a full family proposal.
Codex acknowledged persistence/search as a cross-cutting substrate but didn't
elevate it to a family.

Most reviewers treated connectors as either:
- Client-side adapter concern (the client calls external APIs)
- Or persistence/storage substrate (not a capability family)

**Worth preserving:** 6 portfolio products need external data connectors
(DeepSeek's argument). Without a connector pattern, each client builds its own.

### Tension 4: Provider adapters — server-side or client-side? (Split)

| Model | Position | Supporters |
|---|---|---|
| **Model A: iHN as sole provider** | Client only talks to iHN; node does backend switching | Gemini (strongest), GLM, MiniMax |
| **Model B: Client-side multi-provider** | Client can call iHN, Azure, OpenAI directly | Seed proposal |
| **Both, sequenced** | Start with Model A, add Model B later as optional | DeepSeek, Kimi, Qwen, Grok, Codex |

Gemini's strongest dissent: allowing client apps to directly contact OpenAI
**breaks the privacy and auditability promises** of the iHN platform. Cloud
fallback should be an iHN node capability, not a client app capability.

DeepSeek's nuance: Both models are valid for different use cases. Design the
port interface so both models implement the same ports. But start with Model A.

### Tension 5: Policy/orchestration — separate layer or part of app core?

| Position | Supporters |
|---|---|
| **Separate 5th layer** | Grok, Codex, DeepSeek, MiniMax, Nemotron, Kimi |
| **Collapse into app core (4 layers)** | GLM, Qwen |
| **Mostly client-side, app-specific** | All agree on this |

GLM's argument: separating policy creates "weird indirection" — app core
delegates to orchestration layer that delegates to ports that delegate to
adapters. Too many layers for a mobile client.

All 9 agree: **policy belongs in the client, not on the node.**

### Tension 6: When to start client-mirror discussions?

| Position | Supporters |
|---|---|
| **After cross-client draft stabilizes** | Codex, MiniMax, Nemotron, DeepSeek |
| **In parallel with this round** | Kimi, Qwen, GLM, Grok, Gemini |

DeepSeek's strongest argument for "wait": The current codebase has NO capability
port layer in any client. Mirroring now means client teams design against their
own app needs, producing non-reusable ports. Better to prototype in the Command
Center first, then mirror with a working reference.

Kimi's counter: Waiting for "stability" before mirroring risks producing a
draft that is elegant but unimplementable. Start PronunCo mirror in parallel.

### Tension 7: Adapter families ↔ plugin namespace mapping

GLM proposed the clearest mapping: **one adapter family = one plugin pack =
one plugin_id in the namespace.** So `/v1/plugins/lang/compare-pinyin` belongs
to the `lang` adapter family.

Others left this mapping implicit. This is architecturally important because
it determines whether families are just taxonomy or actual code organization.

---

## Notable Individual Insights

### DeepSeek: The implementation gap is 3-4 layers deep

Current codebase reality:
- No client has a capability port layer (Web, iOS, Android all call raw routes)
- No plugin registration system (hardcoded imports in `main.py`)
- Only two providers (Ollama, MLX) with a server-side if/else

Dependency chain for implementation:
```
Plugin registration → Capability advertisement (tiered) → Client capability ports → Policy routing → Provider adapters
```

### Kimi: Family-to-client mapping matrix

Kimi built a concrete matrix showing which clients use which families. This
validates that Families 1-5 have strong cross-client justification. Family 6
(monitoring) supports only 2+ clients.

### GLM: Adapter family = plugin pack = plugin_id

The cleanest mapping proposal. Makes the relationship between conceptual
families and the `/v1/plugins/{plugin_id}/...` namespace explicit and
machine-checkable.

### Qwen: Families should describe contract shapes, not cognitive work

"Speech" is a brain-demand cluster. "Audio I/O with model routing and voice
selection" is an adapter family. The distinction determines what the adapter
actually manages. Proposed renaming families by contract shape.

### Codex: Promotion criteria should be explicit

Promote to core only when the contract is:
- Client-neutral
- Useful without app vocabulary
- Demanded by 2+ clients or clearly a platform primitive

### Gemini: Client apps should NOT bypass iHN

The iHN node should be the privacy boundary, proxy, and audit log. Cloud
fallback should be orchestrated by the node, not the client.

---

## Rejected / Deferred Items (consensus to exclude)

| Item | Why excluded | Supporters for exclusion |
|---|---|---|
| Simulation/roleplay as standalone family | Absorbed into Dialogue family + app-owned persona/scoring | 7/9 |
| Coaching/evaluation as standalone family | Pattern is shared but content is fully domain-specific | Kimi, GLM |
| Language-learning as standalone family | Domain-specific; PronunCo overfit in new guise | Kimi, GLM |
| ACTCLI adapter routes | Unclear scope; don't build routes for it | Prior sprint |

---

## Summary: What Round 2 Should Resolve

1. **Monitoring/triage: real family or not?** (5/4 split)
2. **Planning/recommendation: drop it?** (6/3 favor dropping)
3. **Data/connectors: add as 7th family or not?** (DeepSeek-only proposal)
4. **Provider model: iHN-only or multi-provider client?** (All lean Model A
   first, but strength of commitment varies)
5. **Adapter family ↔ plugin namespace mapping:** Accept GLM's
   "1 family = 1 plugin_id" rule?
6. **Client mirror timing:** After this round or in parallel?
7. **Policy/orchestration:** Separate layer or folded into app core?

---

## Working Consensus: The "Big 5" Adapter Families

```
┌─────────────────────────────────────────────────────────────────┐
│ Family 5: Dialogue & Sessions (core primitive + plugin scenarios)│
│ Neutral turn management, context trimming, token accounting     │
├─────────────────────────────────────────────────────────────────┤
│ Family 4: Rules Engine (core evaluator + plugin domain packs)   │
│ Generic rule evaluation, domain listing, scoring contract       │
├─────────────────────────────────────────────────────────────────┤
│ Family 3: Vision & Extraction (core engine + plugin templates)  │
│ OCR, template extraction, image analysis                        │
├─────────────────────────────────────────────────────────────────┤
│ Family 2: Documents & Knowledge (core pipeline + plugin schemas)│
│ Ingest, RAG query, summarize, structured extraction             │
├─────────────────────────────────────────────────────────────────┤
│ Family 1: Speech & Audio I/O (core primitives)                  │
│ ASR, TTS, voices, audio format handling                         │
└─────────────────────────────────────────────────────────────────┘
```

Plus 2-3 candidates still in tension: Monitoring, Connectors, Persistence.
