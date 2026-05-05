# Round 2 Feedback: Adapter Families and Client Ports

## Tension 1: Is Monitoring/triage a real adapter family?
**Position: Yes, real family**  
After reviewing other responses (particularly DeepSeek, Grok, Codex, and MiniMax), I agree with the "yes" camp. While Kimi, Qwen, GLM, and Gemini argue it's just app-level orchestration of vision + chat + rules, the structural pattern (watch → detect → prioritize → route) represents a reusable server-side concern that appears across multiple clients. Monitoring/triage involves more than just calling existing primitives—it requires stateful event correlation, threshold configuration, alert deduplication, and routing policies that are domain-agnostic but implementation-specific. Treating it as purely app-level would force each client to rebuild these orchestration capabilities, defeating the purpose of adapter families.

## Tension 2: Should Planning/recommendation be dropped as a family?
**Position: Disagree with dropping—keep as thin server-side family**  
While the majority (DeepSeek, Kimi, Qwen, GLM, Gemini, MiniMax) see planning as client-side composition, I believe there's value in a thin server-side planning adapter family that provides structured output schemas, plan comparison utilities, and constraint validation—similar to how GLM separates thin "capability adapters" from thick "workflow primitives." The core would offer plan template registration and validation primitives, while plugins provide domain-specific planning logic (tax, medical, logistics). This keeps planning from becoming a "misc" category while avoiding over-centralization of domain logic in core.

## Tension 3: Should Data/external connectors be the 7th family?
**Position: Yes, essential 7th family**  
DeepSeek's proposal for a Data & External Connectors family addresses a real gap: 6 portfolio products need external connectors (legal databases, medical APIs, threat feeds). Without this family, each client builds ad-hoc API bridges, creating the fragmentation we're trying to prevent. While some treat connectors as client-side concerns or persistence substrate, the connector pattern (authenticate, query, transform, cache) with standardized interfaces for credential management and data normalization belongs server-side as an installable plugin family. This is not just about persistence—it's about providing reusable bridges to external systems with consistent security and error handling.

## Tension 4: Provider adapters — iHN-only or multi-provider client?
**Position: Start with Model A (iHN-only), design for Model B later**  
Gemini's strongest argument—that direct client-cloud connections break privacy and auditability—convinces me that Model A should be primary. However, DeepSeek's nuance is correct: we should design capability ports to be provider-agnostic so both models can implement the same interfaces. The architecture should begin with iHN as the sole provider (node handles backend switching) but define ports cleanly enough that client-side multi-provider adapters can be added later as an optional enhancement for specific use cases where users explicitly opt-in to cloud services with appropriate consent.

## Tension 5: Should "1 family = 1 plugin_id" be the mapping rule?
**Position: Accept GLM's proposal with clarification**  
GLM's rule—one adapter family = one plugin pack = one plugin_id—makes the relationship explicit and machine-checkable. This transforms adapter families from taxonomic labels into actual code organization units. I accept this rule but add that a single plugin pack may expose multiple related capabilities (e.g., a "medical" plugin might include both rules evaluation and vision extraction for medical images), as long as they belong to the same logical family. The key is that plugin_id corresponds to a coherent adapter family, not that families cannot have internal structure.

## Tension 6: When should client-mirror discussions start?
**Position: Sequential—wait for stabilized draft + Command Center prototype**  
DeepSeek's argument is persuasive: mirroring now risks client teams designing ports against their own app needs, creating non-reusable abstractions. Better to first: (1) stabilize the cross-client adapter-family draft, (2) prototype capability ports in the Command Center (canonical first-party client), and (3) establish plugin registration/capability advertisement mechanisms. Only then should we mirror into PronunCo with a working reference implementation. This prevents each client repo from optimizing around its own workflow too early.

## Tension 7: Is policy/orchestration a separate layer or part of app core?
**Position: Separate layer (client-side)**  
While GLM and Qwen argue for collapsing policy into app core to avoid "weird indirection," the majority (7/9) correctly identify policy/orchestration as a distinct client-side concern. Different clients have different privacy requirements (iMedisys cannot use cloud; PronunCo can), fallback chains, and caching strategies. A separate policy layer enables clean separation: app core declares what it needs, capability ports define how to access capabilities, and policy decides which providers/storage to use based on context. Collapsing it into app core would mix orchestration logic with domain logic, making both harder to test and maintain.

## New Insights from Reviewing Others' Work
1. Qwen's emphasis on describing families by **contract shape** (stateless input/output, session lifecycle) rather than cognitive work is crucial for preventing over-broad families.
2. GLM's insistence on explicit mapping between adapter families and plugin namespace provides the architectural rigor needed to make families more than just labels.
3. DeepSeek's implementation gap analysis reveals we need to sequence work: plugin registration → capability advertisement → client ports → policy → providers before adapter families become real.

## Open Questions for Coding Sprints
1. **How thin should server-side adapter families be?** Specifically, where do we draw the line between thin "capability adapters" (stateless transforms) and thick "workflow plugins" (stateful orchestration) as GLM distinguished?
2. **What constitutes a valid external connector vs. client-owned integration?** When should API keys live client-side vs. server-side, and how do we handle credentials for connectors that require user authentication?