# Round 1 Synthesis — Client Surface Boundary Review

**Synthesizer:** Gemini (orchestrator role)
**Date:** 2026-05-04
**Participants:** Grok 4.3, DeepSeek v4-pro, Gemini 3.1 Pro, Codex, Qwen, GLM 5.1, Kimi K2-6

---

## Summary

Seven independent reviewers examined the 3-layer boundary model (core / adapter-plugin / app-owned). The level of convergence is remarkably high on fundamentals, with productive disagreement concentrated in exactly the right places.

---

## Universal Agreement (7/7 reviewers)

These positions were held by every single reviewer without exception:

### Core surface — unanimous
| Route | Consensus | Notes |
|---|---|---|
| `/health` | **core** | |
| `/discover` | **core** | Needs tiering (see tensions) |
| `/capabilities` | **core** | Needs tiering (see tensions) |
| `/sessions` | **core** | Naming caution: must not absorb app-specific session types |
| `/system/stats` | **core** | |
| `/setup/*` | **core** | |
| `/v1/chat` | **core** | Must stay generic — no persona/scenario params in core contract |
| `/v1/translate` | **core** | |
| `/v1/transcribe-audio` | **core** | Currently misplaced in `plugins/pronunco.py` (flagged by 4 reviewers) |
| `/v1/synthesize-speech` | **core** | Same misplacement |
| `/v1/voices` | **core** | Same misplacement |
| `/v1/models` | **core** | Should be standalone, not buried in `/health` or `/capabilities` |

### Not-core — unanimous
| Item | Consensus | Notes |
|---|---|---|
| `normalize_pinyin` | **adapter/plugin** | Straw man or at best a language adapter |
| `compare_pinyin` | **adapter/plugin** | Same |
| `generate_drill` | **adapter/plugin or app-owned** | Pedagogy; some say app-owned, some say plugin |
| `chat_persona` | **adapter/plugin or app-owned** | Persona is prompt engineering, not a core primitive |

### Shared architectural convictions
1. **Usefulness ≠ stable route status.** Every reviewer independently stated this.
2. **The PronunCo leakage problem is real and urgent.** The clearest example: ASR/TTS living inside `plugins/pronunco.py`.
3. **Plugin routes need namespacing.** Flat `/v1/` for both core and plugin is the root cause of boundary invisibility.
4. **Apps should own pedagogy, coaching, scoring rubrics, workflow UX, and persona.**
5. **The minimal core surface is ~12-16 route families.** All estimates converged on this range.

---

## Strong Majority Agreement (5-6/7 reviewers)

### Extract speech into a core domain router
**DeepSeek, Qwen, Gemini, Codex, GLM** explicitly recommended extracting `transcribe-audio`, `synthesize-speech`, and `voices` from `plugins/pronunco.py` into a new `domains/speech.py`. This was the single most-recommended concrete coding action.

### `/v1/plugins/{plugin_id}/...` namespace prefix
**DeepSeek, Qwen, Gemini, Codex, Grok, Kimi** recommended a plugin namespace prefix. Only GLM proposed a different scheme (`/adapters/lang/...`). The exact prefix varies, but the principle is unanimous.

### Split `/capabilities` into core vs. plugin sections
**DeepSeek, Qwen, Kimi, Codex, Gemini** recommended the response from `/capabilities` distinguish core from plugin capabilities. Example:
```json
{
  "core": {"chat": true, "translate": true, ...},
  "plugins": {
    "pronunco": {"extract_lesson_items": true, ...}
  }
}
```

### Reclassify RoadNerd / Edge-Kite as deployment, not client
**Grok, DeepSeek, Codex, Qwen** explicitly reclassified these. **Kimi** and **GLM** noted a missing "runtime participant" or "node role" category. Only **Gemini** didn't address this explicitly.

---

## Productive Tensions (the stuff that matters for Round 2)

### Tension 1: Core bounded-dialogue primitive — yes or no?

| Position | Advocates |
|---|---|
| **Yes — extract a core `/v1/dialogue`** | DeepSeek, Qwen, Codex (leaning) |
| **No — chat + sessions is enough** | Gemini, GLM (leaning) |
| **Unsure / preserve the fuzziness** | Grok, Kimi |

This is the single most contested classification. Six products want bounded multi-turn dialogue. The split is:
- **Pro-core:** Turn management, context trimming, token accounting, session expiry are genuinely reused. The classification is reversible.
- **Anti-core:** Dialogue semantics are inherently app-specific. A thin abstraction may be useless; a thick one leaks.
- **DeepSeek's heuristic:** "Delete the PronunCo plugin. What routes does the web command center still need?" — those are core.

> **Round 2 task:** Force a concrete route contract sketch for the proposed `/v1/dialogue` primitive. If the contract can be written without PronunCo vocabulary, it's core. If it can't, it stays plugin.

### Tension 2: Adapter/plugin — one layer or two?

| Position | Advocates |
|---|---|
| **One layer with namespacing** | DeepSeek, Qwen, Grok, Codex |
| **Two sub-layers: capability adapters vs. workflow plugins** | GLM |
| **iHN-hosted plugins vs. client-side adapters** | Gemini |
| **Plugin invocation contract (generic `/v1/plugin/invoke`)** | Kimi |

GLM's distinction between stateless capability adapters (pinyin normalizer) and stateful workflow plugins (drill generator) is sharp and useful. Gemini's point about iHN-hosted vs. client-side is orthogonal and also valid. Kimi proposed a radical approach: generic plugin invocation route instead of per-plugin URLs.

> **Round 2 task:** Decide whether the adapter layer needs formal sub-typing for the first coding sprint, or whether a single `/v1/plugins/{plugin_id}/...` namespace is sufficient for now.

### Tension 3: Stability tiers — needed now or premature?

| Position | Advocates |
|---|---|
| **Add explicit stability tiers (Tier 0-3)** | Qwen (strongest), Kimi, DeepSeek |
| **Implicit tiers from the setup server are enough** | DeepSeek (secondary), Qwen (secondary) |
| **Too much bureaucracy for the current stage** | (counter-position preserved by Qwen) |

Qwen's tiering model: Tier 0 (bootstrap/setup server), Tier 1 (core contract), Tier 2 (plugin namespace), Tier 3 (app-owned). This maps naturally to the existing setup server as a litmus test.

> **Round 2 task:** Decide if Tier 0/1/2/3 should be formalized in the `/capabilities` response or if it's documentation-only for now.

### Tension 4: Over-pruning risk — is "thin" becoming "hollow"?

| Position | Advocates |
|---|---|
| **Risk is real and underweighted** | GLM (strongest), Qwen, DeepSeek |
| **Conservative pruning is correct bias** | Codex, Gemini |
| **Resolve by testing against the Command Center** | DeepSeek |

DeepSeek's proposed heuristic: "Delete the PronunCo plugin. What does the web command center still need?" Those routes are core. This grounds the decision in a real first-party client rather than abstract generalization.

> **Round 2 task:** Apply the "delete PronunCo" test to the current route surface and see what survives.

### Tension 5: Is iHN a household product or a general local AI platform?

**Kimi** flagged this most sharply: the portfolio includes healthcare, legal, marketing, and investigation products that are not "household" use cases. If iHN is fundamentally household-scoped, enterprise clients are siblings. If it's a general AI platform, the core surface must be much broader.

> **Round 2 task:** This is a product identity question, not an architecture question. Flag for Alex's judgment.

---

## `explain_score` and `extract_lesson_items` — the interesting edge cases

These two items generated the most nuanced analysis:

- **`explain_score`:** All reviewers agreed it's not core. But GLM made the sharpest observation: it's actually N different domain-specific explanation functions with a shared *pattern*. It should be treated as a pattern (adapter template), not a route.
- **`extract_lesson_items`:** Kimi dissented from the majority: "structured extraction from documents" is a general primitive; only the "lesson" schema is PronunCo-specific. Proposed: a core `/v1/extract-structured` with adapter-supplied schemas. Others classified it as purely adapter/plugin.

---

## Candidate Follow-On Sprints (aggregated from all reviewers)

Listed by frequency of recommendation:

| Sprint | Recommended by | Scope |
|---|---|---|
| **Extract speech domain** (`transcribe-audio`, `synthesize-speech`, `voices` → `domains/speech.py`) | DeepSeek, Qwen, Gemini, Codex | Small, mechanical, highest-signal |
| **Plugin namespace enforcement** (move PronunCo routes to `/v1/plugins/pronunco/...`) | DeepSeek, Qwen, Gemini, Grok, Kimi | Medium, route + capability registry update |
| **Route inventory + classification audit** | Codex, Grok, Kimi | Documentation + classification, no code change |
| **Capability registry split** (core vs. plugin in `/capabilities` response) | DeepSeek, Qwen, Kimi | Small schema change |
| **Standalone `/v1/models` route** | DeepSeek, Qwen | Already in progress via `frontend-model-selector` sprint |
| **Plugin registration/invocation contract design** | Kimi, GLM | Discussion or design sprint first |
| **OpenAPI / minimal contract documentation** | Gemini, GLM, Qwen | Documentation sprint |

---

## Conversion Readiness Assessment

**Ready to convert into coding/testing work?** Yes — for the first 2-3 sprints.

The first sprint is obvious and unanimously recommended: **extract speech domain from PronunCo plugin**. This is the highest-signal, lowest-risk change that directly validates the boundary model.

The second sprint (plugin namespace enforcement) has strong support but needs one Round 2 decision: what the prefix looks like (`/v1/plugins/pronunco/...` vs. `/v1/pronunco/...` vs. generic invoke).

The third sprint (capability registry split) is small and can be bundled with either of the above.

Deeper questions (dialogue primitive, stability tiers, adapter sub-typing, iHN product identity) should remain in discussion space — they're informative tensions, not blocking unknowns.
