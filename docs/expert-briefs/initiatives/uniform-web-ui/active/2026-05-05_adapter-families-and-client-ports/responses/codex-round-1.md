# Feedback: Adapter Families and Client Ports

## 1. High-level reaction

The seed is directionally right: named client apps should not be the primary
server architecture unit. `PronunCo`, `iMedisys`, `iLegalFlow`,
`ScamHunters`, and `On-My-Watch` are useful because they reveal recurring
needs, not because each deserves a first-class iHN surface area.

The nuance I would preserve is that client apps are not *only* pressure tests.
They are still product, release, ownership, UX, and policy units. They are the
place where domain language belongs. They are also the right place for
acceptance tests that prove the platform is useful. The mistake would be
letting that product vocabulary leak downward into stable core routes.

The draft is strongest where it separates:

- stable iHN primitives
- installable server-side plugins or adapter packs
- client app cores
- client-facing capability ports
- provider and storage adapters

The blurriest part is the phrase "adapter family." It risks mixing three
different things:

- a server-side capability family, such as speech or vision
- a provider adapter, such as OpenAI, Azure, Alibaba, or local runtime
- an app workflow plugin, such as PronunCo lesson extraction or coaching

Those should remain separate even if they live near each other in the codebase.
A useful test: if the name contains a client, a pedagogy, a workflow, a
vertical-specific artifact, or a business process, it is probably not a core
adapter family. It may be a plugin, a client port, or app core logic.

## 2. Server-side adapter-family proposal

I would use seven reusable server-side families, with persistence/search treated
as a cross-cutting substrate rather than a vertical app helper.

| Family | Scope | Placement |
|---|---|---|
| Speech and audio IO | ASR, TTS, voices, audio format handling, streaming audio, basic segmentation | Mixed: ASR/TTS/voices are stable core; pronunciation scoring and pedagogy feedback are plugin/client-owned |
| Dialogue and turn state | Neutral chat/dialogue sessions, turn lifecycle, context trimming, tool-call transcript shape | Mixed: thin `/v1/chat` and optional `/v1/dialogue` are core; roleplay, persona, rehearsal, coaching, and scenario semantics are plugins or app-owned |
| Documents and structured extraction | Document ingestion, text extraction, chunking, summarization, schema/template extraction | Mixed: generic docs/extraction primitives are core; lesson extractors, legal matter parsers, clinical forms, and domain templates are plugin space |
| Rules and evaluation | Generic rule evaluation engine, rule-domain registry, scoring/explanation contract, evidence references | Mixed: engine and route contract are core; rule packs, rubrics, clinical/legal/compliance policy are plugin/client-owned |
| Vision and evidence extraction | OCR, image/video understanding, screenshot/form/table extraction, evidence payloads with provenance | Mixed: generic vision extraction is core; named templates and vertical validators are plugin space |
| Monitoring, investigation, and triage | Event intake, alert normalization, evidence timelines, risk signals, investigation work queues | Mostly plugin/mixed: shared evidence and investigation primitives may be core, but ScamHunters/On-My-Watch workflows should not define core |
| Planning, recommendation, and agentic execution | Plan generation, option ranking, next-best-action support, task execution traces, tool orchestration | Mixed/unclear: minimal agent/task primitives may be core; recommendation policy and domain-specific plans should remain plugin or app-owned |

I would not make `PronunCo`, `iMedisys`, `iLegalFlow`, or `ScamHunters` adapter
families. They are consumers or plugin packs that compose the above families.

I would also avoid treating storage/search as an ordinary app-like family.
There should be stable platform primitives for local persistence, search,
indexing, sync metadata, and maybe vector retrieval. But provider-specific
connectors such as GitHub, cloud storage, tenant document stores, or local disk
layouts are adapters under a persistence/search substrate. If persistence is
treated as a catch-all family, it will become a dumping ground for workflow
state that belongs to the app core.

Promotion criteria should be explicit:

- promote to stable core only when the contract is client-neutral and useful
  without app vocabulary
- keep in plugin space when it needs server-side runtime access but carries
  domain, vertical, or workflow semantics
- keep in the client when it is primarily UX, policy, sequencing, presentation,
  local state, or provider choice
- require at least a second client or a very clear platform primitive before
  expanding core

## 3. Client-side architecture proposal

Client apps should be organized around domain use cases, not raw iHN routes.
The shape I would standardize is:

1. App core

   The app core owns domain entities, workflow state, validation, sequencing,
   presentation-ready domain results, and user intent. In `PronunCo`, this is
   lesson flow, drills, teacher workflow, score presentation, and what counts as
   useful feedback. In `iLegalFlow`, it would be matters, documents, review
   stages, citations, obligations, and approvals.

2. Capability ports

   Ports should be typed interfaces in app language, but not tied to a provider
   or HTTP route. They should be narrower than "AI client" and broader than a
   single endpoint. Good port examples:

   - `SpeechRecognitionPort`
   - `SpeechSynthesisPort`
   - `SpeechFeedbackPort`
   - `DialogueTurnPort`
   - `StructuredExtractionPort`
   - `TranslationPort`
   - `RuleEvaluationPort`
   - `EvidenceSearchPort`
   - `RecommendationPort`

   It is acceptable for a `PronunCo` port to say `LessonExtractionPort`, because
   that port belongs inside `PronunCo`. It should not force iHN to expose
   `/lesson-extract` as a top-level platform concept.

3. Provider adapters

   Provider adapters implement ports against iHN, OpenAI, Azure, Alibaba, local
   runtimes, or other providers. Their job is transport, auth, capability
   detection, retries, streaming, DTO mapping, and provider-specific error
   handling. They should not own pedagogy, legal policy, medical policy, or UX
   sequencing.

   A client-side `IHNPronunCoSpeechFeedbackAdapter` may call
   `/v1/plugins/pronunco/...`; a generic `IHNSpeechRecognitionAdapter` should
   call core `/v1/transcribe-audio`. Those are different adapter responsibilities.

4. Storage/search adapters

   Storage/search should be repository-like from the app core's point of view.
   The app core should ask for lessons, matters, evidence, sessions, rubrics,
   prior attempts, or documents. Adapters can then map those to local disk,
   GitHub, iHN persistence, browser storage, cloud storage, or search indexes.

   Search deserves its own port when ranking, filters, provenance, and recall
   behavior are product-visible. It should not be hidden as incidental storage.

5. Policy/orchestration

   Each app needs a composition layer that chooses which port implementation to
   use under which conditions: privacy mode, offline mode, tenant settings,
   latency, cost, provider availability, compliance constraints, and fallback
   rules. Some server plugins may also contain policy, but client product policy
   should not disappear into an iHN adapter.

The important rule: app ports should not mirror raw route names. If a client
renames an iHN endpoint, most app core code should not notice. If a client adds
Azure as a direct provider, the app core should not be rewritten.

## 4. Pressure-test clients

The best speech-heavy pressure test is `PronunCo`, with `TelPro-Bro` as the
second check. `PronunCo` stresses ASR, TTS, voices, translation, dialogue,
lesson extraction, and feedback. But it also has unusually strong pedagogy and
drill semantics, so it should be used to test the boundary, not define it.

The best docs/rules-heavy pressure test is `iLegalFlow`. It should exercise
documents, structured extraction, rules, evidence, provenance, search, and
workflow state without making the architecture inherit clinical constraints too
early. `iMedisys` is valuable as a later regulated-domain stress test because
it will expose privacy, auditability, and stricter policy concerns.

The client most likely to mislead the architecture if treated as "normal" is
`PronunCo`. It is the most concrete current example, but its lesson/drill/score
loops can make app-owned pedagogy look like server capability. A second risk is
`On-My-Watch` or `ScamHunters`, because monitoring and triage workflows can push
the server toward event-driven product assumptions that are not needed by every
client.

## 5. Where I disagree

I would not elevate `simulation/roleplay` to a top-level server family yet. It
looks reusable, but it is probably a composition of dialogue, rules/evaluation,
planning, persona/prompt policy, and app-specific scoring. It should start as a
plugin/workflow pattern. Promote it later only if multiple clients need a shared
scenario state machine with neutral semantics.

I also disagree slightly with waiting too long before client-repo discussions.
The cross-client draft should stabilize enough to prevent each client from
inventing its own taxonomy, but it does not need to become doctrine first.
Client mirrors are how we will discover whether the draft is overfit.

The open uncertainty I would preserve is adapter thickness. Thin server
adapters give clients more control and reduce platform lock-in. Thick server
adapters centralize secrets, model routing, audit, caching, and provider
normalization. The right answer will vary by family. Speech and vision can be
thicker server-side because model/runtime access matters. Pedagogy,
recommendation policy, and workflow sequencing should stay thinner server-side.

## 6. Suggested next move

Do one synthesis pass over this round, then start two lightweight mirror
discussions before coding more client abstractions:

1. `PronunCo` as the speech/dialogue/pedagogy pressure test.
2. `iLegalFlow` as the docs/rules/evidence/search pressure test.

Those mirrors should not ask "what routes does this client need?" They should
ask:

- what belongs in app core?
- what are the client capability ports?
- which ports can be backed by iHN core today?
- which ports require `/v1/plugins/{plugin_id}/...`?
- which ports should have direct non-iHN provider adapters?
- which app terms must never leak into core?

After those two mirrors, cut coding/testing sprints around the already-settled
server boundary work: speech extraction, plugin namespace, capability registry
tiering, and eventually a thin dialogue primitive if the plugin code proves the
contract is neutral.
