# Client Surface Boundary Review - Codex Round 1

## Reviewer

- Name / model: Codex
- Date: 2026-05-04

## High-level stance

The 3-layer model is workable and necessary: `core iHN`, `adapter/plugin`, and
`app-owned` is the right first cut. The most important correction I would make
is to avoid treating every non-core thing as an app helper. Some surfaces are
deployment/node-role surfaces: Android node, RoadNerd-style mobile node,
Edge-Kite recorder, Mac brain installer, and iOfficeNerd-like variants may
share runtime contracts without being ordinary client apps.

My main concern is route inflation through usefulness. If a helper made one
app spike easier, that is evidence that a capability exists, not evidence that
the helper deserves stable top-level iHN route status.

The core surface should be boring, durable, and app-agnostic. The richer product
behavior should happen in clients, plugins, or deployment-specific packs.

## Route and capability review

| Item | Classification | Reason |
|---|---|---|
| `/health` | core | Every client, node, validator, and operator needs a stable readiness signal. |
| `/discover` | core | Discovery is part of the household/node contract, not app-specific behavior. |
| `/capabilities` | core | The contract should say what this node can do, but not bless every helper as public route. |
| `/sessions` | core, with naming caution | Core if it means generic iHN interaction/session state; app lesson/coaching sessions must stay app-owned or namespaced. |
| `/system/stats` | core | Node operation, capacity, and diagnostics are first-party iHN concerns. |
| `/setup/*` | core | Trust/bootstrap/promotion are iHN product concerns. |
| `/v1/chat` | core | Shared substrate for many clients; must remain generic and not absorb app persona/workflow semantics. |
| `/v1/translate` | core or adapter/plugin | General translation can be core, but lesson-aware or pedagogy-aware translation should be plugin/app-owned. Preserve this split. |
| `/v1/transcribe-audio` | core | ASR is a reusable local capability across PronunCo, TelPro-Bro, evidence workflows, and notes. |
| `/v1/synthesize-speech` | core | TTS is a reusable primitive, especially for language, coaching, and accessibility-like flows. |
| `/v1/voices` | core | Voice inventory is analogous to model inventory for TTS. |
| `/v1/models` | core | Model inventory/load status is infrastructure. Model selector UX stays client-owned. |
| `compare_pinyin` | adapter/plugin | Useful PronunCo/language helper, but too domain-specific for core. |
| `normalize_pinyin` | internal only or adapter/plugin | Likely a helper beneath a language plugin; public route status would be route-boundary leakage. |
| `extract_lesson_items` | adapter/plugin | Extraction is generic; lesson schema and pedagogy are not. This belongs behind a language/PronunCo adapter. |
| `generate_drill` | app-owned or adapter/plugin | Drill choice encodes pedagogy and product opinion; if exposed, namespace it under a learning plugin. |
| `explain_score` | adapter/plugin | Score explanation is reusable in shape but score semantics are domain-specific. Do not put it in core. |
| `chat_persona` | adapter/plugin | Core can provide bounded chat/session primitives; persona definitions and roleplay semantics belong above core. |

## Leakage and confusion

The riskiest leak is promoting domain vocabulary into stable routes. Pinyin,
lesson, drill, score, persona, tax tier, coverage gap, scam case, and coaching
loop are all product words. They may use iHN heavily, but they should not become
top-level iHN nouns.

The second leak is capability advertising. `/capabilities` should be allowed to
say a plugin exists, but that should not imply the plugin has a stable public
route. A capability can be internal, plugin-local, experimental, or app-bound.

The third leak is the word `sessions`. It is probably core, but only if defined
as iHN-level interaction/runtime session. PronunCo lesson sessions, TelPro-Bro
practice sessions, and medical case sessions should not be silently folded into
the same contract.

Names/routes I would change or constrain:

- keep app helpers out of `/v1/*` unless they are generic primitives
- use explicit namespaces for optional helpers, for example `/plugins/pronunco/*`
  or `/adapters/language-learning/*`
- avoid generic-sounding names for domain semantics, such as `explain_score`
  without saying whose score, what rubric, and what evidence

## Minimal contract for client apps

The smallest stable public iHN surface a serious client app needs is:

- trust and node access: `/discover`, `/health`, `/setup/*`
- capability inspection: `/capabilities`, `/v1/models`, voice/model metadata
- generic AI substrate: `/v1/chat`, translation, ASR, TTS
- generic storage/retrieval where applicable: document ingest/query, recordings
  or artifact references if those are part of core
- generic session handles if the client needs continuity across devices

Apps should own:

- product workflow and screen sequence
- pedagogy, coaching, scoring rubrics, and drill choice
- domain rule packs and domain-specific explanation language
- business-specific optimization logic
- presentation state and cached UI decisions

Adapters/plugins should own:

- domain transforms from app state into core requests
- scoring/explanation bridges
- rule-pack binding
- schema normalization for tax, medical, legal, pronunciation, coaching, or
  investigation data

## Product classification recommendations

1. Treat `PronunCo` and `TelPro-Bro` as canary clients, not as route-design
   owners. They should pressure-test ASR/TTS/dialogue/session primitives while
   keeping pedagogy and coaching loops above core.

2. Treat `RoadNerd` and `Edge-Kite` primarily as deployment/node-role pressure
   tests. Their needs should shape discovery, offline behavior, event capture,
   and node capabilities, but they should not automatically create client-app
   routes in iHN core.

3. Treat `WhoWhe2Wha` and `Crypto-Fakes` as output consumers until proven
   otherwise. They may consume summaries, deadlines, reports, timelines, or
   investigation outputs more than they drive stable interactive iHN APIs.

4. Treat `iMedisys`, `iLegalFlow`, and `iForeclosed` as true clients with heavy
   adapter/rule needs. Core should expose document, rule-execution substrate,
   and explanation primitives; domain decision routes should stay plugin-owned.

## Disagreement / uncertainty to preserve

I would not settle the roleplay/simulation boundary yet. Several products need
roleplay, coaching, or scenario dialogue, and making every client hand-roll
that will create duplicate orchestration. But a route like `/v1/roleplay` could
also become a dumping ground for app semantics.

The likely split is:

- core: bounded dialogue/session primitive with constraints, turn history,
  model, voice, and artifact references
- adapter/plugin: scenario schema, rubrics, personas, scoring, retry policy
- app-owned: UX loop, goals, progression, and product-specific coaching

That split should be validated against PronunCo, TelPro-Bro, and ACTCLI before
being hardened.

## Recommendations

Top 3 conceptual changes:

1. Add a fourth visible bucket: `deployment/node-role surface`. This prevents
   RoadNerd, Edge-Kite, Android node, and Mac brain installer concerns from
   being mislabeled as client app APIs.

2. Define `/capabilities` as descriptive inventory, not public-route blessing.
   Capability entries should carry stability and namespace metadata.

3. Make stable core route admission require cross-client meaning. If the route
   only makes sense in one app's nouns, default it to adapter/plugin or
   app-owned.

Top 3 cleanup actions for later sprints:

1. Produce a route inventory that labels each route as `core`,
   `adapter/plugin`, `app-owned bridge`, `internal`, or `experimental`, with a
   namespace decision.

2. Rename or namespace PronunCo/language helpers so pinyin, lesson, drill, and
   score semantics cannot be mistaken for stable iHN core.

3. Clarify the `/sessions` contract before more clients use it: separate iHN
   runtime sessions from app-specific lesson/practice/case sessions.

## Candidate follow-on sprint

`uniform-web-ui-route-inventory-and-namespace-map`: no feature behavior change;
create the first audited route/capability map from current backend routes and
frontend usage, then classify each item against the boundary model.
