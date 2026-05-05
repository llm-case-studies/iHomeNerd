# Synthesis and Critique (Round 2)

## Reviewer Info
- Name / model: Gemini 3.1 Pro (High)
- Date: 2026-05-04

## 1. Resolution of Tensions

### Tension 1: Core bounded-dialogue primitive (`/v1/dialogue`) — Yes
**Judgment:** I lean **Yes** to extracting a core `/v1/dialogue` primitive, provided we can strictly decouple session state from domain scenarios. The disagreement stems from a valid fear of leakage. However, conversation state management (turn history, context window trimming, token accounting) is hard to get right and heavily reused across 6+ apps.
**Concrete Route Contract Sketch:**
```json
// POST /v1/dialogue/sessions
// Request
{
  "system_instruction": "You are a helpful assistant.", // NO persona semantics here
  "context_window_strategy": "rolling",
  "max_tokens": 4096
}
// Response
{ "session_id": "dlg_123" }

// POST /v1/dialogue/sessions/dlg_123/turns
// Request
{
  "role": "user",
  "content": "Hello"
}
// Response
{ "role": "assistant", "content": "Hi there" }
```
This contract is purely about turn management and memory. If PronunCo wants "scenario rehearsal," it maintains the scenario logic in its adapter and passes raw instruction strings to this core route.

### Tension 2: Adapter/plugin — Two sub-layers (Capability Adapters vs. Workflow Plugins)
**Judgment:** GLM's distinction is sharp and vital. A stateless `normalize_pinyin` (Capability Adapter) has a vastly different lifecycle and risk profile than a stateful `generate_drill` (Workflow Plugin).
**Recommendation:** We do not need distinct URL namespaces for them immediately (a single `/v1/plugins/{plugin_id}/` prefix suffices for routing), but we *must* distinguish them in the capability registry and architecture documentation. A workflow plugin is essentially a backend-for-frontend (BFF) and should be treated with high skepticism before being shared across clients.

### Tension 3: Stability tiers (Tier 0-3) — Formalize Now
**Judgment:** Qwen is correct. Without stability tiers, the boundary model is purely spatial, not temporal. A "core" route without a deprecation policy is indistinguishable from a long-lived plugin route. 
**Recommendation:** We must formalize it now, specifically in the `/capabilities` registry. Update `/capabilities` to return tiered capability lists (e.g., `core_tier_1`, `plugin_tier_2`). This is a small schema change with massive downstream clarity for client developers.

### Tension 4: Over-pruning risk — Apply DeepSeek's heuristic
**Judgment:** Apply DeepSeek's test: "Delete PronunCo plugin. What does the Command Center still need?"
If we delete PronunCo, the Command Center still needs: `/health`, `/discover`, `/capabilities`, `/v1/chat`, `/v1/models`, `/setup/*`, `/system/stats`, `/v1/docs` (RAG for household docs), `/v1/vision` (camera feeds/receipts), and `/v1/transcribe-audio` (voice commands to home).
**Does this feel like a hollow product?** No. It feels like a localized, private AI brain for a household. The fear of over-pruning is valid, but the core remaining after removing domain-specific plugins is still a formidable product foundation.

### Tension 5: iHN identity — Household product or general local AI platform?
**Judgment:** This is the root of Kimi's observation. If iHN is purely a household product, then enterprise apps (iMedisys, iLegalFlow) are forcing unnatural generalities.
**Recommendation:** iHN must be a **general local AI platform** that *ships* with a household control plane as its flagship first-party client. The core routes must remain neutral to the domain. The enterprise clients prove the strength of the generic primitives. If we optimize the core *only* for households, we will build a brittle product.

## 2. Contradictions Between Reviewers
- **Kimi vs. The Majority on `extract_lesson_items`:** The majority wants to banish this to the PronunCo plugin space. Kimi argues that "structured extraction" is a general primitive that currently happens to only have one consumer. I agree with Kimi structurally, but the *name* must change. It should be a core `/v1/extract-structured` route, with the "lesson" schema passed as a parameter from the app or adapter.
- **DeepSeek/Qwen vs. Kimi on routing namespace:** DeepSeek/Qwen argue heavily for a `/v1/plugins/{plugin_id}/` namespace prefix. Kimi proposes a generic `/v1/plugin/invoke` route. I side with DeepSeek/Qwen. A RESTful prefix is standard, discoverable, and caches well, whereas a generic invoke route hides the API surface.

## 3. Conversion Readiness Recommendation
**Yes, we are ready to convert into coding/testing work.**
The conceptual boundaries are sharp enough to begin extracting the most obvious leaks. Further philosophical debate will yield diminishing returns until we see the new boundaries in code.

## 4. Proposed Follow-on Sprints
These sprints are scoped to be small, concrete, and implement the highest-signal changes agreed upon in this review:

1. **Sprint: Extract Speech Domain (Highest Priority)**
   - **Scope:** Move `/v1/transcribe-audio`, `/v1/synthesize-speech`, and `/v1/voices` out of `plugins/pronunco.py` and into `domains/speech.py`.
   - **Why:** Unanimously recommended. It is purely mechanical and instantly clarifies that ASR/TTS are core AI primitives, not language-learning features.
2. **Sprint: Tiered Capability Registry**
   - **Scope:** Modify the `/capabilities` endpoint to return a tiered JSON schema (separating Core capabilities from Plugin capabilities) instead of a flat list.
   - **Why:** Solves Tension 3 and makes the boundary visible to discovery-first clients without breaking existing routes.
3. **Sprint: Plugin Namespace Enforcement**
   - **Scope:** Move remaining PronunCo-specific routes (`lesson-extract`, `dialogue-session`, `drill-generate`) under a strict `/v1/plugins/pronunco/` prefix.
   - **Why:** Enforces the spatial boundary decided in this review and cleans up the top-level `/v1/` namespace.
