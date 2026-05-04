# Seed Brief: Client Surface Boundary Review

**Status:** discussion seed  
**Audience:** design/product/architecture contributors  
**No coding or testing expected in this sprint**

## Why this sprint exists

The current iHN surface still carries artifacts of spike mode.

We explored what was possible:

- Android runtime routes
- app-integration helpers
- PronunCo-specific language tooling
- shared web-serving and capability discovery

That exploration was useful, but it also blurred boundaries.

Example concern:

- `normalize_pinyin` may be a useful helper in the PronunCo ecosystem
- that does **not** automatically mean it should become a first-class public
  iHN route in the stable product surface

Before we add or remove routes mechanically, we should clarify the model.

## Portfolio context

The discussion will be better if contributors react to real clients instead of
an abstract API diagram.

### A. First-party iHN clients

These are not "integrations." They are part of the iHN product itself.

| Client | Current / potential | End-user need it serves |
|---|---|---|
| Web Command Center | current | Operate the Home, inspect nodes, trust, health, models, sessions, and alerts |
| Android node-class app | current | Start a portable node, inspect this-device health, host the web UI, act as a travel or spare node |
| iOS controller app | emerging | Pair to a Home, trust it, monitor it, and drive light actions from a polished mobile client |

### B. Current external client apps

These already exist or are explicitly active in the portfolio.

| Client | Current / potential | End-user need it serves |
|---|---|---|
| PronunCo | current | Learn pronunciation and language material with local help: extraction, translation, drills, dialogue, score explanation |
| TelPro-Bro | current / near-term | Practice spoken delivery, roleplay, score explanation, and recording continuity |

### C. Potential or planned ecosystem clients

These matter because they pressure-test whether the iHN surface is too narrow,
too app-specific, or too leaky.

| Client | Current / potential | End-user need it serves |
|---|---|---|
| Tax / TurboTax chooser / checker | potential | Understand tax docs, choose software tier, review assumptions, ask tax questions locally |
| iMedisys | potential | Analyze medical bills/docs, apply rules, explain denials/coding, support decisions privately |
| Kitchen / restaurant back-office | potential | OCR receipts/invoices, dish and cost insight, local archive/search |
| iScamHunter | potential | Investigate scams locally, gather evidence, summarize findings, publish case material |
| WhoWhe2Wha | potential | Consume deadline/time-based outcomes from iHN and present them in life timeline form |
| iOfficeNerd | potential sibling variant | Private office knowledge brain, policy/docs search, local admin/control |

### D. Sibling products and near-neighbors

These should shape the architecture, but they are not necessarily "clients" of
iHN in the same sense.

| Product | Role |
|---|---|
| RoadNerd | separate deployment model; may share assets or ideas, but not the same runtime contract |
| Crypto-Fakes | publication / case-study destination fed by investigation workflows rather than a direct iHN client |

## First-pass need ladder

One way to keep boundaries clean is to translate needs downward through four
layers:

1. end-user-facing need
2. client-app-facing need
3. adapter/plugin-facing need
4. stable iHN-facing need

The point is not to force every app through the exact same ladder. The point is
to see where aggregation and generalization should happen.

### Example 1: PronunCo pronunciation help

| Layer | Example |
|---|---|
| End-user need | "Help me understand why my pronunciation was off and what to practice next." |
| Client-app-facing need | show score explanation, targeted drill suggestions, model audio, dialogue follow-up |
| Adapter/plugin-facing need | convert app lesson/session state into comparison, drill, and explanation requests |
| Stable iHN-facing need | transcribe speech, synthesize speech, compare expected vs actual pronunciation, optionally run bounded dialogue/translation |

### Example 2: Tax copilot

| Layer | Example |
|---|---|
| End-user need | "Help me understand this tax form and whether I picked the right software tier." |
| Client-app-facing need | upload / inspect docs, ask questions, receive explanation with caveats, review software-choice recommendation |
| Adapter/plugin-facing need | normalize tax document classes, map interview answers to rule inputs, ask for narrative explanation |
| Stable iHN-facing need | OCR/ingest docs, query documents, summarize, chat, run deterministic rules where needed |

### Example 3: TelPro-Bro coaching

| Layer | Example |
|---|---|
| End-user need | "Help me practice this spoken delivery and tell me what to improve." |
| Client-app-facing need | roleplay session, score explanation, recording continuity, targeted retry loop |
| Adapter/plugin-facing need | session orchestration, prompt shaping, score-normalization, recording metadata mapping |
| Stable iHN-facing need | transcribe audio, synthesize speech, bounded chat/dialogue, store/retrieve recordings |

### Example 4: iHN itself as the product

| Layer | Example |
|---|---|
| End-user need | "Tell me whether my Home is healthy and what this node can do." |
| Client-app-facing need | dashboard, trust view, node list, model inventory, alerts |
| Adapter/plugin-facing need | often none, or only thin client adaptation |
| Stable iHN-facing need | `/health`, `/discover`, `/capabilities`, `/system/stats`, `/sessions`, `/setup/*`, `/v1/models` |

## First-pass hypotheses

These are the current working hypotheses, not final decisions.

1. **The stable iHN surface should mostly answer shared infrastructure and
   shared capability questions.**
   Examples: trust, node health, discovery, sessions, model inventory, chat,
   translation, ASR, TTS, docs, cluster control.

2. **Most app-specific pedagogy or workflow should stay above iHN.**
   PronunCo drill selection and teaching UX, or TelPro-Bro coaching loop design,
   likely belong in the client app.

3. **Adapter/plugin space is where domain-specific transforms should live.**
   This is the likely home for lesson extraction helpers, score explanation
   helpers, pinyin utilities, tax-rule adapters, medical normalization, and
   similar domain transforms.

4. **Not every plugin/helper capability deserves a public top-level route.**
   Some should remain:
   - internal helper contracts
   - plugin-only namespaces
   - or app-specific bridge calls

5. **A good stable iHN route should make sense even when no single ecosystem app
   is in focus.**
   If it only makes sense inside one app's product language, that is a warning
   sign.

## Decision scope

This sprint is about the **client-facing surface** only.

It is not trying to redesign:

- model internals
- cluster orchestration internals
- Android/iOS implementation details
- testing infrastructure

It is trying to answer:

1. what should a user or client app reasonably see as "iHN itself"?
2. what should be exposed only as adapter/plugin/helper surface?
3. what should remain app-owned UX and workflow logic?

## Working boundary model

### 1. Core iHN surface

This is the stable surface that makes sense even if no companion app exists.

Expected traits:

- useful on its own
- stable enough to document as product contract
- not tied to one app's pedagogy or business workflow
- shaped around household node, control-plane, and general AI capabilities

Strong candidates:

- identity / health / discovery:
  - `/health`
  - `/discover`
  - `/capabilities`
  - `/sessions`
- household trust and node control:
  - `/setup/*`
  - `/system/stats`
  - cluster / node inventory routes
- general AI capabilities:
  - `/v1/chat`
  - `/v1/translate`
  - `/v1/transcribe-audio`
  - `/v1/synthesize-speech`
  - `/v1/voices`
  - `/v1/models`

### 2. Adapter / plugin / helper surface

This is where app-specific transforms and utility helpers belong when they are
useful, but not truly product-defining for iHN itself.

Expected traits:

- domain-specific
- often namespaced
- may be loaded as plugin capability packs
- may evolve faster than the stable product surface

Examples that likely belong here:

- PronunCo helper routes
- pinyin comparison / normalization helpers
- lesson extraction helpers
- drill generation helpers
- score explanation helpers
- app persona helpers

### 3. App-owned surface

This is what should stay in the client app rather than move into iHN just
because iHN can assist with it.

Expected traits:

- app-specific UX
- pedagogy, session flow, or business logic
- UI orchestration that is meaningful only in that app
- cached presentation choices, hints, and workflow opinions

Examples:

- how PronunCo presents pronunciation feedback
- which drill types a lesson screen offers
- lesson progression and score display
- coach screens, study flow, or onboarding decisions

## Working product rules

These rules are proposed, not yet final.

1. **Capability advertised is not the same as route blessed.**
   A capability may exist internally or via plugin pack without becoming a
   stable public iHN route.

2. **Stable iHN routes should stand on their own.**
   If a route stops making sense when PronunCo disappears, it probably does not
   belong in the core surface.

3. **Namespacing should carry meaning.**
   App-specific or domain-specific helpers should look namespaced and optional,
   not silently promoted into the top-level product contract.

4. **UI unification does not mean feature flattening.**
   Shared menu / shared shell is good. Forcing every lab/helper surface into the
   main product contract is not.

5. **Spike usefulness is evidence, not destiny.**
   A route that helped a spike should still earn its place in the stable
   surface.

## Open questions and tensions

These are deliberately unresolved. They are here to invite useful disagreement.

1. **How public should helper capabilities be?**
   Some helpers are clearly useful.
   The question is whether usefulness should lead to:
   - public stable route
   - plugin namespace
   - internal helper only

2. **What counts as a true client app versus a sibling product?**
   `PronunCo` and `TelPro-Bro` look like true clients.
   `RoadNerd`, `Edge-Kite`, and `iOfficeNerd` may not.
   That distinction changes what kind of contract iHN should expose.

3. **Should simulation/roleplay be a core primitive or always adapter-owned?**
   Several products want scenario dialogue.
   But the scenario semantics may remain deeply app-specific.

4. **How much planning should live in core iHN?**
   Many apps want recommendation and planning help.
   It is unclear whether iHN should expose planning primitives directly or only
   provide lower-level substrate for app-owned planning logic.

5. **When does a rules-heavy domain deserve stable core support?**
   `iMedisys`, `iLegalFlow`, and related domains may all want rules +
   explanation.
   The open question is whether the stable surface should expose general rules
   primitives only, or domain-facing decision routes too.

6. **How much of the current app-integration surface is spike residue?**
   Some capabilities may exist mainly because they were easy to try during
   exploration, not because they earned a stable product boundary.

7. **What would make the stable core too thin?**
   Over-pruning is also a risk.
   If iHN becomes only health/trust/chat/storage plumbing, it may stop being a
   useful AI brain product in its own right.

## Concrete questions for contributors

1. Which current routes clearly belong in the stable core iHN surface?
2. Which current or proposed routes should move into adapter/plugin namespaces?
3. Which things are currently framed as "capabilities" but are really app-owned
   workflow helpers?
4. Should app-integration helpers be:
   - hidden internal helpers
   - optional plugin routes
   - or stable documented external routes?
5. What minimal public surface do client apps actually need from iHN?
6. Which current route or capability names create the most conceptual leakage?

## Suggested contribution format

Use `02-feedback-template.md`.

Try to be concrete:

- point to specific route names or capability names
- say where they belong
- say why
- say what product story would improve if we moved them

## Conversion trigger

This discussion sprint should convert into coding/testing work only after we can
state, with reasonable confidence:

- the stable core iHN client-facing surface
- the adapter/plugin surface
- the app-owned surface
- the first 1-3 cleanup actions to implement

That means this sprint should end with:

- better boundaries
- not perfect agreement
- and a smaller, sharper set of coding questions than we started with
