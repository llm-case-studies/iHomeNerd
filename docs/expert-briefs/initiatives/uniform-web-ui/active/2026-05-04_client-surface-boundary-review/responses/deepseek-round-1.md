# Feedback: Client Surface Boundary Review

## Reviewer

- **Name / model:** DeepSeek-v4-pro
- **Date:** 2026-05-04

## High-level stance

The 3-layer model (core iHN / adapter-plugin / app-owned) is workable as a
conceptual frame, but the current routing architecture sabotages it in
practice. The problem is not just which routes exist — it is that **the flat
`/v1/` namespace, shared indiscriminately between domain routers and plugins,
makes the boundary invisible at the URL level.** A consumer of the API cannot
tell from route shape alone whether `/v1/transcribe-audio` is a core promise
or a PronunCo artifact.

The seed document correctly identifies the drift risk: household control plane
+ language-learning helper library + security workbench + legal rules engine all
sharing the same top-level contract boundary. But the seed underplays the
**routing architecture problem** relative to the taxonomy problem. Fixing the
taxonomy without fixing the routing will leave the boundary fragile.

My overall view: the boundary problem is real and urgent, the need-ladder tool
is useful, and the portfolio working list is an excellent pressure test. The
primary category mistake in the current framing is treating route *classification*
as separable from route *architecture*.

## Route and capability review

Note: this review is grounded in the actual codebase at
`backend/app/main.py`, `backend/app/domains/`, `backend/app/plugins/`, and
`backend/app/capabilities.py`. Several routes are classified differently from
the seed because their current placement in the codebase doesn't match their
product role.

### Currently active routes

- `/health` — **core**. Uncontroversial. LLM status, model map, provider info.
  Already lives in `main.py` top-level routes. No leak.

- `/discover` — **core**. Brain identity, hostname, capabilities, models.
  Clean. The `/discover/peers` sub-route is also core.

- `/capabilities` — **core**. Flat boolean capability map plus `_detail`.
  However: this endpoint has structural leakage. The capability registry
  (`capabilities.py`) mixes core capabilities (`chat`, `translate`,
  `summarize`) with app-specific ones (`extract_lesson_items`,
  `generate_drill`, `explain_score`, `score_pronunciation`) in a flat
  namespace. A client app querying `/capabilities` cannot distinguish between
  "iHN will always provide this" and "this works only because the PronunCo
  plugin happens to be loaded." **Recommend splitting capability advertisement
  into core capabilities and plugin capabilities** within the response or
  at route level.

- `/sessions` — **core**. Lists active sessions, accepts optional `app_filter`.
  Appropriate as core infrastructure.

- `/system/stats` — **core**. Uptime, sessions, storage, connected apps.
  Uncontroversial.

- `/setup/*` — **core**. Certificate trust, profile installation, extension
  delivery. This is bootstrap infrastructure for the node itself. It is not
  app-specific, and it exists on both the HTTPS (17777) and HTTP setup (17778)
  servers. Core.

- `/v1/chat` — **core**. Defined in `domains/language.py`. Multi-turn chat is
  the most cross-cutting capability in the portfolio. Every client app listed
  in the working list consumes chat. This is canonical core.

- `/v1/translate` — **core**. Same domain file. Translation is needed by
  PronunCo, and potentially by iLegalFlow (multi-language contracts) and
  iMedisys (multi-language medical records). Broad portfolio demand.

- `/v1/summarize` — **core**. Summarization is a utility across 8+ products.
  No leak.

- `/v1/transcribe-audio` — **core**, but **currently misplaced**. ASR is
  needed by PronunCo, TelPro-Bro, On-My-Watch (audio evidence), and potentially
  iMedisys (dictation). Five products want this. Yet it is currently defined in
  `plugins/pronunco.py:352` — a plugin file that also contains
  `lesson-extract` and `dialogue-session`. This is the single clearest example
  of route-boundary leakage in the current codebase. **Recommend extracting
  into `domains/speech.py` as a core domain router.**

- `/v1/synthesize-speech` — **core**, but **currently misplaced**. Same
  argument as transcribe-audio. TTS is needed by PronunCo, TelPro-Bro, and
  potentially iMedisys (reading results aloud). Defined in
  `plugins/pronunco.py:387`. **Should move to `domains/speech.py`.**

- `/v1/voices` — **core**, but **currently misplaced**. Voice list is
  infrastructure metadata. Defined in `plugins/pronunco.py:427`. **Should move
  to `domains/speech.py`.**

- `/v1/lesson-extract` — **adapter/plugin**. This is PronunCo-specific
  pedagogy: extracting lesson items from teacher material. It makes no sense
  outside a language-learning context. Currently lives in
  `plugins/pronunco.py:134` — the right home in principle, though the route
  should move under a plugin namespace prefix (see recommendations).

- `/v1/dialogue-session` / `/v1/dialogue-turn` — **unsure / borderline**.
  Currently in `plugins/pronunco.py:230-344`. The seed document lists
  simulation/roleplay as an open question (tension #3). My take: **a generic
  bounded-dialogue primitive belongs in core.** The current implementation is
  PronunCo-specific in its scenario-rehearsal framing, but the underlying
  primitive (manage a session, advance turns, maintain context window) is
  needed by TelPro-Bro (roleplay coaching), iLegalFlow (deposition rehearsal,
  argument practice), ScamHunters (scenario simulation), ACTCLI (live
  discussion), and m-Beacon (conversational what-if). Six products. That argues
  for a core primitive.

  **The tension worth preserving:** The current implementation's scenario
  semantics (rehearsal scenario, learning context) are too tightly coupled to
  PronunCo. If we extract a core dialogue primitive, the scenario/persona
  layer must stay in adapter/plugin space. Core provides only turn-taking,
  context management, and token tracking — not "pronunciation scenario" or
  "sales roleplay."

  My classification: extract a **core** `/v1/dialogue` with minimal semantics
  (session create, turn add, session get, session delete). Move
  scenario-rehearsal, persona assignment, and PronunCo-specific pedagogy
  into a plugin wrapper that calls the core dialogue primitive underneath.

- `/v1/score-explain` — **adapter/plugin**. Currently a stub (501) in
  `plugins/pronunco.py:436`. Score explanation is deeply app-specific: a
  pronunciation score means something fundamentally different from a tax-risk
  score or a charisma score. What's "good" or "bad" is defined by the app's
  rubric, not by iHN. Generic scoring infrastructure might merit a helper
  contract, but the explanation itself is app-owned.

- `/v1/drill-generate` — **adapter/plugin**. Stub (501) in
  `plugins/pronunco.py:442`. Drill generation is PronunCo pedagogy. It has no
  plausible generalization to other apps. Plugin space is correct.

- `/v1/image-extract` — **adapter/plugin** (stub, 501). Lesson-image
  extraction is PronunCo-specific. Vision capabilities are already served by
  `/v1/vision/ocr` and `/v1/vision/extract/{template}`. This route is
  redundant and should be deleted or absorbed into the vision router.

### Currently active domain routers (not in seed item list)

- `/v1/docs/*` — **core**. Document ingestion, RAG query, collection
  management. Needed by iLegalFlow, iMedisys, ScamHunters, Tax copilot,
  iForeclosed. Strong cross-portfolio demand.

- `/v1/investigate/*` — **core**. Environment discovery, intelligence scans.
  This is node infrastructure, not app-specific. Used by the web command
  center and On-My-Watch.

- `/v1/control/*` — **core**. Node control plane: preflight, promote, manage
  SSH-managed nodes. Household/Home infrastructure. Core.

- `/v1/agents/*` — **core**. Agent listing and task delegation. General
  infrastructure. Core.

- `/v1/builder/*` — **core**. Image building. Node infrastructure. Core.

- `/v1/rules/*` — **core**, with a caveat. The rules engine (`domains/rules_router.py`)
  provides domain-agnostic rule evaluation, rule domain listing, and validation.
  This is general infrastructure: `POST /v1/rules/evaluate` takes `{domain, facts}`
  and evaluates the named rule set. The **engine** belongs in core.

  **The caveat/tension:** Domain-specific rule *packs* (medical coding rules,
  legal compliance rules, tax rules, foreclosure rules) should be authored and
  maintained in adapter/plugin space. Core provides the evaluator and the
  domains listing; adapters provide the .yaml rule files loaded from
  `rules/domain/`. The current architecture (`rules/domain/` directory with
  flat file storage) is acceptable for now but needs to distinguish
  core-shipped domains from plugin-shipped domains.

- `/v1/vision/*` — **core**. OCR, structured extraction via named templates
  (receipt, invoice, dish, medical_bill, tax_form, screenshot), image
  analysis. This serves On-My-Watch, iMedisys, ScamHunters, RoadNerd, Kitchen,
  Tax copilot, iForeclosed — at least 7 products. Core.

- `/v1/persistence/*` — **core**. Generic app storage with profile-aware
  resources. Core infrastructure.

### PronunCo persistence routes

- `/v1/pronunco/*` — **adapter/plugin**. Profiles, decks, practice journal,
  weak spots, tutor notes, groups. This is 19 routes under
  `plugins/pronunco_persistence.py` implementing learner-specific
  data management. App-specific data schemas belong in plugin space. **The
  namespacing here (`/v1/pronunco/...`) is actually correct** — this is the
  pattern the rest of the plugin surface should follow.

### Non-existent routes mentioned in seed

- `compare_pinyin` — **does not exist in codebase**. The seed uses it as a
  hypothetical example of a route that should not be promoted. This is a good
  example but a straw man. The seed should spend more energy on routes that
  *actually* exist and are misplaced.

- `normalize_pinyin` — **does not exist in codebase**. Same as above.

- `chat_persona` — **capability only** (`capabilities.py:48`), **no dedicated
  route**. Resolves model-tier selection for persona chat but has no distinct
  endpoint. Persona behavior is folded into `/v1/chat` and
  `/v1/dialogue-session`. I classify this as **adapter/plugin**: persona
  assignment (teacher persona, coach persona, peer persona) is app-specific
  prompt engineering, not a core primitive.

- `/v1/models` — **does not exist as a public route**. The seed lists it as a
  "strong candidate" for core. I agree it should exist. Model inventory
  is currently accessible only as a sub-field of `/health` and `/capabilities`,
  which is awkward for client apps that want to query model availability
  without also fetching uptime and boolean feature flags. **Recommend creating
  `/v1/models` as a standalone core route**, returning only model metadata
  (id, name, provider, specialty, context_window, quantization info).
  `mlx-chat-wrapper` and the Android app both reference `/v1/models` when
  talking to local MLX sidecar — having it as a standalone endpoint would
  normalize this across platforms.

### Capability registry entries (not routes, but worth classifying)

- `extract_lesson_items` — **adapter/plugin**. Capability advertised by
  PronunCo. Should be namespaced as a plugin capability.
- `chat_persona` — **adapter/plugin**. Persona management is app-specific.
- `generate_drill` — **adapter/plugin**. PronunCo pedagogy.
- `explain_score` — **adapter/plugin**. App-specific score semantics.
- `score_pronunciation` — **adapter/plugin**. PronunCo domain.
- `extract_structured` — **core**. This is the vision router's structured
  extraction capability. Cross-app.
- `summarize`, `chat`, `translate` — **core**. Uncontroversial.

## Leakage and confusion

### Concrete leakage

1. **ASR/TTS routes defined in PronunCo plugin file**
   (`plugins/pronunco.py:352-433`). `/v1/transcribe-audio`,
   `/v1/synthesize-speech`, `/v1/voices` are general AI infrastructure used by
   5+ portfolio products. Their physical location inside a PronunCo plugin
   file signals ownership by one app and makes it hard to see that these
   should be core promises. This is the highest-priority leakage to fix.

2. **`/v1/dialogue-session` and `/v1/dialogue-turn` names leak PronunCo
   framing.** "Session" and "turn" are generic enough, but the surrounding
   scenario-rehearsal context in the implementation makes these routes
   PronunCo-specific in practice. If dialogue is core (and I argue it should
   be), the core surface should expose neutral primitives:
   `/v1/dialogue/sessions`, `/v1/dialogue/sessions/{id}/turns`.

3. **`/v1/lesson-extract` and `/v1/drill-generate` sit in the flat `/v1/`
   namespace alongside core routes.** A client app scanning the API surface
   cannot distinguish these from `/v1/chat` or `/v1/translate` without
   reading documentation. This is the "top-level contract boundary" problem
   the seed warns about, already happening.

4. **`/v1/image-extract` (stub) duplicates `/v1/vision/extract/{template}`.**
   Teaching-content image extraction is a special case of structured
   extraction. This route should be deleted and replaced with a template
   (`lesson_image`) under the vision router, or moved into a PronunCo plugin
   namespace.

5. **Capability registry flatness.** `capabilities.py` advertises
   `extract_lesson_items`, `generate_drill`, `explain_score`, and
   `score_pronunciation` in the same namespace as `chat`, `translate`, and
   `summarize`. There is no distinction between "iHN core capabilities" and
   "loaded plugin capabilities." A client filtering by capability can't
   reason about what's guaranteed versus what's conditional.

### False product-level helpers

- `explain_score` (capability, stub route) — sounds like a general analytics
  feature. In practice it's PronunCo score pedagogy. The name leaks the
  product concept.
- `chat_persona` (capability only) — sounds like a routing concern or identity
  management feature. In practice it's prompt-engineering model tier selection.
- `extract_lesson_items` — the word "lesson" is deeply PronunCo. If this
  capability generalizes to "extract items from educational material," name it
  accordingly. If not, keep the app-specific name but in a plugin namespace.

### Names/namespacing that should change

- Move from flat `/v1/plugin-route` to `/v1/plugins/{plugin_id}/route` for all
  plugin-owned endpoints. Example: `/v1/lesson-extract` →
  `/v1/plugins/pronunco/lesson-extract`.
- Rename `/v1/image-extract` → delete or fold into `/v1/vision/extract/lesson_image`
  under the PronunCo plugin namespace.
- Rename `/v1/dialogue-session` → `/v1/dialogue/sessions` (if core) or
  `/v1/plugins/pronunco/dialogue-sessions` (if stays plugin).
- Rename `/v1/score-explain` → `/v1/plugins/pronunco/score-explain`.

### Structural assumption worth challenging

The seed assumes routes are the primary unit of boundary. But the **capability
registry** (`capabilities.py`) may be the more important boundary surface for
client apps that do discovery-first integration. If a client queries
`/capabilities` and sees `extract_lesson_items: true`, it cannot know whether
that's a core promise or a plugin artifact. The capability registry needs the
same boundary discipline as the route surface.

## Minimal contract for client apps

A client app should be able to bootstrap from these core routes alone:

- `/health` — is the node alive?
- `/discover` — what is this node?
- `/capabilities` — what can this node do, separated into core vs plugin?
- `/v1/models` — what models are available? (recommend adding as standalone)
- `/setup/*` — trust establishment (certificate install)
- `/v1/chat` — the primary capability
- `/v1/translate` — when the app needs translation
- `/v1/summarize` — when the app needs summarization
- `/v1/transcribe-audio` — when the app needs ASR
- `/v1/synthesize-speech` — when the app needs TTS
- `/v1/voices` — discover available voices
- `/v1/docs/*` — when the app needs document RAG
- `/v1/vision/*` — when the app needs vision/OCR
- `/v1/rules/evaluate` — when the app needs deterministic rules
- `/v1/sessions` — connection/session management
- `/system/stats` — operational visibility

That's ~16 route families. Everything else should be **plugin-namespaced**,
**app-owned**, or **internal**.

What apps should own themselves:
- pedagogy, lesson flow, and drill design (PronunCo)
- coaching loop design and score interpretation (TelPro-Bro)
- medical coding logic, coverage rules, and compliance (iMedisys)
- legal strategy, filing checklists, exhibit workflows (iLegalFlow)
- scam investigation methodology and evidence packaging (ScamHunters)
- persona assignment, scenario design, prompt shaping
- all UI orchestration and presentation choices

## Recommendations

### Top 3 conceptual changes

1. **Introduce a plugin namespace prefix.** All plugin-owned routes should
   live under `/v1/plugins/{plugin_id}/...` or equivalent. This makes the
   boundary visible at the URL level, prevents future collision, and lets
   client apps reason about what's core versus what's conditional. The
   PronunCo persistence router (`/v1/pronunco/...`) already roughly follows
   this pattern — extend it to the main PronunCo router.

2. **Extract speech capabilities from the PronunCo plugin into a core domain
   router.** Create `domains/speech.py` (or `domains/audio.py`) and move
   `/v1/transcribe-audio`, `/v1/synthesize-speech`, `/v1/voices` there.
   ASR/TTS/voices are not PronunCo features — they are iHN infrastructure
   that PronunCo *consumes*, just like chat and translate. This is the single
   most concrete architectural correction needed.

3. **Split the capability registry into core and plugin capabilities.**
   `/capabilities` should return two sections: `core_capabilities` (always
   available) and `plugin_capabilities` (available when specific plugins are
   loaded). A client app should be able to detect that `chat` is core but
   `extract_lesson_items` is plugin-conditional without consulting external
   documentation.

### Top 3 cleanup actions for a later coding/testing sprint

1. **"Extract speech domain" sprint** — move `transcribe-audio`,
   `synthesize-speech`, and `voices` from `plugins/pronunco.py` into a new
   `domains/speech.py`. Update imports in `main.py`. Ensure the PronunCo
   plugin imports from the speech domain rather than defining those routes
   in-plugin. This is a small, mechanical change (~50 lines moved) that
   immediately clarifies the boundary.

2. **"Plugin namespace enforcement" sprint** — introduce
   `/v1/plugins/{plugin_id}/` prefix. Move all PronunCo plugin routes
   (`lesson-extract`, `dialogue-session`, `dialogue-turn`, `score-explain`,
   `drill-generate`, `image-extract`) under `/v1/plugins/pronunco/`. Update
   capability registry to reflect the namespacing. Update the web UI to
   handle the new route shape. This is the largest mechanical change (~15
   routes) but has the highest boundary payoff.

3. **"Capability registry hygiene" sprint** — split `capabilities.py` into
   `core_capabilities` (registered by domain routers) and
   `plugin_capabilities` (registered by plugin routers). Update
   `/capabilities` response format. Create documentation listing which
   capabilities are guaranteed across all iHN deployments.

### One candidate follow-on coding/testing sprint

**"Speech + plugin namespace dual correction" sprint.** Combine actions 1 and
2 above into a single sprint. Goal: after the sprint, no core infrastructure
capability is defined inside a plugin file, and no plugin route lives in the
bare `/v1/` namespace. Acceptance criteria:
- `curl https://localhost:17777/v1/transcribe-audio` returns 200 and the
  route is defined in `domains/speech.py`
- `curl https://localhost:17777/v1/lesson-extract` returns 404
- `curl https://localhost:17777/v1/plugins/pronunco/lesson-extract` returns
  200
- `/capabilities` response distinguishes core from plugin capabilities

This is scoped enough to complete in one coding session and directly
implements the boundary model decisions made in this discussion round.

## Portfolio product reclassification

Based on the working list, I propose the following reclassifications:

| Product | Current label | Proposed label | Reasoning |
|---|---|---|---|
| `RoadNerd` | deployment / sibling | **deployment** (not client) | Separate deployment model. May consume ideas but should not drive iHN route design. Not a client app in the PronunCo/TelPro-Bro sense. |
| `Edge-Kite` | client / deployment | **node role** (not client) | Closer to an event-stream recorder / pre-analyzer on edge hardware than a user-facing application. Should be treated as infrastructure, not a consumer of iHN client routes. |
| `WhoWhe2Wha` | consumer / client | **consumer** (not client) | Reads events, plans, deadlines from iHN rather than driving interactive APIs. Output-oriented, not API-oriented. Should not shape the core route surface. |
| `ACTCLI` | unclear | **unclear** (needs clarification) | Could be a thin CLI shell over core capabilities, or a full product with its own routes. Cannot classify until its scope is defined. Do not build routes for it yet. |
| `m-Beacon` | client | **client** (correct) | Analytics/conversion optimization is a real app consuming core capabilities. Good pressure test for whether generic analytics helpers belong in core or adapter. |
| `On-My-Watch` | client | **client** (correct) | Strong iHN client for vision + event summarization. Security workflow UX stays app-owned. |
| `iLegalFlow` | client | **client** (correct) | Heavy rules + document reasoning consumer. Good test of rules engine vs domain rule packs boundary. |

### Brain-demand cluster implications

The five brain-demand clusters in the portfolio list are a useful framework.
My take on which justify core primitives:

| Cluster | Core primitive recommended? | Rationale |
|---|---|---|
| Perception/extraction | **Yes** — `/v1/vision/*`, `/v1/transcribe-audio` | Cross-app demand from 7+ products. General infrastructure. |
| Evaluation/coaching | **No core primitive** — score semantics stay adapter | Scores are app-defined. A "generic scorer" would be a category mistake. |
| Planning/recommendation | **Partial** — core substrate for structured output | Raw chat/summarize can generate plans; domain-specific planning logic (appointment sequencing, logistics routing) stays adapter. |
| Simulation/roleplay | **Yes** — core bounded-dialogue primitive | Turn management, context windows, session lifecycle are general. Scenario/persona stay in adapters. |
| Rules/decision-support | **Yes for engine, no for packs** — `/v1/rules/evaluate` is core; domain rule files are adapter | The evaluator is general. Medical coding rules and legal compliance rules are domain-specific content. |

## Disagreements, tensions, and uncertainties worth preserving

### 1. `/v1/dialogue-session` — core or not?

My recommendation: extract a core `/v1/dialogue` primitive. Six products
want bounded dialogue with turn management. This is structural disagreement
territory.

**Counter-position worth preserving:** Dialogue semantics are inherently
app-specific. A "PronunCo scenario rehearsal" is fundamentally different
from a "TelPro-Bro roleplay coaching session" and different from
"iLegalFlow deposition rehearsal." Extracting a generic dialogue primitive
could produce an abstraction so thin it's useless, or so thick it leaks
one app's assumptions into others. The safer bet is to keep dialogue in
plugin space and let each app define its own session/turn contracts.
Core iHN already provides the building blocks (chat, ASR, TTS) — dialogue
is orchestration, not infrastructure.

**Why I still lean core:** The shared substrate (turn management, context
window trimming, token accounting, session expiry) is genuinely reused.
Apps can layer their own scenario semantics on top. The risk of a uselessly
thin abstraction is mitigated by implementing it against real use cases
(PronunCo scenario rehearsal as the first consumer) while keeping the API
surface neutral. If the core primitive ends up being too thin, we degrade it
to plugin space — the classification is reversible.

### 2. Flat `/v1/` namespace versus plugin prefix — structural disagreement

My recommendation: introduce `/v1/plugins/{plugin_id}/...`. This makes the
boundary visible.

**Counter-position worth preserving:** Plugin prefixes add URL complexity
without adding real enforcement. A client app should discover capabilities
through `/capabilities`, not through URL pattern matching. The URL is an
implementation detail; the capability contract is what matters. Adding
`/plugins/pronunco/` to URLs is cosmetic unless the server actually enforces
different lifecycle guarantees (versioning, deprecation, stability) for core
routes vs plugin routes. If we're not going to enforce different guarantees,
the prefix is just bikeshedding.

**Why I still lean prefix:** URLs are the most visible API contract. When
a route moves from `/v1/foo` to `/v1/plugins/pronunco/foo`, it communicates
a different stability promise — even if the technical enforcement is the
same. This matters for client developers who read the URL before they read
the docs. And it prevents the future problem where a core route gets added
that accidentally collides with a plugin route.

### 3. The over-pruning risk — what makes core too thin?

The seed acknowledges this (open question #7). My concrete concern: if we
aggressively push everything into plugin space "just to be safe," we lose
the product identity of iHN itself. A Home AI platform that only exposes
health/trust/chat/storage is a thin operating system, not a brain product.

My boundary heuristic: **a capability should be core if removing it would
make the web command center dashboard useless.** The command center is the
canonical first-party client. If the web UI needs it to function as a
standalone product (not as a plugin host), it's core. This means:
- ASR/TTS are core (the web UI exposes them as standalone tools)
- Document RAG is core (the web UI has doc management)
- Vision/OCR is core (the web UI offers image analysis)
- Rules evaluation is core (the web UI exposes it as a tool)
- Lesson extraction is not core (the web UI doesn't need it)
- Drill generation is not core
- Score explanation is not core
- Learner profile management is not core

Proposed heuristic: **"Delete the PronunCo plugin. What routes does the web
command center still need?"** Those routes are core.

### 4. Capability registry as the real boundary surface

The seed focuses on routes, but `/capabilities` may be the more important
boundary for discovery-first integration. A client app that queries
`/capabilities` and sees `extract_lesson_items: true` alongside `chat: true`
has no way to know which is core and which is plugin. The capability
advertisement is currently a flat list — the same boundary problem as
routes, one layer up.

**Recommendation:** The response from `/capabilities` should distinguish:
```json
{
  "core": {"chat": true, "translate": true, "transcribe_audio": true, ...},
  "plugins": {
    "pronunco": {"extract_lesson_items": true, "generate_drill": false, ...}
  }
}
```
This is a small schema change with large boundary payoff.

### 5. The setup server (port 17778) as a de facto second surface

The existence of a separate HTTP server on port 17778 that mirrors a subset
of core routes creates a second, narrower surface. This is architecturally
correct (bootstrap routes shouldn't require HTTPS), but it means the
boundary model must account for two deployment surfaces, not one. The setup
server's route set is implicitly the "minimum viable surface" — any route
that doesn't appear on the setup server is by definition not needed for
bootstrap. This is a useful litmus test: **if a route doesn't need to be on
the setup server, it's not in the minimal core set.**

The setup server currently serves: `/setup/*`, `/discover/peers`,
`/discover`, `/health`, `/v1/investigate/environment`, `/cluster/nodes`,
`/system/stats`. That's the minimum. Everything else on the HTTPS server
is additive.

---

*End of Round 1 response. This viewpoint was formed independently, without
reading other reviewers' Round 1 responses.*
