# Feedback: Adapter Families and Client Ports

## 1. High-level reaction

- **What in the seed feels right?**
  The corrective framing is spot on. Shifting from client names to need categories is structurally sound and directly answers the leakage problem identified in the first review. Hypothesis 4 (H4: "A new client should require no iHN core change") is the perfect forcing function for the architecture. The client-side "Ports and Adapters" (Hexagonal Architecture) pattern being proposed is the correct pattern to isolate app UX from backend implementation details.
- **What feels overfit, underfit, or still blurry?**
  The "Provider adapters" section on the client side feels contradictory to the iHN product vision. The seed suggests client apps might have adapters for `Azure`, `OpenAI`, or `Alibaba`. If iHN is the central "local AI platform," the client app should not bypass iHN to talk directly to external clouds. The iHN node should be the privacy boundary, proxy, and audit log. The client should primarily have an `iHN` provider adapter; if upstream cloud fallback is needed, the *node* should orchestrate it (with user consent), not the client app directly.

## 2. Server-side adapter-family proposal

Here is a proposed map of 6 reusable adapter families:

1. **Speech / Audio Pipeline** (ASR, TTS, Voice Metadata)
   - *Classification:* **Stable core**. As established in the previous round, these are foundational primitives.
2. **Document & Knowledge Base** (Ingest, RAG, Embeddings, Search)
   - *Classification:* **Stable core**. Essential for iLegalFlow, Tax, Medical, and general household document management.
3. **Dialogue / Roleplay / Simulation** (Session management, Turn-taking, Context trimming)
   - *Classification:* **Mixed**. Raw stateful chat sessions are *stable core*. Domain-specific scenario logic and persona loading belong in *installable plugin space*.
4. **Vision / Evidence Extraction** (OCR, Object Detection, Template Extraction)
   - *Classification:* **Mixed**. Raw OCR is *stable core*. Named extraction templates (`lesson_image`, `tax_form`, `medical_bill`) belong in *installable plugin space*.
5. **Rules / Decision Support** (Deterministic reasoning)
   - *Classification:* **Mixed**. The evaluation engine is *stable core*. The domain-specific rule packs (e.g., medical coding rules) belong in *installable plugin space*.
6. **Monitoring / Event Triage** (Event streams, anomaly detection)
   - *Classification:* **Installable plugin space**. Too domain-specific for core. On-My-Watch and Edge-Kite need this, but the logic is heavy and app-specific.

## 3. Client-side architecture proposal

Client apps should adopt a strict Hexagonal Architecture:

- **App core:** Pure business logic, state machines, pedagogy (PronunCo), or legal workflow (iLegalFlow). It must be completely unaware of HTTP, ML models, iOS/Web frameworks, or disk implementations.
- **Capability ports:** Interfaces defined *by the App Core's needs*. Examples: `ITranscriptionService`, `IDocumentQueryService`, `IScoringRubricService`.
- **Provider adapters:** Implement the Capability Ports. *Crucial distinction:* This should primarily be the `iHN Client SDK`. The client shouldn't manage OpenAI keys. It should translate `IDocumentQueryService.Query()` into `POST /v1/docs/query`.
- **Storage/search adapters:** Implement `ILocalStorage`, `ICloudSync`. Maps to SQLite, CoreData, or iHN persistence via `/v1/persistence`.
- **Policy/orchestration:** Wires the App Core to the Adapters. Handles retries, caching, fallback UI, error translation, and network resilience (e.g., offline mode handling).

## 4. Pressure-test clients

- **Which client is the best speech-heavy pressure test?**
  **TelPro-Bro**. It stresses low-latency streaming, ASR, TTS, and coaching loops without the heavy pedagogical baggage of PronunCo. It is a purer test of the speech primitives.
- **Which client is the best docs/rules-heavy pressure test?**
  **iLegalFlow**. It stresses RAG, complex rule evaluation, and structured extraction in a highly structured domain, making it the perfect canary for the Docs/Rules adapter family.
- **Which client most risks misleading the architecture if treated as “normal”?**
  **Edge-Kite**. It is fundamentally a node role / edge daemon, not a user-facing client. Treating it as a "normal" client will warp the client-side architectural assumptions.

## 5. Where I disagree

- **Name at least one important disagreement or uncertainty you think should stay open for now:**
  The location of upstream cloud integration. The seed implies client apps might have their own provider adapters for Azure or OpenAI. I strongly disagree. I believe upstream cloud fallback should be an *iHN node capability* (configured in the Command Center), not a client app capability. Allowing client apps to directly contact OpenAI breaks the privacy and auditability promises of the iHN platform. This tension should remain open until the privacy/trust model is formalized.

## 6. Suggested next move

- **What should happen next?**
  **A client-mirror discussion**. Start with PronunCo. Map its current monolithic codebase into the proposed App Core + Ports + `iHNAdapter` structure on paper. We need to see if the theoretical ports hold up against actual app requirements before we declare the client-side architecture sound and begin refactoring code.
