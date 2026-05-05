# Feedback: Adapter Families and Client Ports

## 1. High-level reaction

**What feels right:**
- The core insight that client apps are pressure tests, not architecture units. This is the right framing and avoids the trap of architecture by committee where every client gets its own namespace.
- The separation of server-side adapter families from client-side capability ports. This dual-axis view captures the reality that a client may use multiple server families, and a server family may serve multiple clients.
- The explicit distinction between core primitives versus installable plugin space. This respects the stability needs of core while allowing innovation in plugin space.

**What feels overfit, underfit, or blurry:**
- The proposed server-side families feel partially correct but possibly still influenced by current client overlap. "simulation/roleplay" reads more like a feature description than a stable adapter family—it may be better decomposed.
- The client-side model is clear in structure but underspecified on where the boundaries actually lie. What belongs in "policy/orchestration" versus app core is still fuzzy.
- The relationship between capability ports and provider adapters could use more specificity—it currently reads as "ports call adapters" but the contract between them isn't defined.

## 2. Server-side adapter-family proposal

My preferred 5-7 adapter families:

| Family | Core/Plugin/Mixed | Rationale |
|--------|------------------|-----------|
| **speech** | core | ASR/TTS/voices already identified as Tier 0. This is the most stable family. |
| **document** (docs/rules) | core | Foundation for any client that processes structured text, contracts, medical records, etc. |
| **vision/evidence** | plugin → core trajectory | Currently diverse (image extraction, document scanning, scene understanding). Should start as plugin, with intent to promote to core once patterns stabilize. |
| **planning/recommendation** | plugin | Too workflow-specific to be core. Each client's planning needs differ enough that plugin flexibility is valuable. |
| **search/storage** | mixed | This is infrastructure more than capability—may need to be further split. |
| **monitoring/triage** | plugin | Useful across clients but likely client-configurable enough to stay plugin-bound. |
| **dialogue/conversation** | core | If not covered by speech, this is the interactive layer that many clients need. |

I would **not** keep simulation/roleplay as a standalone family in the 5-7 list—it's too feature-specific. It might be better expressed as a capability that draws from planning + speech + document.

## 3. Client-side architecture proposal

The five-layer model (app core → capability ports → provider adapters → storage/search adapters → policy/orchestration) is structurally sound, but I'd refine the boundaries:

- **App core**: Should own only workflow orchestration and UX state. It should NOT contain provider-specific logic or route names.
- **Capability ports**: These are the key abstraction. Each port should define a contract (input shape, output shape, error semantics) that is provider-agnostic. Think of ports as interfaces, not implementations.
- **Provider adapters**: Implement the port contracts. Each adapter wraps a specific backend (iHN, Azure, OpenAI, Alibaba, etc.). The adapter is responsible for translating port contract to provider-specific API.
- **Storage/search adapters**: Separate from providers because the access patterns differ fundamentally—these are about persistence and retrieval, not inference.
- **Policy/orchestration**: This layer is the most ambiguous. I'd propose narrowing it to "cross-cutting concerns only"—auth, rate limiting, fallback logic, and multi-provider coordination. It should NOT become a second workflow layer.

**Key insight**: The port-to-adapter relationship is the critical design point. If ports are well-designed, switching from OpenAI to iHN should be a configuration change, not a code change.

## 4. Pressure-test clients

- **Best speech-heavy pressure test**: PronunCo (obvious choice, already the reference)
- **Best docs/rules-heavy pressure test**: iMedisys or iLegalFlow—these would expose whether the "document" family is really reusable across medical/legal domains or if it's still client-specific
- **Most risks misleading the architecture**: TelPro-Bro. It's too narrow in scope and might suggest over-specialization if treated as representative.

## 5. Where I disagree

- **Disagreement**: I think the seed undersells how much work the "capability port" layer actually requires. The draft implies ports emerge naturally, but defining good port contracts across diverse clients is the hardest part of this architecture. I'd add an explicit hypothesis that port design is an iterative, client-driven process—not something to fully specify upfront.

- **Uncertainty worth preserving**: Whether storage/search should be a separate adapter family or whether it's part of the document family. The current split creates two parallel adapter tracks (provider and storage), which may create coordination overhead for clients that need both.

## 6. Suggested next move

**Another discussion round**, but with a specific focus: take one actual client (preferably PronunCo) and map its existing capabilities to the proposed families and port model. This will reveal whether the model holds up under concrete scrutiny or if it's still too abstract.

Then, **only after** that validation, begin mirroring into client repos. Starting client-side discussions now risks each repo designing ports around its current provider bindings rather than around true capability abstractions.

The cross-client draft should stabilize further before client mirrors begin—that's the right sequence.