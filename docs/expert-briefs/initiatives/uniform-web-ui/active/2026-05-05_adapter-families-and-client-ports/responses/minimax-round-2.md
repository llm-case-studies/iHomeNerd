# Round 2 Feedback: Adapter Families and Client Ports

## Tension 1: Is Monitoring/triage a real adapter family?

**Position: Yes, but as a thin plugin family, not core.**

The pattern (watch → detect → prioritize → route) is genuinely shared across On-My-Watch, Edge-Kite, ScamHunters, and Command Center node health. The "no" camp's concern is valid: a vague monitoring family would duplicate existing primitives. The fix is to define it precisely by contract shape — call it "Event Triage and Incident Intake" rather than "monitoring AI." It belongs in plugin space, not core, at least initially. It can graduate to core later if multiple plugins prove the need.

**Open question:** Does monitoring require a minimal event subscription substrate (new core routes), or can it compose existing scan/vision/routes using only plugin space?

---

## Tension 2: Should Planning/recommendation be dropped as a family?

**Position: Yes, drop it as a server-side family.**

The 6/3 majority is correct. Planning is client-side composition of chat + structured output + domain rules. Tax planning, lesson progression, medical scheduling, legal strategy share no reusable server-side contract. It belongs in the client's policy/orchestration layer or app core as a composition pattern, not as a distinct adapter family.

**Open question:** Should the docs/rules family expose a generic "structured recommendation output" helper (schema + confidence + caveats), or is this purely client-side?

---

## Tension 3: Should Data/external connectors be the 7th family?

**Position: No — keep it as a client-side concern and persistence substrate, not a full server-side family.**

DeepSeek makes a valid point about portfolio products needing external bridges, but elevating "connectors" to a full family risks creating a too-thin abstraction that leaks client-specific schemas. The better pattern: connectors live as part of the storage/search adapter layer and the policy layer, with the node optionally proxying for audit/privacy. Keep the family concept but demote its placement — it is cross-cutting infrastructure, not a capability family on the level of speech, docs, vision, rules, dialogue.

**Open question:** Should the node expose a thin "external feed registration + ingest" primitive for audit/privacy logging even if actual connector logic lives client-side?

---

## Tension 4: Provider adapters — iHN-only or multi-provider client?

**Position: Model A (iHN as sole provider) as the primary architecture. Model B is an explicit opt-in extension.**

Gemini's privacy objection is decisive. iHN's core promise is local-first privacy, auditability, and capability discovery. A normal client should talk to the node. The node decides backend switching (Ollama, MLX, cloud fallback). The client-side port model remains useful under Model A — app core calls `SpeechPort`, `DocumentPort`, etc., and the first adapter is `IhnAdapter`. This prevents route-name leakage without requiring clients to hold their own cloud credentials.

Model B should be a later escape hatch for availability-first deployments or non-sensitive creative work, with explicit privacy approval. Do not make direct cloud providers the reference path.

**Open question:** How does the node advertise "cloud fallback available" in `/capabilities` without exposing provider names or credentials to the client?

---

## Tension 5: Should "1 family = 1 plugin_id" be the mapping rule?

**Position: Accept with modifications — one primary family per plugin pack, but allow cross-family plugins as explicit exceptions.**

GLM's rule is the right direction but too rigid. One family can have many plugins (`rules-legal`, `rules-medical`, `rules-tax`). One app plugin can compose several families (PronunCo uses speech + dialogue + docs + evaluation). The modified rule: every plugin declares a primary `family_id` in its manifest, may declare secondary dependencies, and `/capabilities` surfaces family tags. This keeps the mapping explicit without forcing false namespace symmetry.

**Open question:** Can a single plugin_id belong to multiple families, or must we enforce a primary-family rule with explicit exceptions only?

---

## Tension 6: When should client-mirror discussions start?

**Position: Sequential — stabilize cross-client draft + prototype reference ports in Command Center first, then mirror.**

DeepSeek's "implementation gap 3-4 layers deep" is the key insight. No current client has a capability port layer. Mirroring now risks each client designing non-reusable, app-specific ports against their own immediate needs. A working reference (even thin: one `SpeechPort` + one `DocumentPort` in the web Command Center) provides the concrete contract that makes mirroring productive. Kimi's concern about "elegant but unimplementable" is valid but outweighed by the current codebase reality.

**Open question:** What is the minimum viable "reference port implementation" needed in Command Center before a productive PronunCo or iMedisys mirror can begin?

---

## Tension 7: Is policy/orchestration a separate layer or part of app core?

**Position: Separate thin layer, but allowed to be lightweight for mobile.**

7/9 favor separate. The boundary is important: app core owns product logic; policy owns provider selection, fallback, retry, cost/privacy rules. Collapsing into app core works for small clients until fallback, privacy filtering, or capability discovery appear — then logic leaks into view models and call sites. A small explicit `CapabilityRouter` is cleaner and testable. GLM's "weird indirection" warning is valid: on mobile this can be one coordinator class, not a heavy enterprise bus. The conceptual distinction matters more than the code footprint.

**Open question:** Can policy decisions be expressed via a small declarative config (JSON), or must they remain pure code in the app?

---

## New insight from reading other reviewers

Qwen's framing — "families should describe contract shapes, not cognitive work" — is the single most important guardrail. It explains why labels like "planning" or "simulation" fail while "Event Triage," "Document Pipeline," "Dialogue Sessions" succeed. This should become explicit design guidance for naming any future families.

DeepSeek's implementation dependency chain (plugin registration → tiered capabilities → client ports → policy routing → secondary providers) is the real sequencing constraint. The architecture should not pretend these layers can be built in parallel.

---

## Two open questions to preserve into coding sprints

1. **Connector credential ownership:** For each external connector, do credentials live on the iHN node, in the client app, or in both modes? This affects privacy, OAuth UX, audit, and offline capability.

2. **Monitoring minimum substrate:** Does the monitoring/triage family require new core event/subscription routes, or can the first monitoring plugin compose existing scan/vision/rules routes without them?