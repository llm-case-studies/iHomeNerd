# Uniform Web UI Initiative

This initiative is about converging the client-facing iHN experience without
flattening every platform into the same shape.

The Android work already showed two important truths:

- a shared surface is useful only when it is honest
- a spike-discovered capability does not automatically belong in the stable
  public iHN interface

This initiative therefore covers two related jobs:

1. align what users and client apps should experience as the stable iHN
   surface
2. separate that stable surface from adapters, helpers, and experimental lab
   routes

The active sprint below is intentionally discussion-only. It is meant to help
us decide what belongs to:

- core iHN
- adapters/plugins/helpers
- client apps such as PronunCo

Once the boundary decisions stabilize, the outcome should be converted into one
or more coding/testing sprints cut from `origin/main`.

## Current direction

The first discussion sprint clarified an important boundary:

- client apps are useful pressure tests
- but client identities are not the right long-term architectural unit

The next discussion round should therefore tune the vision toward:

1. recurring need categories
2. server-side adapter families hosted close to iHN
3. client-side app cores with capability ports and provider adapters

Examples:

- server side:
  - speech adapter family
  - docs/rules adapter family
  - vision/evidence adapter family
  - monitoring/triage adapter family
  - planning/simulation adapter family
- client side:
  - app core
  - AI provider adapter layer (`iHN`, `Azure`, `OpenAI`, `Alibaba`, local)
  - storage/search adapter layer (`local`, `GitHub`, `iHN persistence`, cloud)

This is the right level for the next round of discussion. Client apps should
still contribute, but mainly as pressure tests for adapter-family boundaries,
not as the primary organizing unit.
