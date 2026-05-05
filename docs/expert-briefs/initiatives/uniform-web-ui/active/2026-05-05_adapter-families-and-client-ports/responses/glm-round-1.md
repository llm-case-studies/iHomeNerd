# Feedback: Adapter Families and Client Ports (Round 1)

## Reviewer

- Name / model: glm-5.1
- Date: 2026-05-05

## 1. High-level reaction

### What feels right

The corrective framing is the strongest part of this seed. Moving from client names to need categories is exactly the right next step after the boundary review. The prior sprint cleaned up the route surface; this sprint asks the harder question: what are the recurring capability shapes that sit *between* core iHN and app-owned logic? That is the right question.

The client-side port/adapter model is also directionally correct. The PronunCo example (app core → capability ports → provider adapters → storage adapters) is a clean decomposition that would prevent the direct-binding problem the seed warns about.

### What feels overfit

The seed proposes 6 server-side adapter families (speech, docs/rules, vision/evidence, monitoring/triage, planning/recommendation, simulation/roleplay). I think 6 is about right in number, but two of them are overfit to the current client portfolio rather than to recurring need shapes:

- **Monitoring/triage** — this is a deployment-mode concern, not a capability family. On-My-Watch and Edge-Kite want monitoring, but what they actually consume from iHN is perception (vision, detection) plus summarization plus alert routing. "Monitoring/triage" is an app-level orchestration of those primitives, not a server-side adapter family. If we enshrine it as a family, we'll end up with monitoring-specific routes that duplicate what perception + summarization already provide.

- **Planning/recommendation** — this is too broad to be a single family. Tax planning, medical appointment scheduling, and scam prevention planning share almost no structural logic. They all reduce to "chat + structured output + domain rules." A "planning" adapter family would become a dumping ground.

### What feels underfit

The seed says very little about **how adapter families relate to the plugin namespace** established in the prior sprint. We decided on `/v1/plugins/{plugin_id}/...`. Are adapter families plugin packs? Are they domain routers? Can a single plugin belong to multiple families? This mapping is missing and it matters, because without it the adapter families are just labels on a whiteboard.

The seed also under-specifies the **contract between client-side ports and server-side adapter families**. The PronunCo example lists `DialogueService` as a capability port, but it doesn't say what that port's interface looks like or how it maps to the server-side simulation/roleplay family. Without that mapping, "port" and "adapter family" are parallel taxonomies that may or may not align.

### What feels blurry

The boundary between "server-side adapter family" and "core domain router" is still blurry. The prior sprint decided that speech belongs in `domains/speech.py` (core), but the seed lists "speech" as a server-side adapter family. Is speech a core domain or an adapter family? It can't be both without some clarification. My read: speech *primitives* (ASR, TTS, voices) are core. Speech *adapters* (pronunciation comparison, phonetic normalization) sit in a language adapter pack under `/v1/plugins/lang/...`. The adapter family is the pack, not the core router.

## 2. Server-side adapter-family proposal

My preferred families:

### 1. Language and speech adapters

- **Home:** installable plugin space (`/v1/plugins/lang/...`)
- **Scope:** domain-specific transforms bridging core speech/language primitives to app-level language needs
- **Examples:** pinyin normalization, phonetic comparison, translation post-processing, language-detection tagging, subtitle alignment
- **Core dependency:** `/v1/transcribe-audio`, `/v1/synthesize-speech`, `/v1/voices`, `/v1/translate`
- **Pressure-test clients:** PronunCo, TelPro-Bro

This family sits above the core speech domain router. It does not redefine ASR or TTS; it wraps them with domain transforms. The key distinction from the seed: speech primitives are core; language adapters are plugin.

### 2. Document and rules adapters

- **Home:** mixed. `/v1/docs/*` and `/v1/rules/evaluate` are core. Domain-specific rule packs and document schemas are installable plugin space.
- **Scope:** domain-specific rule sets (medical coding, tax compliance, legal procedure), domain-specific document schemas (invoice, medical bill, tax form, contract clause)
- **Examples:** iMedisys coding rules, iLegalFlow IP filing rules, tax-form extraction schemas
- **Core dependency:** `/v1/docs/*`, `/v1/rules/evaluate`, `/v1/vision/extract/{template}`
- **Pressure-test clients:** iMedisys, iLegalFlow, iForeclosed

The engine is core; the packs are adapters. This directly maps to the prior sprint's conclusion.

### 3. Vision and evidence adapters

- **Home:** mixed. `/v1/vision/*` is core. Evidence-specific extraction templates and analysis workflows are installable plugin space.
- **Scope:** specialized extraction templates, evidence chain helpers, image classification adapters
- **Examples:** receipt template, medical bill template, scam evidence template, surveillance event classifier
- **Core dependency:** `/v1/vision/ocr`, `/v1/vision/extract/{template}`, `/v1/vision/analyze`
- **Pressure-test clients:** On-My-Watch, ScamHunters, RoadNerd

The vision router already supports named templates. Adapter packs can register new templates and post-processing logic without modifying core.

### 4. Dialogue and simulation adapters

- **Home:** installable plugin space (`/v1/plugins/dialogue/...`)
- **Scope:** scenario scaffolding, persona management, turn-scoring, session constraints
- **Examples:** pronunciation-scenario adapter, coaching-session adapter, legal-deposition adapter, scam-interrogation adapter
- **Core dependency:** `/v1/chat`, `/v1/dialogue/sessions` (if adopted), `/v1/sessions`
- **Pressure-test clients:** PronunCo, TelPro-Bro, ACTCLI, iLegalFlow

This is the family I am least confident about. The prior sprint barely resolved whether bounded dialogue is core. If it is core, then dialogue adapters wrap it the same way language adapters wrap speech. If it stays plugin, then dialogue adapters *are* the dialogue surface. I lean toward the former (core dialogue primitive + adapter packs), but the contract sketch matters more than the classification.

### 5. Evaluation and explanation adapters

- **Home:** installable plugin space (`/v1/plugins/eval/...`)
- **Scope:** domain-specific scoring rubrics, explanation patterns, comparison frameworks
- **Examples:** pronunciation scoring, delivery quality scoring, coverage gap analysis, legal risk assessment, scam severity classification
- **Core dependency:** `/v1/chat`, `/v1/translate`, domain-specific adapter outputs
- **Pressure-test clients:** PronunCo, TelPro-Bro, iMedisys, iLegalFlow

This replaces the misleading `explain_score` with a proper family. The shared pattern is: "compare an input against a reference, produce a structured explanation of the gap." But what "reference" and "gap" mean is fully domain-specific. The adapter provides the rubric; core provides the chat/summarize/explain substrate.

### 6. Persistence and storage adapters

- **Home:** mixed. `/v1/persistence/*` is core infrastructure. App-specific data schemas are installable plugin space.
- **Scope:** profile-aware storage, app-specific data models, sync patterns
- **Examples:** PronunCo learner profiles, TelPro-Bro recording metadata, medical case records
- **Core dependency:** `/v1/persistence/*`
- **Pressure-test clients:** all clients

This family was implicit in the prior sprint but never named. It deserves explicit recognition because the persistence contract is the one every client app depends on most directly.

### Families I rejected

- **Monitoring/triage** — not a server-side adapter family. It is an app-level orchestration of perception + summarization + alerts. The server-side primitives are already covered by vision, docs, and chat. A monitoring-specific family would create parallel routes.
- **Planning/recommendation** — too broad. Domain-specific planning (tax, medical, logistics) is covered by docs/rules adapters + dialogue adapters. A planning family would become a "misc" category.
- **Coaching/correction** — this is an app-level workflow (evaluate → explain → prescribe → retry), not a server-side family. The server-side components are evaluation adapters + dialogue adapters + speech adapters. The coaching loop is app-owned orchestration.

## 3. Client-side architecture proposal

I would split each client app into four layers, not five. The seed's "policy/orchestration layer" is not a separate layer; it is the app core's job.

### Layer 1: App core

Owns the product narrative. This is what makes PronunCo different from TelPro-Bro.

- UX flow and screen sequences
- Pedagogy, coaching logic, domain workflow
- Score presentation, lesson progression, drill choice
- All product opinions

### Layer 2: Capability ports

Stable interfaces that the app core calls. Each port abstracts a capability the app needs without binding to a specific provider.

A port is defined by its interface, not its implementation. Example:

```
SpeechFeedbackPort:
  transcribe(audio) -> text
  compare_phonetics(expected, actual) -> comparison_result
  explain_gap(comparison_result) -> explanation
```

The app core never calls `/v1/transcribe-audio` directly. It calls the port. The port's implementation decides whether to use iHN, Azure, or a local fallback.

Ports should be:
- **few** — 4-7 per app, not 20
- **stable** — the interface changes less often than the provider
- **testable** — mockable without hitting any server

### Layer 3: Provider adapters

Implementations of capability ports against specific backends.

```
IHNSpeechAdapter implements SpeechFeedbackPort:
  transcribe(audio) -> calls /v1/transcribe-audio
  compare_phonetics(expected, actual) -> calls /v1/plugins/lang/compare-pinyin
  explain_gap(comparison_result) -> calls /v1/chat with structured prompt

AzureSpeechAdapter implements SpeechFeedbackPort:
  transcribe(audio) -> calls Azure Speech API
  compare_phonetics(expected, actual) -> calls Azure pronunciation assessment
  explain_gap(comparison_result) -> calls Azure OpenAI with structured prompt
```

The adapter translates between the port's domain vocabulary and the provider's API. It handles authentication, retry, fallback, and provider-specific error mapping.

### Layer 4: Storage/search adapters

Implementations of storage and search against specific backends.

```
IHNPersistenceAdapter:
  save(profile) -> calls /v1/persistence/...
  query(filters) -> calls /v1/persistence/...

LocalDiskAdapter:
  save(profile) -> writes to local filesystem
  query(filters) -> reads from local index
```

These are separate from provider adapters because the storage contract is fundamentally different from the capability contract. Storage is about data lifecycle; capabilities are about computation.

### Why I collapsed policy/orchestration into app core

The seed lists policy/orchestration as a fifth layer. I think this is a mistake. Policy decisions (which provider to use, when to fall back, how to handle cost limits) are made by the app core. They are not a separate layer. If you separate them, you create a weird indirection where the app core delegates to an orchestration layer that delegates to ports that delegate to adapters. That is too many layers for a mobile client. The app core *is* the orchestrator.

### What PronunCo teaches and what it doesn't

**PronunCo teaches:**
- The port/adapter pattern works for speech-heavy clients
- A small number of capability ports (4-7) can cover most of what a complex app needs
- Storage and capability need separate adapters
- The app core can swap providers by swapping adapter implementations

**PronunCo does NOT teach:**
- How docs/rules-heavy clients should work (PronunCo barely uses docs or rules)
- How monitoring/triage clients should work (PronunCo has no monitoring loop)
- How to handle clients that need multiple adapter families simultaneously

For the non-speech clients, the best prototype is **iMedisys**, because it simultaneously uses docs/rules, vision, and evaluation adapters. It is the pressure test that will reveal whether the family boundaries hold up.

## 4. Pressure-test clients

### Best speech-heavy pressure test: TelPro-Bro, not PronunCo

PronunCo is the obvious choice, but TelPro-Bro is a better pressure test because it uses speech primitives *without* the language-adapter family. TelPro-Bro wants ASR + TTS + coaching evaluation but has no need for pinyin normalization or phonetic comparison. If the speech adapter family only makes sense when language adapters are also loaded, it's too tightly coupled to PronunCo. Testing with TelPro-Bro verifies that speech primitives stand on their own.

### Best docs/rules-heavy pressure test: iMedisys, not iLegalFlow

iLegalFlow is tempting because it's the most complex rules client, but iMedisys is a better pressure test because it crosses three families simultaneously: docs/rules, vision (medical bill OCR), and evaluation (coverage gap analysis). If the families work for iMedisys, they'll work for iLegalFlow. If they only work for iLegalFlow in isolation, they're probably overfit to legal.

### Client most likely to mislead: On-My-Watch

On-My-Watch looks like a normal client (vision + summarization + alerts), but its real-time monitoring loop and evidence-chain requirements are genuinely different from other clients. If we design the vision/evidence adapter family around On-My-Watch's evidence-chain semantics, we'll overfit to security/investigation. On-My-Watch should be a late pressure test, not an early one.

## 5. Where I disagree

### Disagreement 1: The seed's adapter families are tilted toward the speech side

The 6 families in the seed (speech, docs/rules, vision, monitoring, planning, simulation) include 3 that are primarily speech-adjacent (speech, simulation/roleplay, planning/recommendation as currently framed). This is PronunCo overfit in a new guise. My proposed families (language/speech, docs/rules, vision/evidence, dialogue/simulation, evaluation/explanation, persistence) are more evenly distributed and give equal weight to non-speech domains.

### Disagreement 2: How adapter families relate to the plugin namespace

The seed is silent on this. I think the mapping should be:

- **One adapter family = one plugin pack = one plugin_id in the namespace**

So `/v1/plugins/lang/compare-pinyin` belongs to the `lang` adapter family, which is loaded as a single plugin pack. `/v1/plugins/medical/coding-rules` belongs to the `medical` adapter family. This makes the relationship between families and the namespace explicit and machine-checkable.

The alternative (multiple families per pack, or one family across multiple packs) creates ambiguity about who owns what.

### Uncertainty worth preserving: Should dialogue adapters be a separate family or part of the language/speech family?

Dialogue/simulation adapters could logically merge with language/speech adapters (they both deal with conversational interaction). But they could also stand alone because dialogue adapters serve non-speech clients (iLegalFlow, ACTCLI). I've proposed them as a separate family, but I'm not fully confident. The right answer may depend on whether the core dialogue primitive is adopted. If it is, dialogue adapters are a clean separate family. If it isn't, dialogue adapters collapse back into app-owned orchestration, and the family doesn't exist server-side at all.

## 6. Suggested next move

**Mirror the discussion into PronunCo first, then iMedisys.**

The seed proposes mirroring into PronunCo and one non-speech client. I agree with the sequence, but I'd pick iMedisys as the second mirror specifically because it crosses three adapter families. If the port/adapter model works for iMedisys, it's robust. If it only works for PronunCo, it's overfit.

I would **not** start coding yet. The adapter-family-to-plugin-namespace mapping is still unresolved. One more discussion round (after the client mirrors) should produce enough concrete port/adapter interface sketches to cut a focused coding sprint.

Proposed sequence:
1. This discussion round → stabilize adapter families and client-side model
2. Mirror into PronunCo repo → refine speech/language port interfaces
3. Mirror into iMedisys repo → refine docs/rules/vision/eval port interfaces
4. Compare mirrors → find where the port/adapter model diverges
5. Then cut a coding sprint: implement the `lang` adapter pack as the first concrete plugin family, and verify PronunCo works through ports instead of direct route calls
