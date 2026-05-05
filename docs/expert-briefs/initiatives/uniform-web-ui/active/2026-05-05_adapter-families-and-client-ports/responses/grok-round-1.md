# Feedback: Adapter Families and Client Ports (Round 1)

**Reviewer:** grok-4.3  
**Date:** 2026-05-05  
**Round:** 1 (blind first-pass on this pack)

---

## 1. High-level reaction

- What in the seed feels right?  
  The corrective framing is correct and timely. After the boundary review pruned client-specific leakage, shifting the architecture unit from "named client apps" to "recurring need categories + reusable adapter families" is the right next move. Client apps are excellent pressure tests and discovery tools, not the primary design axis. The separation of server-side adapter families (close to iHN) from client-side app core / ports / provider adapters is a clean and necessary distinction. The hypothesis that a new client should require either zero core change or an installable plugin (not core redesign) is the key guardrail.

- What feels overfit, underfit, or still blurry?  
  The PronunCo example in the seed is a little overfit — it is still being used as the canonical prototype even while the text argues against client-name overfitting. The client-side model (app core + ports + provider adapters + storage adapters + policy) is under-specified on the boundary between "capability ports" and "policy/orchestration". Storage/search adaptation is blurry: is it a separate adapter family or just another provider? Simulation/roleplay remains the fuzzies family (one vs several). Overall the draft is strong and moves in the right direction.

---

## 2. Server-side adapter-family proposal

Preferred 5-7 reusable families (need categories, not client names):

1. **Speech family**  
   - Stable core (ASR, TTS, voices, bounded dialogue primitive) + thin installable plugin for voice profiles / custom voices.  
   - Already being extracted; this is the clearest win from the prior sprint.

2. **Documents & Rules family**  
   - Core engine (RAG, `/v1/docs/*`, `/v1/rules/evaluate`, generic `extract-structured`) + installable domain packs (medical coding rules, legal compliance, tax forms, IP analysis).  
   - Engine in core; packs in plugin space. Cross-client demand from iMedisys, iLegalFlow, ScamHunters, Tax copilot, iForeclosed.

3. **Vision & Evidence family**  
   - Core (OCR, template-based structured extraction, image analysis, `/v1/vision/*`) + installable plugin for domain templates (receipt, medical_bill, evidence_photo, lesson_image).  
   - Used by On-My-Watch, iMedisys, ScamHunters, RoadNerd, Kitchen, iForeclosed.

4. **Monitoring / Triage / Investigation family**  
   - Core (event streams, `/v1/investigate/*`, triage primitives) + plugin for domain-specific triage rules and alert policies.  
   - Strong for On-My-Watch, ScamHunters, Edge-Kite.

5. **Planning & Recommendation family**  
   - Mixed: core substrate (chat + summarize + structured output) + installable plugin for domain planning loops (appointment sequencing, logistics routing, prevention plans, progression planning).  
   - Avoids bloating core with app-specific plan semantics.

6. **Dialogue & Simulation family**  
   - Core (neutral bounded dialogue sessions/turns with context/turn management) + installable plugin for scenario/persona/rubric/pedagogy.  
   - Preserves the productive tension from Round 1. One family, two layers.

7. **Persistence & Search family** (optional 7th)  
   - Core generic persistence + client-side storage/search adapters (local disk, iHN persistence, GitHub, cloud search).  
   - Node-side plugin only for iHN-specific persistence features; most adaptation lives client-side.

These families are reusable across 6+ portfolio entries without naming any single client.

---

## 3. Client-side architecture proposal

Each client app should follow this shape (stable across clients):

- **App core**  
  Domain workflow, UX, pedagogy, scoring presentation, lesson/drill flow, medical coding logic, investigation methodology, coaching loops, business rules, UI orchestration, cached presentation choices. This is where "PronunCo-ness" or "iMedisys-ness" lives. Never leaks into iHN.

- **Capability ports** (typed interfaces the app core calls)  
  Examples:  
  - `SpeechFeedbackPort` (transcribe, synthesize, score, voices)  
  - `DialoguePort` (create session, add turn, get context)  
  - `ExtractionPort` (extract structured, lesson items, evidence)  
  - `RulesPort` (evaluate domain rules)  
  - `SearchStoragePort` (query, store, retrieve)  
  - `PlanningPort` (generate recommendation)  
  These are the stable contracts the app core depends on. They hide provider differences.

- **Provider adapters** (implement the ports)  
  - `IHNProviderAdapter` (primary, uses core + plugin routes)  
  - `AzureOpenAIProviderAdapter`  
  - `LocalMLXProviderAdapter` / `LocalFallbackAdapter`  
  - `AlibabaProviderAdapter`  
  Swappable at runtime or build time. Policy decides which to load.

- **Storage / search adapters** (separate concern from providers)  
  - Local disk / SQLite  
  - iHN persistence plugin  
  - GitHub / cloud storage  
  - Vector search backends  
  These can be mixed independently of the AI provider (e.g., use iHN for chat but local disk for private lesson history).

- **Policy / orchestration layer** (top of the client)  
  Chooses adapters based on privacy, cost, latency, offline requirements; applies retry, fallback, logging, consent, and composes ports into higher-level workflows. This is purely app-owned and where most "business logic" lives.

This pattern lets PronunCo, iMedisys, and On-My-Watch share the same port abstractions while differing wildly in their app cores and policy.

---

## 4. Pressure-test clients

- Best speech-heavy pressure test: **PronunCo** (already did the heavy lifting; still the canary for dialogue, ASR/TTS, and lesson extraction).

- Best docs/rules-heavy pressure test: **iMedisys** or **iLegalFlow** (excellent for rules engine + domain packs + structured extraction from regulated documents; less speech bias than PronunCo).

- Client that most risks misleading the architecture if treated as "normal": **RoadNerd** or **Edge-Kite** (they are deployment / node-role / runtime participants more than ordinary client apps; their needs shape discovery, offline, and event capture but should not drive client-port design).

---

## 5. Where I disagree

- The boundary between "capability ports" and "policy/orchestration" is still blurry. If ports become too thick (orchestration leaks into them), we recreate the same app-specific leakage we just cleaned up on the server side. I think ports should stay thin interfaces; orchestration belongs strictly in the app layer. This uncertainty should stay open until we see concrete port definitions from two different clients.

- Storage/search adapters: I am unsure whether some of this belongs as a small node-side plugin family or stays purely client-side. iHN persistence is powerful, but forcing every client to go through it may not always be right. Preserve this tension.

- Simulation/roleplay family thickness: still the most productive open question from the prior sprint. One family with clear core/plugin split feels right, but the exact contract for the core dialogue primitive needs validation against a non-PronunCo client.

---

## 6. Suggested next move

- Finish this cross-client adapter-family draft (one more synthesis round is useful to converge on the exact 5-7 families and port shapes).

- Then immediately mirror the discussion into two client repos in parallel:  
  - PronunCo (speech/dialogue heavy)  
  - iMedisys or iLegalFlow (docs/rules heavy)

- After the client mirrors report back, compare divergences and cut the first coding/testing sprints for:  
  - adapter family contracts (server-side)  
  - capability port interfaces (client-side, language-agnostic spec first)  
  - one reference provider adapter (iHN) + one fallback (local)

This sequence prevents each client repo from optimizing around its own workflow too early while still getting real pressure-test feedback quickly.

---

*End of Round 1 response for this pack.*  
*Independent viewpoint; did not read other Round 1 responses in this pack before forming this.*  
*Prior round-2-synthesis from boundary review was consulted only for the "do not re-litigate" decisions.*  
*File saved to responses/grok-round-1.md*  
*Discussion-only sprint.*  
