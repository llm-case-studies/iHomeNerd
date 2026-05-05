# Round 2 Response: Adapter Families and Client Ports

**Reviewer:** grok-4.3  
**Date:** 2026-05-05  
**Round:** 2 (after reading round-1-synthesis.md + all 9 Round 1 responses)

---

## Tension 1: Is Monitoring/triage a real adapter family?

**Position:** Yes, it is a real (narrow) adapter family.  
The structural pattern "watch event stream → detect → prioritize → route/alert" is genuinely shared across On-My-Watch, Edge-Kite, ScamHunters, and parts of iLegalFlow. It is not just "app-level orchestration of vision + chat." It justifies a thin server-side family for reusable event subscription, anomaly scoring primitives, and triage routing contracts. Domain-specific detection logic and alert UX stay app-owned or in plugin packs.

**New insight from other reviewers:**  
GLM and the "no" camp (Kimi, Qwen, Gemini) correctly warn against duplicating vision/docs/chat routes. DeepSeek and Codex (my original allies) emphasize the reusable substrate. The synthesis matrix (Kimi) shows it only supports 2+ clients strongly, so it should be a **light family** (core event primitives + plugin for triage rules) rather than a heavy one.

**Open questions for coding sprints:**  
- Does monitoring/triage deserve its own `/v1/plugins/monitoring/...` namespace, or does it live as a sub-pack under an existing family (e.g., vision or investigate)?  
- What is the minimal event subscription contract that 3+ clients can actually share without leaking domain semantics?

---

## Tension 2: Should Planning/recommendation be dropped as a family?

**Position:** Agree — drop it as a standalone server-side family.  
It reduces to client-side composition of existing primitives (`/v1/chat` + structured output + domain rules). Tax planning, lesson progression, medical appointment sequencing, and scam-prevention plans share almost no reusable server-side structure. The "planning" shape lives in the client's policy/orchestration layer and app core, not as a distinct adapter family.

**New insight from other reviewers:**  
The 6/3 majority (DeepSeek, Kimi, Qwen, GLM, Gemini, MiniMax) is convincing. DeepSeek's point that "no shared server structure" across domains is decisive. My original inclusion was over-generalizing the brain-demand cluster into an architecture unit. The synthesis correctly notes it is a composition pattern, not a family.

**Open questions for coding sprints:**  
- Should core or the docs/rules family expose a generic "structured recommendation output" helper (schema + confidence + caveats), or is that purely client-side?  
- How do we prevent every client from re-implementing the same "chat → extract plan → validate against rules" loop in their orchestration layer?

---

## Tension 3: Should Data/external connectors be the 7th family?

**Position:** No — treat as client-side concern + persistence substrate, not a full server-side adapter family.  
Six portfolio products need external connectors (legal databases, medical APIs, threat feeds, etc.), but these are best handled by client-side storage/search adapters and the policy layer calling external services directly (with node as optional proxy). Elevating it to a family risks creating a generic "external ingest" primitive that is either too thin or leaks client-specific schemas.

**New insight from other reviewers:**  
DeepSeek's proposal is the only strong voice for it as a family. The synthesis and most others (including my Round 1) treated connectors as either persistence or client policy. Kimi's client-mapping matrix shows it is cross-cutting but not structurally unifying like the Big 5. GLM's point about under-specified family-to-plugin mapping applies here: without a clear plugin shape, it would just become a dumping ground.

**Open questions for coding sprints:**  
- Should the node expose a thin "external feed registration + ingest" primitive (for audit/privacy logging) even if the actual connector logic lives client-side?  
- How does the persistence family interact with external connectors when the client wants "search across iHN + external sources" in one query?

---

## Tension 4: Provider adapters — iHN-only or multi-provider client?

**Position:** Primary architecture = **Model A (iHN as sole provider for clients)**; Model B (direct client-to-cloud) is optional and node-orchestrated only.  
Clients talk only to the iHN node. The node handles backend switching (local MLX/Ollama + optional cloud fallback with consent and audit). This preserves the privacy, auditability, and offline guarantees that define iHN. Direct client-to-OpenAI/Azure connections break the trust boundary.

**New insight from other reviewers:**  
Gemini's privacy argument is the strongest and most consistent with the platform vision. DeepSeek's nuance ("design ports for both, start with Model A") is pragmatic and matches my original lean. The synthesis shows Gemini + GLM + MiniMax for strong Model A; most others for "both, sequenced." This resolves the seed's ambiguity.

**Open questions for coding sprints:**  
- How does the node advertise "cloud fallback available for this model/family" in `/capabilities` or `/discover` without exposing provider names or credentials to the client?  
- What is the minimal consent/audit contract when the node proxies a request to an upstream provider?

---

## Tension 5: Should "1 family = 1 plugin_id" be the mapping rule?

**Position:** Accept with one modification: **one primary family = one primary plugin pack / plugin_id**, with allowance for sub-packs or cross-family plugins when a single pack legitimately serves multiple families (rare).  
This makes the conceptual families into actual, machine-checkable deployment units under the `/v1/plugins/{plugin_id}/...` namespace established in the prior sprint. It turns taxonomy into code organization.

**New insight from other reviewers:**  
GLM's proposal is the clearest and most actionable single idea in Round 1. The synthesis highlights it as the missing link between families and the plugin namespace. DeepSeek's implementation-gap analysis (no registration system yet) shows why this rule is urgent: without it, families remain whiteboard labels. Qwen's point about families describing "contract shapes" rather than cognitive work supports making the mapping explicit.

**Open questions for coding sprints:**  
- How does a plugin declare (in its manifest or registration) which family(ies) it belongs to so `/capabilities` and discovery can surface it correctly?  
- Can a single plugin_id belong to multiple families, or must we enforce a primary-family rule with explicit exceptions?

---

## Tension 6: When should client-mirror discussions start?

**Position:** **Sequential: stabilize the cross-client draft + prototype reference ports in the Command Center first, then mirror.**  
DeepSeek's argument is decisive: no current client has a capability port layer; they all call raw routes. Starting mirrors in parallel risks each client team designing non-reusable, app-specific ports against their own immediate needs. A working reference implementation (even a thin one in the Web Command Center) provides the concrete contract that makes mirroring productive.

**New insight from other reviewers:**  
DeepSeek's "implementation gap is 3-4 layers deep" (plugin registration → tiered capabilities → client ports → policy routing) is the best framing. Kimi's parallel argument (risk of elegant but unimplementable draft) is valid but outweighed by the current codebase reality. The synthesis shows Codex, MiniMax, Nemotron, and DeepSeek for "wait"; Kimi, Qwen, GLM, Grok (my Round 1), Gemini for "parallel." I am changing my Round 1 position based on the evidence.

**Open questions for coding sprints:**  
- What is the smallest "reference port implementation" that must exist in the Command Center before a productive PronunCo or iMedisys mirror can begin? (e.g., one SpeechPort + one ExtractionPort?)  
- Should the first mirror target be a non-PronunCo client (iMedisys or iLegalFlow) to avoid re-introducing pedagogy bias?

---

## Tension 7: Is policy/orchestration a separate layer or part of app core?

**Position:** Separate thin layer (conceptually and in code structure), but allowed to be lightweight/co-located inside the app core for mobile clients.  
Policy/orchestration (adapter selection, retry, fallback, cost/privacy rules, composition of ports into workflows) must remain distinct from pure domain logic (app core) and from the port interfaces themselves. Collapsing it fully into app core risks polluting the app core with infrastructure concerns. For mobile, it can live as a small coordinator class or even a few methods, but the conceptual separation prevents the "direct binding" problem the whole initiative is solving.

**New insight from other reviewers:**  
7/9 (including my Round 1) favored separate; GLM and Qwen's "weird indirection on mobile" concern is the best counter-argument and should be respected in the implementation. The synthesis correctly notes all agree it belongs client-side. DeepSeek's dependency chain shows policy routing as a distinct step after ports.

**Open questions for coding sprints:**  
- What is the minimal surface of a policy/orchestration layer that mobile clients can implement without excessive boilerplate (1-2 classes max)?  
- Should policy decisions be expressible via a small declarative config (DSL or JSON) or remain pure code in the app?

---

*End of Round 2 response.*  
*All positions informed by round-1-synthesis.md and cross-reading of DeepSeek, Gemini, GLM, Kimi, Qwen, and others.*  
*One position changed from Round 1 (Tension 6: now sequential).*  
*File saved to responses/grok-round-2.md*  
*Discussion-only sprint complete.*  
