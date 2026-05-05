# Round 2 Response: Client Surface Boundary Review — Critique and Synthesis

**Reviewer:** kimi-k2-6  
**Date:** 2026-05-04  
**Round:** 2 (critique and synthesis)

---

## Decision Summary

### Stable core iHN surface (recommended for immediate stabilization)

~16 route families that should be product-contract stable:

| Route | Rationale |
|---|---|
| `/health` | Bootstrap / operational primitive |
| `/discover` | Bootstrap / identity |
| `/capabilities` | Bootstrap, but **must return tiered schema** (see below) |
| `/sessions` | Cross-cutting infrastructure session lifecycle |
| `/system/stats` | Operational visibility |
| `/setup/*` | Trust / onboarding |
| `/v1/models` | Model inventory; currently buried in `/health` — extract to standalone |
| `/v1/chat` | General AI primitive; no persona/scenario params in core contract |
| `/v1/translate` | General AI primitive |
| `/v1/transcribe-audio` | General AI primitive; currently misplaced in `plugins/pronunco.py` |
| `/v1/synthesize-speech` | General AI primitive; currently misplaced in `plugins/pronunco.py` |
| `/v1/voices` | TTS companion metadata; currently misplaced in `plugins/pronunco.py` |
| `/v1/docs/*` | Document RAG; cross-app demand (legal, medical, tax, investigation) |
| `/v1/vision/*` | OCR / structured extraction; cross-app demand (7+ products) |
| `/v1/rules/evaluate` | Deterministic rules engine; core evaluator, not domain packs |
| `/v1/dialogue/sessions` + `/v1/dialogue/sessions/{id}/turns` | **New core primitive** — see Tension 1 resolution below |

### Adapter / plugin / helper surface

- **Namespace:** `/v1/plugins/{plugin_id}/...` for all plugin routes. The PronunCo persistence router (`/v1/pronunco/...`) already follows this informally; extend to all plugin routes.
- **Current items to move:**
  - `extract_lesson_items` → `/v1/plugins/pronunco/extract-lessons`
  - `generate_drill` → `/v1/plugins/pronunco/generate-drill`
  - `explain_score` → `/v1/plugins/pronunco/explain-score`
  - `chat_persona` → not a route at all; keep as capability flag or adapter prompt config
  - `/v1/image-extract` (stub) → delete or fold into vision router template
- **Capability registry:** Plugin capabilities must be returned under a `plugins` key in `/capabilities`, not mixed with core in a flat namespace.

### App-owned surface

- Pedagogy, drill design, lesson progression, score presentation (PronunCo)
- Coaching loop design, delivery feedback UX (TelPro-Bro)
- Investigation methodology, evidence packaging (ScamHunters)
- Medical coding logic, coverage workflows (iMedisys)
- Legal strategy, filing checklists (iLegalFlow)
- Persona assignment, scenario design, prompt shaping
- All UI orchestration and presentation choices

### Sibling / deployment products (not true iHN clients)

| Product | Classification | Reason |
|---|---|---|
| `RoadNerd` | deployment / sibling | Separate runtime model; may share ideas but should not drive route design |
| `Edge-Kite` | node role / deployment | Event-stream recorder/pre-analyzer; infrastructure pattern, not user-facing client |
| `WhoWhe2Wha` | consumer | Output-oriented; consumes events/plans more than driving interactive APIs |
| `ACTCLI` | unclear | Scope undefined; do not build routes for it yet |

---

## Points of Agreement (universal or near-universal)

1. **ASR/TTS/voices must leave `plugins/pronunco.py`.** 6/7 reviewers (all except Gemini who didn't address codebase specifics) explicitly recommended extracting these into a core domain router (`domains/speech.py`). This is the single most concrete consensus.
2. **Plugin routes need namespacing.** 6/7 reviewers supported `/v1/plugins/{plugin_id}/...` or equivalent. GLM proposed `/adapters/lang/...` instead, but the principle of visible namespacing is unanimous.
3. **`/capabilities` must distinguish core from plugin.** 5/7 reviewers explicitly recommended splitting the response. The flat registry is universally recognized as leaky.
4. **Usefulness ≠ stable route status.** Every reviewer independently stated this. No one argued that "because PronunCo needs it, it should be core."
5. **Apps must own pedagogy, workflow, scoring rubrics, and UX.** Unanimous.
6. **The minimal core surface is ~15 route families.** All estimates converged here.

---

## Points of Tension — Round 2 Judgments

### Tension 1: Core bounded-dialogue primitive (`/v1/dialogue`) — yes or no?

**Round 1 split:** 3 yes (DeepSeek, Qwen, Codex leaning), 2 no (Gemini, GLM leaning), 2 unsure (Grok, Kimi).

**My Round 2 judgment: YES, extract a core `/v1/dialogue` primitive.**

DeepSeek sketched the concrete contract:
- `POST /v1/dialogue/sessions` — create session (params: `model`, `instructions` / `system_prompt`, optional `max_turns`, `context_window`)
- `POST /v1/dialogue/sessions/{id}/turns` — add turn (params: `role`, `content`, optional `audio_url`)
- `GET /v1/dialogue/sessions/{id}` — get session state
- `DELETE /v1/dialogue/sessions/{id}` — cleanup

This contract contains **zero PronunCo vocabulary**: no "scenario," no "rehearsal," no "lesson," no "persona." It is neutral turn-management infrastructure. The six products that want bounded dialogue (PronunCo, TelPro-Bro, iLegalFlow, ScamHunters, ACTCLI, m-Beacon) all need turn management, context trimming, and token accounting. Those are genuinely shared.

**Constraints to prevent leakage:**
- Core contract accepts `instructions` (system prompt) as an opaque string, never a `persona_id` or `scenario_type` enum.
- No scoring, evaluation, or rubric params in core.
- No "difficulty" or "pedagogy" semantics.
- Scenario, persona, scoring, and retry policy belong in adapter/plugin space above this primitive.

**Why this resolves the tension:** The "no" camp's valid concern is that dialogue semantics are app-specific. The "yes" camp's valid claim is that turn management is infrastructure. By making the core primitive extremely thin and neutral, we get the infrastructure benefit without importing app semantics. If it proves too thin after real usage, the classification is reversible — we can deprecate and push to plugins.

**Gemini's counter-position preserved:** If the thin primitive ends up forcing every app to reimplement the same orchestration layer, then we failed to find the right abstraction level. But that failure mode is recoverable; the opposite failure (PronunCo dialogue semantics baked into core) is not.

---

### Tension 2: Adapter/plugin — one layer with namespacing, or two sub-layers?

**Round 1 split:** GLM proposed "capability adapters" (stateless, thin transforms) vs "workflow plugins" (stateful, orchestration). Others used one layer.

**My Round 2 judgment: One layer with namespacing for the first coding sprint; preserve GLM's distinction in naming/docs, but defer formal sub-layering.**

GLM's distinction is intellectually sharp: a pinyin normalizer is structurally different from a drill generator. But we currently have **one plugin** (PronunCo). Creating a formal two-layer plugin architecture before we have a second plugin is taxonomy overhead without evidence. It risks designing a plugin framework for a single user.

**Recommended compromise:**
- Use `/v1/plugins/{plugin_id}/...` for all plugin routes.
- In code and docs, label PronunCo's helpers by type:
  - **Capability adapters:** `compare_pinyin`, `normalize_pinyin` (stateless transforms)
  - **Workflow plugins:** `generate_drill`, `dialogue-scenario` (orchestration)
- When a second plugin arrives (TelPro-Bro adapter pack, iLegalFlow rule pack), revisit whether the structural difference justifies separate code paths or lifecycle policies.

This honors GLM's insight without premature framework design. Codex's "deployment/node-role" 4th bucket should also remain informal for now.

---

### Tension 3: Stability tiers (Tier 0-3) — formalize now or defer?

**Round 1 split:** Qwen (strongest), Kimi, DeepSeek supported explicit tiers. Others worried about premature bureaucracy.

**My Round 2 judgment: Formalize the TIER CONCEPT in `/capabilities` schema NOW; defer full governance (deprecation policy, version-bump enforcement) until more clients exist.**

The schema change is small and high-value:
```json
{
  "tiers": {
    "0": {"setup": true, "health": true, "discover": true},
    "1": {"chat": true, "translate": true, "transcribe_audio": true, ...},
    "2": {
      "plugins": {
        "pronunco": {"extract_lesson_items": true, ...}
      }
    }
  }
}
```

DeepSeek's setup-server litmus test already gives us a de facto Tier 0 (bootstrap routes on port 17778). Qwen's model maps naturally onto this:
- **Tier 0:** Bootstrap — exists on HTTP setup server, never breaks.
- **Tier 1:** Core contract — stable, versioned, deprecation cycle required.
- **Tier 2:** Plugin namespace — loaded dynamically, no cross-plugin guarantees.
- **Tier 3:** App-owned — outside iHN surface.

Adding tier metadata to `/capabilities` is not bureaucracy; it is **machine-readable boundary documentation**. It prevents the drift that created the current leakage. Full governance (CI gates, deprecation timelines) can wait. The labels cannot.

---

### Tension 4: Over-pruning risk — is "thin core" becoming "hollow product"?

**Round 1 split:** GLM and Qwen worried the risk is underweighted. Codex and Gemini thought conservative pruning is correct.

**My Round 2 judgment: Apply DeepSeek's heuristic — the core is NOT hollow.**

Heuristic: "Delete the PronunCo plugin. What does the Web Command Center still need?"

After deletion, the Command Center needs:
- `/health`, `/discover`, `/capabilities`, `/setup/*`, `/system/stats` — trust and control plane
- `/v1/models` — model inventory
- `/v1/chat` — the AI brain
- `/v1/translate` — general capability
- `/v1/docs/*` — document brain
- `/v1/vision/*` — perception brain
- `/v1/rules/evaluate` — deterministic reasoning
- `/v1/transcribe-audio`, `/v1/synthesize-speech`, `/v1/voices` — voice brain
- `/v1/dialogue/sessions` — structured conversation
- `/sessions` — continuity

That is ~15 route families covering control plane, general AI, voice, vision, documents, rules, and dialogue. It is a **thin but complete local AI platform surface** — not an OS, not a hollow shell. The portfolio includes legal, medical, investigation, coaching, analytics, security, and language clients. All of them can build meaningful products on this core without iHN knowing what a "lesson" or "drill" or "coverage gap" is.

The hollow fear is valid as a guardrail, but the current list does not trigger it. GLM's concern about "every client must independently load adapter packs" is mitigated by the fact that core provides genuinely useful AI substrate out of the box.

**Where the risk IS real:** If we push `/v1/docs/*`, `/v1/vision/*`, or `/v1/rules/evaluate` into plugin space because they are "only needed by some apps," THEN the core becomes hollow. Those are general primitives with cross-portfolio demand. Keep them core.

---

### Tension 5: iHN identity — household product or general local AI platform?

**Round 1:** Kimi flagged this most sharply; others treated it as implicit.

**My Round 2 judgment: This is a product identity question, not an architecture blocker. Preserve the tension for Alex's call, but don't let it stall the boundary work.**

The boundary model works under either identity:
- If iHN is a **household product**, then iMedisys/iLegalFlow are siblings, and the core can be narrowed to household-trust + general AI.
- If iHN is a **general local AI platform**, the core remains as listed above.

The current portfolio includes `iOfficeNerd` and `RoadNerd` as sibling/deployment variants. That suggests Alex already envisions iHN as a platform with branded siblings. The architecture does not need to resolve this now. However, the **working assumption for the coding sprint should be platform**, because narrowing prematurely creates future friction. If Alex decides "household only" later, the core can be pruned; expanding a household-only core into a platform later is harder.

**Recommendation:** Flag this explicitly for Alex in Round 2 synthesis. Do not let it block the mechanical boundary cleanup.

---

## Contradictions Between Reviewers (worth preserving)

### Contradiction A: Kimi vs. majority on `extract_lesson_items`

- **Kimi (Round 1):** "Structured extraction from documents" is a general primitive. The word "lesson" is app-specific, but the structural pattern is not. Proposed: core `/v1/extract-structured` with adapter-supplied schemas.
- **Majority (DeepSeek, Qwen, Gemini, GLM, Codex, Grok):** `extract_lesson_items` is adapter/plugin at best, app-owned at worst. "Lesson" is deeply PronunCo; even generalized, the semantics are domain-specific.

**My resolution:** The majority is correct for the **current** route (`extract_lesson_items`), but Kimi's structural insight has merit for the **future**. The vision router already has `/v1/vision/extract/{template}` with templates for receipt, invoice, dish, medical_bill, tax_form. That IS a generic structured extraction primitive. PronunCo should add a `lesson_material` template there, not have its own `/v1/lesson-extract`. So:
- `extract_lesson_items` as a standalone route → **delete** (redundant with vision router)
- `/v1/vision/extract/lesson_material` template → **adapter content** (schema owned by PronunCo plugin)
- The generic template mechanism itself → **core** (already exists in vision router)

This resolves both positions: the general primitive exists, the domain-specific content stays in adapter space.

### Contradiction B: GLM vs. DeepSeek/Qwen on plugin prefix format

- **GLM:** `/adapters/lang/pinyin/normalize` — makes the adapter layer explicit.
- **DeepSeek/Qwen/Codex/Grok/Kimi:** `/v1/plugins/{plugin_id}/...` — consistent with existing `/v1/pronunco/...` persistence router.

**My resolution:** Use `/v1/plugins/{plugin_id}/...` for now. It is consistent with existing code, simpler, and does not require inventing a new taxonomy (`adapters` vs `plugins`). GLM's scheme can be adopted later if formal adapter sub-layering happens. Don't let URL bikeshedding block the mechanical move.

### Contradiction C: Gemini vs. DeepSeek/Qwen on dialogue primitive

- **Gemini:** "Reject the idea of adding roleplay/scenario primitives to the core. Core provides stateful chat; the app provides scenario context, constraints, and evaluation."
- **DeepSeek/Qwen:** "Extract a core `/v1/dialogue` with neutral semantics."

**My resolution:** Gemini is right that "roleplay" must not be core. DeepSeek/Qwen are right that "turn management" should be core. The synthesis is: core provides `/v1/dialogue/sessions` (neutral turn infrastructure), apps/adapters provide scenario, persona, and evaluation. This is not a middle-ground compromise; it is a clean separation of infrastructure (turns) from semantics (scenarios). Gemini would likely accept this if the core primitive contains zero scenario language.

---

## Route / Capability Decisions (full table)

| Item | Current state | Recommended home | Notes |
|---|---|---|---|
| `/health` | core | `core` | Bootstrap / operational |
| `/discover` | core | `core` | Bootstrap / identity |
| `/capabilities` | core, flat | `core`, tiered schema | Must return core vs plugin sections; add tier labels |
| `/sessions` | core | `core` | Infrastructure session lifecycle |
| `/system/stats` | core | `core` | Operational visibility |
| `/setup/*` | core | `core` | Trust / onboarding |
| `/v1/chat` | core | `core` | No persona/scenario params in contract |
| `/v1/translate` | core | `core` | General primitive |
| `/v1/transcribe-audio` | `plugins/pronunco.py` | `core` → `domains/speech.py` | **Highest-priority move** |
| `/v1/synthesize-speech` | `plugins/pronunco.py` | `core` → `domains/speech.py` | **Highest-priority move** |
| `/v1/voices` | `plugins/pronunco.py` | `core` → `domains/speech.py` | **Highest-priority move** |
| `/v1/models` | buried in `/health` | `core`, standalone | Create standalone route |
| `/v1/docs/*` | core | `core` | Document RAG |
| `/v1/vision/*` | core | `core` | OCR / extraction |
| `/v1/rules/evaluate` | core | `core` | Evaluator engine; domain packs are adapter |
| `/v1/dialogue/sessions` | `plugins/pronunco.py` | `core` | Neutral turn-management primitive |
| `/v1/dialogue/sessions/{id}/turns` | `plugins/pronunco.py` | `core` | Neutral turn-management primitive |
| `/v1/lesson-extract` | `plugins/pronunco.py`, stub | **delete** | Redundant with `/v1/vision/extract/lesson_material` |
| `/v1/image-extract` | `plugins/pronunco.py`, stub | **delete** | Redundant with vision router |
| `/v1/score-explain` | `plugins/pronunco.py`, stub | `plugin` → `/v1/plugins/pronunco/score-explain` | |
| `/v1/drill-generate` | `plugins/pronunco.py`, stub | `plugin` → `/v1/plugins/pronunco/drill-generate` | |
| `extract_lesson_items` | capability flag | `plugin` capability | Replaced by vision template |
| `generate_drill` | capability flag | `plugin` capability | |
| `explain_score` | capability flag | `plugin` capability | |
| `chat_persona` | capability flag | `adapter/plugin` config | Not a route; model-tier selection for prompting |
| `compare_pinyin` | does not exist | `adapter/plugin` (if created) | Thin transform; stateless |
| `normalize_pinyin` | does not exist | `adapter/plugin` (if created) | Thin transform; stateless |

---

## Candidate Follow-On Sprints

### Sprint 1: "Extract speech domain + plugin namespace enforcement"
**Scope:** Move ASR/TTS/voices from `plugins/pronunco.py` to `domains/speech.py`. Move all PronunCo plugin routes under `/v1/plugins/pronunco/...`. Update `main.py` imports. Update capability registry. Update web UI to handle new route shapes.  
**Acceptance criteria:**
- `curl /v1/transcribe-audio` returns 200 from `domains/speech.py`
- `curl /v1/lesson-extract` returns 404
- `curl /v1/plugins/pronunco/lesson-extract` returns 200
- `/capabilities` response distinguishes core from plugin capabilities  
**Size:** Medium. **Risk:** Low (mechanical moves). **Signal:** Highest — directly validates the boundary model.

### Sprint 2: "Capability registry tiering + standalone `/v1/models`"
**Scope:** Split `capabilities.py` into core and plugin sections. Add tier labels (0-2) to `/capabilities` response. Extract model inventory from `/health` into standalone `/v1/models`.  
**Acceptance criteria:**
- `/capabilities` returns structured `tiers` or `core`/`plugins` split
- `/v1/models` returns model metadata independently
- Client apps (web UI, Android) query `/v1/models` instead of parsing `/health`  
**Size:** Small. **Risk:** Very low. **Signal:** High — makes boundary machine-readable.

### Sprint 3: "Dialogue primitive extraction" (conditional)
**Scope:** If Tension 1 resolution (above) is accepted, extract a neutral `/v1/dialogue/sessions` and `/v1/dialogue/sessions/{id}/turns` from the PronunCo-specific `/v1/dialogue-session` and `/v1/dialogue-turn`. Move PronunCo scenario-rehearsal framing into a plugin wrapper (`/v1/plugins/pronunco/dialogue-scenario`) that calls the core primitive underneath.  
**Acceptance criteria:**
- Core dialogue routes contain zero PronunCo vocabulary
- PronunCo scenario rehearsal still works via plugin wrapper
- TelPro-Bro can create dialogue sessions via same core primitive  
**Size:** Medium. **Risk:** Medium — requires designing a clean contract. **Signal:** High — tests whether thin-neutral abstraction works or is too thin.

---

## Conversion Decision

- **Ready to convert into coding/testing sprint?** `yes`
- **Confidence:** High for Sprints 1 and 2. Medium for Sprint 3 (dialogue primitive) pending acceptance of Tension 1 resolution.
- **Proposed branch topic:** `uniform-web-ui/speech-extraction-and-plugin-namespace`
- **What feedback is still missing:**
  1. Alex's call on iHN identity (household vs. platform) — not blocking for Sprints 1-2, but needed before broadening core beyond current list.
  2. Validation of `/v1/dialogue` contract against a second client (TelPro-Bro) — Sprint 3 should include this.
  3. Whether PronunCo client code can adapt to namespaced routes without breaking existing app store builds — this affects migration sequencing.

---

## Tensions Worth Preserving for Future Rounds

1. **iHN identity (household vs. platform).** Architecture can proceed; product positioning needs Alex's call.
2. **Adapter sub-layering (capability adapters vs. workflow plugins).** Revisit when a second plugin arrives.
3. **Stability tier governance.** Schema is in; enforcement policy (deprecation cycles, version bumps) is out until more clients exist.
4. **Whether `/v1/extract-structured` (generic template-based extraction) deserves promotion beyond vision router.** If multiple apps beyond vision need structured extraction, a domain-agnostic core primitive may be justified. Currently served by `/v1/vision/extract/{template}`.

---

*End of Round 2 response. Formed by comparing all 7 Round 1 responses against the orchestrator synthesis and the seed brief. Preserved disagreements where they remain informative; resolved tensions where the evidence supports a clean decision.*
