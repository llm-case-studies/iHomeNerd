# Working Portfolio Inventory

**Status:** discussion input  
**Date:** 2026-05-04

This is not a final taxonomy. It is a working list of products and startups in
progress that may shape the iHN surface.

The goal is to make the portfolio visible before we decide what belongs in:

- core iHN
- adapter/plugin/helper surface
- app-owned product logic
- sibling products and deployment variants

## Reading rule

This list should not be read as "everything here must become a direct iHN
client."

Some entries are likely:

- true client apps
- sibling products sharing code or ideas
- deployment variants
- destinations or consumers of outputs rather than active API clients

That distinction is one of the main reasons this document exists.

## Working columns

- **Relationship to iHN**
  - `client` — likely a real app consuming shared iHN capabilities
  - `sibling` — likely a product sibling or branded variant rather than a
    simple client
  - `deployment` — likely a deployment/runtime variant more than an app
  - `consumer` — likely consumes outputs, reports, or events more than it
    drives interactive iHN APIs
  - `unclear` — worth discussing before we build around it

- **Likely local AI domains**
  - docs / RAG
  - rules / deterministic reasoning
  - chat / dialogue
  - ASR / TTS / voice coaching
  - OCR / vision
  - planning / scheduling
  - monitoring / event triage
  - analytics / optimization

## Portfolio list

| Product | Working relationship to iHN | End-user-facing needs | Likely local AI domains | Boundary notes |
|---|---|---|---|---|
| `On-My-Watch` | client | analyze video evidence; monitor suspicious activities for security; monitor events on farms and camps | OCR / vision, monitoring / triage, summaries, alerts | feels like a strong iHN client for vision + event summarization, but its security workflow and evidence UX should likely stay app-owned |
| `iLegalFlow` | client | pre-filing USPTO IP analysis; pre-filing IP guidance for a driving-school simulator; exhibit analysis and comparison; customs-code equivalence and routing optimization; contract wording analysis; insurance coverage analysis and gap detection | docs / RAG, rules, comparison, structured extraction, optimization | likely needs heavy rules + document reasoning; good test of what belongs in core docs/rules vs legal-specific adapters |
| `iMedisys` | client | medical coding and billing and coverage analysis; image triage and routing; medical jargon explainer; appointments/tests planner; health-coverage comparison and optimization | docs / RAG, rules, OCR / vision, planning, explanation | very likely a true client; medical workflow and regulated explanation logic should not leak into generic iHN product routes |
| `ScamHunters` / `iScamHunter` | client | potential scam analysis; attack-surface detection; prevention planning; scam comparison and history lookup; damage evaluation | docs / RAG, OCR / vision, investigation, evidence synthesis, planning | strong candidate for investigation-oriented client; app-specific evidence workflow should stay above core iHN |
| `iForeclosed` | client | auction lookup; surplus identification; service-provider analysis; lien analysis | docs / RAG, structured extraction, comparison, optimization | likely a client if pursued; could stress docs + rules + market lookup boundaries |
| `m-Beacon` | client | conversion analysis and tuning; analytics intake and analysis; marketing-domain optimization | analytics, summarization, recommendation, planning | less obviously tied to current iHN story, but useful pressure test for whether generic analytics helpers belong in core or in adapters |
| `TelPro-Bro` | client | copy/text improvement; on-the-fly suggestions for speed, intonation, wording, sentence structure; delivery coaching and drilling; charisma classification/coaching | ASR / TTS, dialogue, coaching, scoring, recordings | true client; coaching loop is app-owned, while speech, dialogue, recording, and generic scoring primitives may live below |
| `ACTCLI` | unclear | actuarial and other non-trivial-topic live discussion participation | dialogue, retrieval, reasoning, maybe rules | could be a client or a thin interface to shared reasoning tools; worth clarifying whether it is product, shell, or operator workflow |
| `WhoWhe2Wha` | consumer / client | event and activity planning help; intake and analysis; coaching; pre-planning and logistics | planning, scheduling, summarization, reminders | likely consumes deadlines/plans/events more than it needs the full iHN route surface; good test of output-oriented boundaries |
| `PronunCo` | client | drill design and evaluation across vocab/phonetics/grammar; progression planning; situational roleplay and dialogue; teacher support; class prep/activity log/evaluation/homework assessment; corporate meetings and team building; industry jargon; video/audio phonetics correction | ASR / TTS, dialogue, translation, extraction, scoring, helper transforms | canonical client; exactly the case that exposed route-boundary leakage between app logic and helper surface |
| `RoadNerd` | deployment / sibling | device and network troubleshooting; receipts and tickets intake; restaurant menu review and recorder/feedback intake; sightseeing/events/museums companion; smarter routing planner | investigate, docs / OCR, travel assistant, planning | likely not a normal client app; better treated as a separate deployment model or sibling with shared capability ideas |
| `Edge-Kite` | client / deployment | off-the-hub event-stream recorder, triage, pre-analyzer | monitoring / event triage, edge routing, pre-analysis | may be closer to a node role or deployment pattern than a user-facing client; worth clarifying before treating it as a normal app |

## First-pass portfolio observations

### Strong current or near-term client-app category

These most clearly look like real client apps that should consume shared iHN
capabilities without collapsing into iHN itself:

- `PronunCo`
- `TelPro-Bro`
- `iMedisys`
- `ScamHunters`
- `On-My-Watch`
- probably `iLegalFlow`

### Likely sibling/deployment category

These are more likely to shape the architecture than to behave like ordinary
client apps:

- `RoadNerd`
- `Edge-Kite`
- `iOfficeNerd` (from existing docs)

### Likely output-consumer / planner category

These may depend more on event, schedule, summary, or report products than on a
large direct route surface:

- `WhoWhe2Wha`
- possibly some parts of `ACTCLI`

## Why this matters for the client-surface review

If we do not separate these categories, we will end up with a muddled iHN
surface that tries to be:

- a household control plane
- a language-learning helper library
- a security investigation workbench
- a legal rules engine
- a travel node
- and a calendar/planner backend

all at the same top-level contract boundary.

That is exactly the drift this initiative should stop.

## Discussion prompts

1. Which products above are true **clients** of core iHN?
2. Which are really **siblings or deployment variants**?
3. Which end-user-facing needs recur across several clients and therefore
   justify stable iHN routes?
4. Which needs are clearly **adapter-facing** or **app-owned**?
5. Which products should be used as the primary canaries for boundary design?

