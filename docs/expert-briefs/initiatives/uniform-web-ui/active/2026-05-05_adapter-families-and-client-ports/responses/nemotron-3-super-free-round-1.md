# Feedback Template: Adapter Families and Client Ports

## 1. High-level reaction

What in the seed feels right?
- The separation of concerns between server-side adapter families and client-side app cores/ports/adapters is well-conceived
- Recognizing client apps as pressure tests rather than architecture units is correct
- The working architecture draft in sections A and B provides a clear conceptual model
- The emphasis on reusable adapter families over app-specific helpers aligns with good architectural principles

What feels overfit, underfit, or still blurry?
- The boundary between "stable core" and "installable plugin space" could be clearer for some adapter families
- The relationship between client-side policy/orchestration layer and server-side adapter families needs more definition
- The examples provided (PronunCo) are helpful but don't fully illustrate how non-speech clients would map to the model
- Some tension exists between wanting reusable families and the risk of creating overly generic abstractions

## 2. Server-side adapter-family proposal

List your preferred 5-7 adapter families:
1. **Speech Processing** (ASR/TTS/voices) - stable core (already being extracted to domains/speech.py)
2. **Document Processing & Rules Engine** - installable plugin space (docs/rules evaluation, transformation)
3. **Vision & Evidence Extraction** - installable plugin space (image analysis, OCR, object detection)
4. **Dialogue & Conversation Management** - installable plugin space (session management, context handling)
5. **Planning & Recommendation** - installable plugin space (task planning, suggestion generation)
6. **Monitoring & Triage** - installable plugin space (anomaly detection, alerting, health checks)
7. **Persistence & Storage Abstraction** - mixed (core persistence interfaces with plugin implementations)

For each one, say whether it belongs mostly in:
- Speech Processing: stable core (already decided)
- Document Processing & Rules Engine: installable plugin space (domain-specific rule packs vary by client)
- Vision & Evidence Extraction: installable plugin space (different vision models suited to different use cases)
- Dialogue & Conversation Management: installable plugin space (conversation patterns vary significantly by domain)
- Planning & Recommendation: installable plugin space (algorithms and data sources are client-specific)
- Monitoring & Triage: installable plugin space (monitoring needs differ by deployment context)
- Persistence & Storage Abstraction: mixed (core interfaces in stable core, specific implementations in plugins)

## 3. Client-side architecture proposal

How should client apps be split into:
- **app core**: Domain-specific workflow logic, user journey orchestration, presentation layer, domain rules/policy (what makes the client unique)
- **capability ports**: Well-defined interfaces that declare what capabilities the app needs (e.g., SpeechService, DocumentService, VisionService) without specifying implementation
- **provider adapters**: Implementations of capability ports that connect to specific backends (iHN services, Azure AI, OpenAI, local models, etc.)
- **storage/search adapters**: Implementations for data persistence and retrieval (local disk, iHN persistence, cloud storage, databases)
- **policy/orchestration**: Business rules that determine when and how to use different providers/storage, fallback chains, cost optimization, privacy controls

## 4. Pressure-test clients

- Which client is the best speech-heavy pressure test? PronunCo (already established)
- Which client is the best docs/rules-heavy pressure test? iLegalFlow (legal document processing, compliance checking)
- Which client most risks misleading the architecture if treated as "normal"? ScamHunters (real-time analysis, external API integration, evolving threat models)

## 5. Where I disagree

I think the boundary between server-side adapter families and client-side policy/orchestration needs more clarification. Specifically, there's a risk of either:
1. Pushing too much decision logic into server-side adapters (making them less reusable), or
2. Duplicating policy logic across client apps (increasing maintenance burden)

The client-side policy/orchestration layer should handle things like provider selection based on cost/latency/privacy, fallback strategies, and combining results from multiple sources - but it's not always clear where that line should be drawn.

## 6. Suggested next move

After this cross-client adapter-family discussion stabilizes further, we should begin mirror discussions in client repos starting with:
1. PronunCo (to validate the speech-heavy use case)
2. iLegalFlow (to validate the docs/rules-heavy use case)

This approach allows us to validate the architecture against different types of clients before committing to implementation. The mirror discussions should focus on how each client would map their specific needs to the proposed adapter-family and client-port model.

We should not jump into coding/testing cleanup sprints until we have validated the architecture with at least two different client types to ensure we're not overfitting to PronunCo-specific patterns.