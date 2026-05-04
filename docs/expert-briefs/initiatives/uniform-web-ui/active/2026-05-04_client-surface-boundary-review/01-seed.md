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

