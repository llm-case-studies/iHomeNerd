# Round 2 Feedback: Adapter Families and Client Ports

## Tension 1: Is Monitoring/triage a real adapter family?

**Position: yes, but narrow it and keep it out of core for now.**

I would keep Monitoring/triage as a real server-side adapter family because the
shared structure is not just "vision + chat + rules." The recurring contract is:

- observe or ingest events
- normalize them into a common event shape
- detect candidate incidents
- prioritize severity
- route or notify
- preserve disposition/evidence state

That pattern exists across `On-My-Watch`, `Edge-Kite`, `ScamHunters`, Command
Center node health, and likely parts of `iMedisys`. The domain detectors differ,
but the event lifecycle and triage envelope are reusable.

The "no" camp is right about the failure mode: a vague monitoring family would
duplicate vision, docs, rules, and chat. The fix is to define the family by
contract shape, not by cognitive work. It should be closer to **Event Triage and
Incident Intake** than "monitoring AI." Core should not gain broad monitoring
routes yet. The family should start as plugin space, backed by existing
primitives and, later, a minimal event/subscription substrate if the code proves
the need.

## Tension 2: Should Planning/recommendation be dropped as a family?

**Position: yes, drop it as a server-side adapter family.**

I am changing my Round 1 position here. The majority argument is stronger:
planning/recommendation is mostly chat + structured output + docs + rules +
client policy. Tax planning, lesson progression, medical scheduling, legal
strategy, and scam prevention do not share enough server-side contract to justify
a reusable family.

Planning can remain a **client-side capability port** or app-core composition.
A client may expose `RecommendationPort`, `PlanDraftingPort`, or
`NextActionPort`, but those should usually be backed by existing iHN primitives
and domain rules. A server plugin may provide a specific planning workflow later,
but "planning" should not be one of the canonical platform families.

## Tension 3: Should Data/external connectors be the 7th family?

**Position: yes. Data/external connectors should be the 7th family.**

DeepSeek's connector point is the most important addition from Round 1. Too many
portfolio products need external bridges for this to be left as one-off client
code: legal databases, medical APIs, insurance data, threat feeds, property
records, analytics APIs, GitHub, cloud drives, email/calendar, and document
stores.

The reusable contract is not "storage." It is:

- configure credentials and consent
- authenticate
- query, fetch, subscribe, or import
- normalize external records
- attach provenance
- cache and rate-limit
- hand off to docs, rules, vision, persistence, or search

This should be a real adapter family, but with credential ownership made
explicit. Many connectors should live server-side under iHN for privacy,
auditing, caching, and local-first behavior. Some will need client-side
implementations when the user's OS session, mobile account, browser auth, or
per-user OAuth flow is the real authority. The common family should define the
shape; deployment decides where a specific connector runs.

## Tension 4: Provider adapters: iHN-only or multi-provider client?

**Position: Model A should be the primary architecture. Model B should remain an
explicit opt-in extension, not the default client architecture.**

Gemini's privacy-boundary objection is decisive for the platform default. iHN's
promise is not just a convenient API surface; it is the local privacy, audit,
capability discovery, model routing, and policy boundary. A normal client should
talk to iHN. iHN can then decide whether to use Ollama, MLX, local services, or
approved cloud fallback.

The client-side port model is still useful under Model A. The client app depends
on `SpeechPort`, `DocumentPort`, `RulesPort`, etc., and the first provider
adapter is `IHNAdapter`. That prevents route names from leaking into app core
without forcing client apps to hold OpenAI, Azure, or Alibaba credentials.

Model B should be designed as a later escape hatch for product-specific cases:
availability-first deployments, non-sensitive creative work, enterprise-managed
cloud credentials, or a mobile app mode where direct provider auth is required.
It should use the same ports, but it should require explicit product and privacy
approval. Do not make direct cloud providers the reference path.

## Tension 5: Should "1 family = 1 plugin_id" be the mapping rule?

**Position: reject the strict rule; accept a manifest-based family mapping.**

GLM is right that the relationship must be machine-checkable. But
"one adapter family = one plugin_id" is too rigid.

A family is a capability category or contract shape. A `plugin_id` is an
installed implementation package. Those are not the same cardinality:

- one family can have many plugins: `rules-legal`, `rules-medical`,
  `rules-tax`
- one connector family can have many plugins: `connector-github`,
  `connector-uspto`, `connector-insurance`
- one app plugin can compose several families: a `pronunco` plugin may use
  speech, dialogue, docs, translation, and evaluation
- some families have core routers plus plugin packs, such as vision templates or
  rule domains

The better rule:

- every plugin declares one primary `family_id` in its manifest
- plugins may declare secondary family dependencies
- `/capabilities` exposes core capabilities, plugin capabilities, and family
  tags
- route ownership remains `/v1/plugins/{plugin_id}/...`

This keeps the mapping explicit without forcing false namespace symmetry.

## Tension 6: When should client-mirror discussions start?

**Position: parallel discussions, sequential implementation.**

Start the `PronunCo` mirror now, plus one non-speech mirror, preferably
`iLegalFlow` or `iMedisys`. Waiting for a perfect cross-client draft risks
stabilizing something elegant but ungrounded. Kimi and Qwen are right that the
draft needs real client pressure before it becomes doctrine.

DeepSeek is also right about the implementation gap: current clients do not have
capability ports. So the mirrors should be discussion/spec mirrors first, not
client refactor sprints. They should map:

- app core boundaries
- 4-7 capability ports
- which ports use iHN core
- which ports need `/v1/plugins/{plugin_id}/...`
- which ports need storage/search/connectors
- which app terms must never leak into core

Do not let each client independently invent a production port framework yet. Use
the mirror results to inform a Command Center reference port and `IHNAdapter`,
then apply that reference when client code refactors start.

## Tension 7: Is policy/orchestration separate or part of app core?

**Position: separate layer, but lightweight and client-side.**

Policy/orchestration should be distinct from app core because it answers a
different question. App core says what the product is trying to do. Policy says
which adapter to use, under what privacy, latency, cost, offline, consent, or
tenant constraints.

Collapsing this into app core works for a small mobile client until fallback,
privacy filtering, offline mode, provider availability, caching, retries, or
capability discovery appear. Then the logic spreads through view models and
service call sites. A small explicit `CapabilityRouter` or composition layer is
cleaner and easier to test.

GLM's warning is still useful: do not make this a heavy enterprise bus. On
mobile it may be one file or one injected object. The important boundary is that
policy is not provider transport, not raw app workflow, and not node-global
platform policy. It is client-owned composition.

## New insight from the other responses

Qwen's "contract shape, not cognitive work" framing should become a design
guardrail. It explains why Audio I/O, Document Pipeline, Vision Extraction,
Rules Evaluation, Dialogue Sessions, Event Triage, and External Connectors are
better family names than broader labels such as "planning" or "simulation."

Gemini's privacy objection should also change the default client-provider story.
The seed's multi-provider client diagram is useful as an extensibility model,
but iHN should remain the normal provider boundary.

DeepSeek's implementation dependency chain is the main sequencing constraint:
plugin registration, capability advertisement, client ports, policy routing,
then secondary providers. The architecture should not pretend those layers can
be implemented independently.

GLM's namespace mapping proposal is valuable even though I would not accept it
literally. We do need a manifest field that makes family ownership and
capability advertisement inspectable.

## Open questions to preserve into coding sprints

1. **Connector credential ownership:** for each connector, do credentials live
   on the iHN node, in the client app, or in both modes? This affects privacy,
   OAuth UX, audit logs, sync, and whether a connector can run offline.

2. **Minimum event substrate for Monitoring/triage:** can the first monitoring
   plugin compose existing scan/vision/rules routes, or does it require a small
   core event stream, scheduler, and incident/disposition model before it is
   useful?

These should survive into coding briefs without reopening the settled route
surface decisions.
