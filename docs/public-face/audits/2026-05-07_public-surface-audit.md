# Public Surface Audit

**Date:** 2026-05-07
**Scope:** `ihomenerd.com`, `staging.ihomenerd.com`, public GitHub surface, and
repo-visible onboarding/docs signals

## Executive Read

iHomeNerd has more substance than its public face communicates. The current
problem is not lack of product thinking. The problem is that the public
surfaces tell different stories and over-signal preview status.

## Root Domain Findings

Observed on 2026-05-07, `https://ihomenerd.com` served a simple splash page
with:

- title: `iHomeNerd - Smart Home Intelligence`
- hero: `Your home, understood.`
- product trio: `Scout`, `Brain`, `Journal`
- staging-forward call to action: `Visit staging preview`
- note: `Free to use. Production launch coming soon.`

### Risk

This is a different story from the staging page and from the repo README. It
does not strongly anchor iHomeNerd as a local AI brain for docs, translation,
voice, and connected apps.

## Staging Domain Findings

Observed on 2026-05-07, `https://staging.ihomenerd.com` served the newer
landing app with:

- title: `iHomeNerd — Public Local AI, Private Data at Home`
- copy centered on a public and free local AI brain
- trial-path framing: Docker today, guided VM next, live image later
- repeated explanation that staging is public, not private

### Risk

This page is much closer to the intended product story, but it still spends too
much energy explaining preview state, path caveats, and "trusted AI" guidance
before simply selling the product clearly.

## Root vs Staging Mismatch

On 2026-05-07 the two public pages disagreed on:

- what the product fundamentally is
- whether the main story is "smart-home intelligence" or "local AI brain"
- whether the call to action is product exploration or staging preview
- how much of the page is about use cases versus install/trial paths

### Consequence

Humans and AI summaries are forced to synthesize the gap themselves, which is
how category drift and confidence loss happen.

## Metadata and Discoverability Findings

The staging landing app currently points its metadata at the staging hostname:

- canonical URL uses `https://staging.ihomenerd.com/`
- `og:url` uses `https://staging.ihomenerd.com/`
- title and descriptions repeatedly say `public preview page`

Observed on 2026-05-07:

- `https://ihomenerd.com/robots.txt` returned `404`
- `https://ihomenerd.com/sitemap.xml` returned `404`

### Risk

Search and AI systems are receiving staging-heavy signals without a stronger
canonical root-domain story to override them.

## GitHub Surface Findings

Public GitHub and local repo inspection on 2026-05-07 showed:

- repo exists and is public
- substantial README, product spec, control-plane spec, trust/TLS policy, VM
  scaffold, testing docs, and install scripts exist
- local git history showed strong recent activity
- public community signals are still thin

### Public-surface weaknesses

- no top-level license visible
- no public releases
- zero stars/forks/watchers in the public metadata snapshot observed on
  2026-05-07
- one visible public contributor
- repo description/homepage/topics were effectively blank in public metadata
- little public issue/discussion signal

### Meaning

The repo reads as active internal buildout with weak public onboarding and weak
external trust signals, not as dead vaporware.

## Messaging Findings

Current public wording mixes several frames:

- `open core`
- `public and free`
- implied `open source`
- staging/public-preview reassurance
- trial/install path guidance

### Risk

Visitors do not yet get one stable answer to these questions:

- What is iHomeNerd?
- What can I do with it today?
- Is it open source, open core, or public-but-not-yet-licensed?
- What page should I trust as canonical?

## Conclusion

The public face currently under-signals product substance and over-signals
provisionality.

The fastest credibility gains are likely to come from:

1. one canonical product story across root, staging, README, and GitHub
2. explicit licensing/opening-position clarity
3. stronger repo metadata and onboarding
4. basic crawl/discoverability hygiene
