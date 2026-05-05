# Round 2 Response: GLM 5.1

## Reviewer
- Model: GLM-5.1
- Date: 2026-05-04

## Part 1: Responses to the Five Specific Tensions

### Tension 1: Core bounded-dialogue primitive - yes or no?

**My judgment: Yes, but minimal.**

The right answer is: core `/v1/dialogue` exists, but it is thin. The contract should expose session management and turn-taking, not scenario semantics.

Proposed contract sketch:
```
POST /v1/dialogue/sessions          — create a dialogue session
POST /v1/dialogue/sessions/{id}/turns — submit a user turn, receive system turn
GET  /v1/dialogue/sessions/{id}     — retrieve state
DELETE /v1/dialogue/sessions/{id}      — end session
```

The key is that `/v1/dialogue` does not know about "roleplay", "coaching", or any domain. It is strictly: create session, add turns, get state, end session. Scenario semantics, persona, and coaching are all injected by adapters.

This is not `/v1/chat` with extra steps. The difference is stateful session management with turn-by-turn context tracking, which plain `/v1/chat` does not provide in the same way.

### Tension 2: Adapter/plugin - one layer or two?

I proposed splitting adapters into capability adapters (stateless, deterministic transforms) and workflow plugins (stateful, multi-step). After reading all Round 1 responses, I still think the distinction is real, but formalizing two sub-layers now is premature. Instead, I'd recommend:
- Keep a single `/v1/plugins/{plugin_id}/...` namespace
- Let the distinction between "stateless adapter" and "stateful plugin" emerge from use, not schema

The stateless/stateful distinction matters for runtime (can it be cached? retried? cached?) but does not need a formal taxonomy in the URL structure.

### Tension 3: Stability tiers - formalize or defer?

I would defer formal tiers for now. Qwen's tier model is architecturally sound but premature. Let the first two coding sprints complete, then codify stability tiers based on what actually breaks.

### Tension 4: The over-pruning risk

DeepSeek's heuristic is right: "Delete PronunCo. What does the command center still need?" That answer is the core. Here's my inventory, applying that test:

After deleting PronunCo, the Web Command Center still needs: health, discover, capabilities, sessions, system stats, chat, translate, transcribe, synthesize, voices, docs, rules, vision. The full list is the ~15 route families I identified in Round 1. I see no need for any other routes in core.

### Tension 5: iHN product identity - household product or general AI platform?

The product identity question cannot be fully resolved in a design doc. It needs to be answered at the business level. However, architecture can support both: if the core surface is small enough to be both a household product and a platform, you get both without over-engineering.

The real question is: does iHN become more valuable as a closed household product or as a platform? The answer depends on whether the market for "home AI that does many things" is bigger than "specific vertical tools." But for architecture, the boundary does not change: the core should be platform-neutral; adapters carry the domain logic.

## Part 2: My judgments on the five tensions

I find:   1. Core bounded-dialogue: Yes, but strictly session-management only. 2. Adapter sub-layers: useful distinction, not yet formal API categories. 3. Stability tiers: document now, enforce later. 4. Over-pruning: not a real risk if you use the "delete PronunCo" heuristic. 5. iHN identity: architecture supports both models, so punt.

## Part 3: Synthesis across all reviewers

Looking at where all reviewers agreed, disagreed, and what we should resolve:

Agreements (6-7 reviewers):
- ASR, TTS, voice, and transcription belong in core.
- PronunCo-specific routes must move under a plugin namespace.
- A plugin namespace prefix is needed.
- The capability registry needs to clearly separate core from plugin.
- `generate_drill` and extract_lesson_items belong in adapter or app.

Disagreements:
- Whether core should contain a dialogue primitive.
- Whether tiers should be formalized now or later.
- Whether extract_lesson_items generalizes to "structured extraction" or stays PronunCo-specific.

My judgment on the disagreements:
- **Dialogue primitive**: Include it. Minimal contract above.
- **Stability tiers**: Document intent now, formalize after 2 sprints.
- **extract_lesson_items → generic structured extraction**: Only if another use case emerges; for now, it belongs in the plugin.

## Synthesized Product Classification

| Product | Proposed category | Reason |
|---|---|---|
| PronunCo | Client | Clear external consumer of core + plugins |
| TelPro-Bro | Client | Same |
| Web Command Center | First-party, internal | Part of iHN itself |
| iOS app | Client | Thin wrapper over the surface |
| RoadNerd | Sibling/Deployment | Different runtime model, shared backend |
| Edge-Kite | Deployment variant | A node profile, not a client |
| WhoWhe2What | Consumer | Consumes events, not API surface |

## Minimal Core

I agree with the synthesis that 12-15 route families are core, plus plugin namespace.

Minimum viable set:
1. /health, /discover, /capabilities, /sessions, /setup, /system/stats, /v1/models, /v1/chat, /v1/translate, /v1/transcribe-audio, /v1/synthesize-speech, /v1/voices, /v1/docs/*, /v1/rules/evaluate, /v1/vision/*
2. Optional: /v1/dialogue/sessions for bounded dialogue sessions
3. Plugin namespace: /v1/plugins/{plugin}/{action}

## Contradictions and Open Questions

1. Dialogue in core: **Yes**, but with the contract above.
2. Adapter sub-layers: Defer formal split; let runtime behavior differentiate.
3. Stability tiers: Document intent now, enforce later.
4. Over-pruning risk: Use the "delete PronunCo" test. Current core surface is not in danger of over-pruning; the risk is too-little in core, not too much.

## Transition to Coding

I believe this initiative is ready to produce code. The first sprint should be:

1. Extract speech domain from PronunCo plugin
2. Re-route plugin routes under /v1/plugins/{plugin}/ namespace
3. Update /capabilities to separate core vs plugin capabilities

These three items constitute one sprint, and their acceptance criteria are straightforward and testable.

