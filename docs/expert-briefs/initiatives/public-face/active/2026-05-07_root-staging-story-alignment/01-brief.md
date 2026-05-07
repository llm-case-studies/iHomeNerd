# Expert Brief - Root/Staging Story Alignment

**Date:** 2026-05-07
**Initiative:** `public-face`
**Status:** queued
**Audience:** coding agent on `Acer-HL`

## Why This Sprint Exists

The public-face audit found that iHomeNerd has more substance than its public
surface communicates. The biggest current issue is not visual polish. It is
that the public surfaces make a cold visitor guess which story is canonical:

- root says smart-home intelligence
- staging says local AI brain
- README says public preview at staging
- metadata and copy over-emphasize staging/preview state

This sprint should make the repo-controlled public surfaces tell one true
story.

## Execution Fence

- Repo: `iHomeNerd`
- Base branch: `origin/main`
- Working branch: `feature/public-face/root-staging-story-alignment`
- Merge target: `main`
- Implementation host: `Acer-HL`
- Build host: any Node/Vite-capable host
- Validation host: `iMac-Debian` /
  `validation/public-face/root-staging-story-alignment`

## Product Story Target

Use this as the canonical meaning, with better copy allowed if it stays true:

> iHomeNerd is a local AI home brain for private document chat, voice,
> translation, network awareness, and agent workflows on machines you control.

The story should lead with product value. Preview/trial/install caveats still
matter, but they should appear after the visitor understands what the product
is.

## Required Scope

Align the repo-controlled public surfaces:

- root-facing public wording in `README.md`
- landing metadata in `landing/index.html`
- first-viewport and repeated staging/preview copy in
  `landing/src/LandingPage.tsx`
- ScoutFlow CTA/handoff wording only if needed in `landing/src/ScoutFlow.tsx`

If the current `ihomenerd.com` splash source is outside this repo, record that
as a remaining deployment/source gap. Do not create a fake root page source.

## Copy Requirements

- Keep `iHomeNerd` visible as the product name in the first viewport.
- Make the category clear within the first 15 seconds.
- Avoid wording that could be read as virtual home staging.
- Reduce repeated "staging" explanations.
- Keep public preview truthfulness, but move it below product value.
- Keep current install/trial status honest:
  - Docker is the practical early-adopter path today.
  - guided VM and live-image paths are not final yet.
- Do not claim open source or a license decision in this sprint.

## Metadata Requirements

Review and improve, where truthful:

- page title
- meta description
- Open Graph title/description
- canonical URL and `og:url`
- structured-data description and URL

If root deployment behavior makes canonical URL changes risky, preserve
truthfulness and record the blocker in `result.md`.

## Out Of Scope

- adding or choosing a top-level license
- GitHub repo metadata/settings changes
- `robots.txt` or `sitemap.xml`
- screenshots, social preview image, or generated media
- Command Center changes
- full landing localization
- major redesign or animation work
- pricing/business-policy changes

## Required Checks

Run:

```bash
npm --prefix landing run build
git diff --check
rg -n "home staging|private admin|canonical summary|staging URL|public preview" README.md landing/index.html landing/src
```

The `rg` command is not automatically a failure. Use it to prove that
staging/preview wording was reduced and remains deliberate where present.

## Done Means

- README opener and landing first viewport describe the same product category.
- Staging/preview caveats are truthful but less dominant.
- Metadata no longer overweights staging as the product identity, unless the
  root deployment source is outside this repo and recorded as a blocker.
- Landing build passes.
- Validation can run the public standing protocol and compare whether wrong
  outsider inferences should improve.
