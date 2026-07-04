# Seed Brief: Adapter Families and Client Ports

**Status:** discussion seed  
**Audience:** design/product/architecture contributors  
**No coding or testing expected in this sprint**

## Why this sprint exists

The first discussion sprint did the necessary cleanup:

- it separated `core iHN` from `plugin/helper` surface
- it showed that `PronunCo`-specific routes should not leak into the stable
  top-level surface
- it proved that client apps are useful pressure tests

But it also exposed a second question:

> Are named client apps the right unit for architecture, or are they only the
> way we discovered deeper recurring need categories?

Our working answer is:

- client apps are pressure tests
- need categories and adapter families should be the real architecture unit

## Corrective framing

We do **not** want a future where every new client app means:

- new core routes in iHN
- new top-level capability names
- or a direct binding from app UX to raw server endpoints

We want something closer to:

1. recurring need categories
2. reusable server-side adapter families hosted close to iHN
3. client apps with their own app cores and capability ports
4. client-side provider/storage adapters that can map to `iHN`, `Azure`,
   `OpenAI`, `Alibaba`, local disk, `GitHub`, or other backends

## Working architecture draft

### A. Server side: iHN platform plus adapter families

The node side should be organized around reusable families such as:

- speech
- docs/rules
- vision/evidence extraction
- monitoring/triage
- planning/recommendation
- simulation/roleplay

These are the units that should pressure-test:

- what belongs in stable core iHN
- what belongs in installable plugin/adapter namespaces
- what should never become public top-level surface

### B. Client side: app core plus ports and adapters

Each client app should have a shape closer to:

1. app core
2. app-facing capability ports
3. provider adapters
4. storage/search adapters
5. policy/orchestration layer

For `PronunCo`, for example:

- app core:
  - lesson flow
  - drill sequencing
  - teacher support
  - score presentation
- capability ports:
  - `LessonExtractionService`
  - `DialogueService`
  - `TranslationService`
  - `SpeechFeedbackService`
  - `SearchStorageService`
- provider adapters:
  - `iHN`
  - `Azure`
  - `OpenAI`
  - `Alibaba`
  - local-only fallback
- storage/search adapters:
  - local disk
  - `GitHub`
  - `iHN persistence`
  - cloud storage/search as needed

That same pattern should also fit other clients, with different ports:

- `iMedisys`
- `iLegalFlow`
- `ScamHunters`
- `On-My-Watch`

## Why this matters

Without this layer, we risk two bad outcomes:

1. `iHN` becomes a bag of app-specific helper routes
2. client apps bind themselves directly to raw provider APIs or raw route names

Both make growth harder.

The cleaner target is:

- server side:
  - stable core
  - installable adapter families
- client side:
  - stable app core
  - ports
  - swappable provider/storage adapters

## Working hypotheses

1. **Need categories should outrank client names.**
   `PronunCo`, `TelPro-Bro`, and `iMedisys` matter, but primarily because they
   reveal reusable adapter families.

2. **Node-side adapters belong in `iHN`, but should not all live in core.**
   If they need server routes and model/runtime access, they likely belong in
   `iHN` plugin space.

3. **Client repos should own app-core ports and client-side adapter policy.**
   Client UX should not be written directly against raw provider APIs or raw
   route names.

4. **A new client should ideally require either:**
   - no iHN core change at all, when core primitives are enough
   - or an installable node adapter/plugin, not a core redesign

5. **Client-specific discussions should happen, but after a cross-client
   adapter-family draft exists.**
   Otherwise each client repo will optimize around its own workflow too early.

## Proposed discussion sequence

1. finish this cross-client adapter-family round
2. mirror the discussion into `PronunCo`
3. mirror the discussion into one non-speech client:
   - preferably `iMedisys` or `iLegalFlow`
4. compare where the client mirrors agree or diverge
5. then cut the next coding/testing cleanup sprints

## Concrete questions for contributors

1. What are the best 5-7 reusable server-side adapter families?
2. Which current app examples map cleanly to those families?
3. Which families deserve stable core primitives, and which should remain
   installable plugin space?
4. What should a generic client-side app-core/port/adapter pattern look like?
5. Which parts of `PronunCo` are a good prototype for other clients, and which
   parts are just `PronunCo`?
6. Should similar discussions start in client repos now, or only after this
   cross-client draft stabilizes further?

## Open tensions worth preserving

1. How thin or thick should server-side adapter families be?
2. How many of the proposed families are truly reusable versus still disguised
   client-specific helpers?
3. Should simulation/roleplay be one family or several?
4. Where should storage/search adaptation sit when both `iHN persistence` and
   external providers are viable?
5. How much policy/orchestration belongs in the client versus node-side plugin
   space?
