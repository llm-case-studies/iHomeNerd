# Implementation Note — Root/Staging Story Alignment

**Sprint:** 2026-05-07_root-staging-story-alignment
**Branch:** feature/public-face/root-staging-story-alignment

## Before

As of the baseline audit (2026-05-07):

- README.md opener: "Your local AI brain for documents, translation, cameras, and
  connected apps." — claimed "Open core" without a license decision.
- Root domain: "Smart Home Intelligence" — different product category from
  staging.
- landing/index.html metadata: title, description, OG, and structured data all
  led with "Public preview page" rather than product identity. Canonical URL
  pointed to staging.
- LandingPage.tsx: hero copy used "local AI service team" phrasing; "staging
  URL", "canonical summary", and "private admin console" appeared prominently
  before the product value was clear.
- Repeated "staging" and "preview" language dominated the first-viewport and
  install-path sections.

## After (this sprint)

- README.md opener now reads: "A local AI home brain for private document chat,
  voice, translation, network awareness, and agent workflows — on machines you
  control." Removed "Open core" claim. Reduced staging preamble.
- landing/index.html metadata now leads with product identity ("Local AI Home
  Brain for Private Data"). Descriptions and OG tags describe the product first,
  install paths second.
- LandingPage.tsx: hero_badge changed to "Public repo. Local AI home brain."
  hero_desc aligned to canonical story. Removed "staging URL", "canonical
  summary", and "private admin console" wording from the public-repo caveat
  box and install-path sections. Preview truthfulness remains but appears after
  product value.
- Canonical URL remains `https://staging.ihomenerd.com/` (truthful — the root
  domain source is outside this repo).
- ScoutFlow.tsx did not need CTA/handoff changes.

## Remaining gap

The root domain (`ihomenerd.com`) source is not in this repo. The splash page
observed on 2026-05-07 still tells a "Smart Home Intelligence" story. Until the
root page source is aligned, cold visitors arriving at the root domain will
still see a different product category than what staging and the README now
describe.
