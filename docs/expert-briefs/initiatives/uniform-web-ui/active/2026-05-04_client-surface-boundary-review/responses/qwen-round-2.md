# Round 2: Critique and Synthesis — Client Surface Boundary Review

## Reviewer

- Name / model: qwen
- Date: 2026-05-04
- Round: 2 (critique and synthesis)

## Goal

Compare the seven Round 1 responses, surface real disagreements, and move the initiative closer to a decision boundary.

---

## Decision summary

### Stable core iHN surface

Routes that every reviewer agreed belong in core:
- `/health`, `/discover`, `/capabilities`, `/sessions`, `/system/stats`, `/setup/*`
- `/v1/chat`, `/v1/translate`, `/v1/transcribe-audio`, `/v1/synthesize-speech`, `/v1/voices`, `/v1/models`

Additional core routes with strong support (5+ reviewers) but not in the seed's item list:
- `/v1/docs/*` — document ingestion and RAG
- `/v1/vision/*` — OCR and structured extraction
- `/v1/rules/evaluate` — deterministic rules engine
- `/v1/persistence/*` — generic app storage

### Adapter/plugin/helper surface

Unanimously not-core:
- `compare_pinyin`, `normalize_pinyin` — domain-specific phonetic helpers
- `extract_lesson_items` — PronunCo pedagogy (with one dissent: Kimi argues for a generic structured-extraction primitive)
- `generate_drill` — drill pedagogy; some say adapter, some say app-owned
- `explain_score` — score semantics are domain-specific; GLM's sharpest observation: this is N different explanation functions sharing a prompt pattern, not one route
- `chat_persona` — prompt engineering, not a core primitive

### App-owned surface

All reviewers agreed apps must own:
- Pedagogy, lesson flow, drill design
- Coaching loop design and score interpretation
- Domain rule packs and compliance logic
- Persona assignment, scenario design
- All UI orchestration and presentation choices

---

## Points of agreement

The convergence across seven independent reviewers is striking:

1. **Usefulness ≠ stable route status.** Every reviewer stated this independently. A helper that unblocked a spike does not earn a permanent top-level route.
2. **The PronunCo leakage is real and urgent.** ASR/TTS/voices defined inside `plugins/pronunco.py` is the clearest boundary violation. Five reviewers explicitly recommended extracting them into `domains/speech.py`.
3. **Plugin routes need namespacing.** Six of seven recommended `/v1/plugins/{plugin_id}/...` or equivalent. Only GLM proposed `/adapters/lang/...` — a different prefix but the same principle.
4. **The minimal core is ~12-16 route families.** All estimates converged on this range.
5. **RoadNerd and Edge-Kite are not ordinary clients.** Four reviewers explicitly reclassified them as deployment/node-role. Two more noted a missing "runtime participant" category.
6. **`/capabilities` needs tiering.** Five reviewers recommended splitting the response into core vs. plugin sections.
7. **Apps own pedagogy, coaching, scoring rubrics, and workflow UX.** Unanimous.

---

## Points of tension

### Tension 1: Core bounded-dialogue primitive — yes or no?

**Round 1 positions:**
- Yes: DeepSeek, Qwen (me), Codex (leaning)
- No: Gemini, GLM (leaning)
- Unsure: Grok, Kimi

**My Round 2 judgment:** Yes, but with a narrower scope than any Round 1 response proposed.

Here is a concrete route contract written without PronunCo vocabulary:

```
POST /v1/dialogue/sessions
  Body: { "model": "string", "system_instructions": "string", "max_turns": int?, "ttl_seconds": int? }
  Returns: { "session_id": "string", "created_at": "timestamp" }

GET /v1/dialogue/sessions/{id}
  Returns: { "session_id", "model", "turn_count", "created_at", "expires_at", "status" }

POST /v1/dialogue/sessions/{id}/turns
  Body: { "role": "user|assistant", "content": "string", "metadata": object? }
  Returns: { "turn_id": "string", "role": "assistant", "content": "string", "turn_number": int }

DELETE /v1/dialogue/sessions/{id}
  Returns: 204

GET /v1/dialogue/sessions/{id}/turns
  Returns: [{ "turn_id", "role", "content", "turn_number", "timestamp" }]
```

This contract contains zero app-specific vocabulary. No "scenario," no "rehearsal," no "lesson," no "persona." It provides only: session lifecycle, turn append, turn history, context window management (via `max_turns`), and session expiry.

**What stays in adapters:** scenario semantics, persona injection, scoring, retry policy, drill generation. The adapter constructs `system_instructions` and calls the core dialogue primitive underneath.

**Why this matters:** Without this primitive, every app reimplements session state machines, context window trimming, and turn history pagination. With it, the core surface provides the shared substrate and adapters layer their own semantics on top. The contract is thin enough to be unobjectionable and thick enough to eliminate real duplication.

**Counter-position I still preserve:** GLM and Gemini are right that `/v1/chat` with session IDs could cover 80% of this use case. If the dialogue primitive ends up being only marginally more useful than "chat with a session handle," it should be collapsed back into `/v1/chat`. The classification is reversible.

### Tension 2: Adapter/plugin — one layer or two sub-layers?

**Round 1 positions:**
- One layer with namespacing: DeepSeek, Qwen (me), Grok, Codex
- Two sub-layers (capability adapters vs. workflow plugins): GLM
- iHN-hosted plugins vs. client-side adapters: Gemini
- Generic plugin invocation contract: Kimi

**My Round 2 judgment:** GLM's distinction is sharp and correct, but it is **premature for the first coding sprint**. The two sub-layers are:

1. **Capability adapters** — stateless, deterministic, narrow transforms (pinyin normalization, tax-form class detection). These are pure functions: input → output.
2. **Workflow plugins** — stateful, opinionated, multi-step orchestrations (drill generation, coaching loop, scenario rehearsal). These chain multiple primitives.

The distinction matters for versioning, stability guarantees, and testing strategy. But introducing it now would slow down the highest-signal cleanup work. **Recommendation:** use a single `/v1/plugins/{plugin_id}/...` namespace for the first sprint. Add sub-layer semantics in a follow-on design sprint once the namespace convention is proven.

Kimi's generic plugin invocation route (`POST /v1/plugin/invoke`) is elegant but adds an indirection layer that makes debugging harder and URL-based discovery impossible. I recommend direct namespaced routes over a generic proxy.

Gemini's distinction between iHN-hosted plugins and client-side adapters is orthogonal and valid, but it is a deployment concern, not a route-boundary concern. It should be documented separately.

### Tension 3: Stability tiers — formalize now or defer?

**Round 1 positions:**
- Add explicit tiers: Qwen (me), Kimi, DeepSeek (secondary)
- Implicit tiers from setup server are enough: DeepSeek (secondary), Qwen (secondary)
- Too much bureaucracy: counter-position preserved in my Round 1 response

**My Round 2 judgment:** Formalize tiers as **documentation-only for now**, not as enforced runtime behavior. The four tiers I proposed are:

- **Tier 0 (bootstrap):** `/setup/*`, `/health`, `/discover`. Exists on the HTTP setup server. Never break.
- **Tier 1 (core contract):** `/v1/chat`, `/v1/translate`, `/v1/docs/*`, `/v1/vision/*`. Breaking changes require deprecation cycles.
- **Tier 2 (plugin namespace):** `/v1/plugins/{plugin_id}/*`. Plugins evolve independently. No cross-plugin stability guarantees.
- **Tier 3 (app-owned):** Everything above the API. No iHN guarantees.

These tiers should appear in:
1. The `/capabilities` response as metadata (optional field: `"tier": 1`)
2. Route documentation
3. The route inventory audit

They should **not** yet be enforced by middleware, CI/CD rules, or versioning machinery. That can come after the first coding sprint proves the boundary model works.

The setup server is already a natural Tier 0 litmus test. Any route that does not need to be on the setup server is, by definition, not Tier 0. This is a useful heuristic that requires no new code.

### Tension 4: Over-pruning risk — is "thin core" becoming "hollow product"?

**Round 1 positions:**
- Risk is real and underweighted: GLM (strongest), Qwen (me), DeepSeek
- Conservative pruning is correct bias: Codex, Gemini
- Resolve by testing against the Command Center: DeepSeek

**My Round 2 judgment:** Apply DeepSeek's heuristic concretely. Delete the PronunCo plugin. What does the web Command Center still need?

Surviving routes:
- `/health`, `/discover`, `/capabilities`, `/sessions`, `/system/stats`, `/setup/*` — node operations
- `/v1/chat` — the primary AI interaction
- `/v1/translate` — translation tool
- `/v1/transcribe-audio` — transcription tool
- `/v1/synthesize-speech`, `/v1/voices` — speech tools
- `/v1/docs/*` — document management
- `/v1/vision/*` — image analysis
- `/v1/rules/evaluate` — rules tool
- `/v1/models` — model browser
- `/v1/persistence/*` — generic storage
- `/v1/investigate/*` — environment discovery
- `/v1/control/*` — node control
- `/v1/agents/*` — agent listing
- `/v1/builder/*` — image building

That is a **substantial product**, not a hollow OS. The Command Center has chat, translation, transcription, speech synthesis, document RAG, vision/OCR, rules evaluation, model browsing, node control, agent management, and image building. This is a full-featured local AI brain.

The over-pruning risk is real in theory but **not in practice** given the current route surface. The core is thick enough. The danger is not that we will prune too much — it is that we will fail to extract misplaced core capabilities (ASR/TTS) from plugin files, leaving them invisible and fragile.

### Tension 5: iHN identity — household product or general local AI platform?

**Round 1 positions:**
- Flagged sharply by Kimi: the portfolio includes healthcare, legal, marketing — not "household" use cases
- Implicitly addressed by most reviewers through the "cross-app demand" criterion

**My Round 2 judgment:** This is a product identity question, not an architecture question. The boundary model works regardless of the answer, because the core surface is defined by **cross-app demand**, not by household semantics.

However, the answer matters for:
- Marketing and positioning
- Which products get first-class support vs. adapter treatment
- Whether enterprise clients are "clients" or "siblings"

**Recommendation:** Flag for Alex's judgment. The architecture does not need to resolve this to proceed with the first coding sprint. But the product narrative does.

---

## Route / capability decisions

| Item | Current state | Recommended home | Notes |
|---|---|---|---|
| `/health` | core, `main.py` | core, Tier 0 | Uncontroversial |
| `/discover` | core, `main.py` | core, Tier 0 | Needs tiered response (core vs. plugin capabilities) |
| `/capabilities` | core, `main.py` | core, Tier 0 | Must split into core and plugin sections |
| `/sessions` | core, `main.py` | core, Tier 1 | Naming caution: must not absorb app-specific session types |
| `/system/stats` | core, `main.py` | core, Tier 0 | Uncontroversial |
| `/setup/*` | core, setup server | core, Tier 0 | Bootstrap surface |
| `/v1/chat` | core, `domains/language.py` | core, Tier 1 | Must stay generic — no persona/scenario params |
| `/v1/translate` | core, `domains/language.py` | core, Tier 1 | Cross-app demand |
| `/v1/transcribe-audio` | core, but in `plugins/pronunco.py` | core, Tier 1, move to `domains/speech.py` | Highest-priority leakage |
| `/v1/synthesize-speech` | core, but in `plugins/pronunco.py` | core, Tier 1, move to `domains/speech.py` | Same |
| `/v1/voices` | core, but in `plugins/pronunco.py` | core, Tier 1, move to `domains/speech.py` | Same |
| `/v1/models` | not a standalone route | core, Tier 1, create as standalone | Already referenced by Android app and mlx-chat-wrapper |
| `compare_pinyin` | does not exist | adapter/plugin | Domain-specific |
| `normalize_pinyin` | does not exist | adapter/plugin | Domain-specific |
| `extract_lesson_items` | adapter/plugin, `plugins/pronunco.py` | adapter/plugin | Kimi dissents: argues for generic structured-extraction primitive. Defer to follow-on sprint. |
| `generate_drill` | stub (501), `plugins/pronunco.py` | app-owned | GLM is clearest: deeply opinionated pedagogy. Should not be an iHN route at any level. |
| `explain_score` | stub (501), `plugins/pronunco.py` | adapter/plugin | GLM's observation: this is N domain-specific explanation functions sharing a pattern, not one route. Treat as adapter template. |
| `chat_persona` | capability flag only | app-owned | Prompt engineering. Apps should send `system_instructions` to `/v1/chat`. |

---

## Contradictions between reviewers

### 1. `extract_lesson_items`: one-app helper vs. general primitive

**Majority** (DeepSeek, Qwen, Codex, Grok, GLM, Gemini): adapter/plugin. The word "lesson" is PronunCo-specific. Even if generalized, the semantics are domain-specific.

**Dissent** (Kimi): "Structured extraction from documents" is a general primitive. Only the lesson schema is PronunCo-specific. Proposes a core `/v1/extract-structured` with adapter-supplied schemas.

**My judgment:** Kimi's structural argument is valid, but the timing is wrong. The first sprint should evict PronunCo-specific routes from the core namespace. A generic structured-extraction primitive can be designed in a follow-on sprint if 2+ non-PronunCo clients demonstrate demand. The "how many current users" metric is indeed the wrong one (Kimi is right about that), but "zero non-PronunCo clients" is a strong signal to defer.

### 2. Dialogue primitive: core substrate vs. app orchestration

**Pro-core** (DeepSeek, Qwen, Codex): Turn management, context trimming, and session expiry are genuinely reused. Six products want bounded dialogue.

**Anti-core** (Gemini, GLM): Dialogue semantics are inherently app-specific. A thin abstraction may be useless. Core already provides chat + sessions.

**My judgment:** I sketched a concrete contract above that is thin enough to be unobjectionable. The key insight is that the dialogue primitive is not "roleplay engine" — it is "session lifecycle with turn history." If the contract stays this thin, the anti-core position loses its force. If it grows to include scenario semantics, the pro-core position becomes dangerous. **The contract sketch is the resolution mechanism.**

### 3. Plugin namespace: direct routes vs. generic invoke

**Direct routes** (DeepSeek, Qwen, Grok, Codex, Gemini): `/v1/plugins/{plugin_id}/route`. URL-level discoverability, easier debugging.

**Generic invoke** (Kimi): `POST /v1/plugin/invoke` with plugin, version, action, payload. Clean route table, explicit boundaries.

**My judgment:** Direct routes win for the first sprint. Generic invoke adds indirection that makes debugging harder and prevents URL-based capability discovery. It is a valid design for a mature plugin ecosystem, but premature for the current stage.

---

## Candidate follow-on sprints

Listed by priority:

1. **"Extract speech domain" sprint** — Move `/v1/transcribe-audio`, `/v1/synthesize-speech`, and `/v1/voices` from `plugins/pronunco.py` into a new `domains/speech.py`. Update `main.py` imports. Scope: ~50 lines moved. This is the highest-signal, lowest-risk change that directly validates the boundary model. Recommended by 5 of 7 reviewers.

2. **"Plugin namespace enforcement" sprint** — Introduce `/v1/plugins/{plugin_id}/...` for all plugin-owned routes. Move `lesson-extract`, `dialogue-session`, `dialogue-turn`, `score-explain`, `drill-generate`, and `image-extract` under `/v1/plugins/pronunco/`. Update the capability registry. Update the web UI. Scope: ~15 routes. Recommended by 6 of 7 reviewers.

3. **"Capability registry split" sprint** — Update `/capabilities` response to distinguish core from plugin capabilities. Add optional `"tier"` metadata. Scope: small schema change. Recommended by 5 of 7 reviewers.

Sprints 1 and 2 can be combined into a single "Speech + plugin namespace dual correction" sprint. Sprint 3 can be bundled with either.

---

## Conversion decision

- **Ready to convert into coding/testing sprint?** Yes — for the first 2 sprints.

The boundary model is stable enough to drive implementation. The unanimous agreement on core routes, the clear identification of PronunCo leakage, and the consensus on plugin namespacing provide a solid foundation.

**Unresolved tensions that should remain in discussion space:**
- Whether to add a generic structured-extraction primitive (`extract_lesson_items` generalization)
- Whether the dialogue primitive should be extracted or kept as "chat + sessions"
- Whether to formalize adapter sub-layers (capability adapters vs. workflow plugins)
- iHN product identity (household vs. general local AI platform)

These are informative tensions, not blocking unknowns. They should be resolved by evidence from the first coding sprint, not by more discussion.

- **Proposed branch topic:** `uniform-web-ui-speech-extraction-and-plugin-namespace`
- **Acceptance criteria:**
  - `curl https://localhost:17777/v1/transcribe-audio` returns 200 and the route is defined in `domains/speech.py`
  - `curl https://localhost:17777/v1/lesson-extract` returns 404
  - `curl https://localhost:17777/v1/plugins/pronunco/lesson-extract` returns 200
  - `/capabilities` response distinguishes core from plugin capabilities

---

*End of Round 2 response. This synthesis was formed after reading the Round 1 synthesis and all seven individual responses.*
