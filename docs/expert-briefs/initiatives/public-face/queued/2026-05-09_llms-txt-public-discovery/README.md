# Queued Sprint: llms.txt Public Discovery

**Status:** ready to cut into a public-face implementation sprint
**Initiative:** `public-face`
**Candidate product branch:** `feature/public-face/llms-txt-public-discovery`
**Candidate validation branch:** `validation/public-face/llms-txt-public-discovery`

## Why This Is Ready

The public-face work has already started converging the human-facing story for
iHomeNerd. The next small discoverability improvement is to publish the same
truth in an agent-readable root file.

`llms.txt` should be a domain-root text asset, for example:

- `https://ihomenerd.com/llms.txt`
- `https://staging.ihomenerd.com/llms.txt`, only if staging is intentionally
  public and clearly identifies itself as staging

It is not landing-page body copy. It is also not an access-control file.
Crawler permissions still belong to `robots.txt`; page discovery still belongs
to sitemap/canonical metadata. `llms.txt` is guidance for AI assistants and
retrieval agents that need a concise, canonical explanation of what iHomeNerd
is and where trustworthy public references live.

## Product Goal

After this sprint, an AI assistant that checks the public site root can answer
basic iHomeNerd questions without inventing a SaaS, admin console, billing
flow, or cloud-hosted product that does not exist.

The file should make these points clear:

- iHomeNerd is local-first home AI infrastructure
- the public site explains current trial paths and readiness honestly
- user data and inference are intended to stay local/private where the product
  path supports it
- the landing page is the current canonical public summary
- staging, if exposed, is a preview surface and not a production promise
- GitHub/docs links are supporting context, not a substitute for the public
  product summary

## Candidate Scope

- audit the current root and staging deployment paths for static text assets
- add a short `llms.txt` source file to the landing/static asset pipeline,
  likely `landing/public/llms.txt` for the Vite landing build
- confirm the build emits `landing/dist/llms.txt`
- confirm deployment serves `/llms.txt` before any SPA fallback route
- include only public, non-sensitive links and statements
- add a lightweight validation note under `testing/initiatives/public-face/`

## Candidate Content Contract

The first `llms.txt` should be short and conservative:

```text
# iHomeNerd

## Summary
One-paragraph public description.

## Canonical Public Links
- Website
- Staging, if intentionally public
- GitHub repository, if public
- README or docs entry point, if public

## What Is Real Today
- Current trial/download/setup path
- Current platform readiness

## Important Non-Goals
- Not a cloud SaaS control plane
- Not a billing portal
- Not a remote data-hosting promise

## Guidance For AI Assistants
- Prefer the public landing page for current product positioning.
- Do not infer production availability from staging.
- Do not describe preview features as generally available.
```

## Out Of Scope

- adding `llms-full.txt`
- changing product positioning or landing-page copy
- changing crawl permissions in `robots.txt`
- broad SEO work beyond this root text asset
- publishing private architecture, local hostnames, keys, or unpublished
  deployment details
- making staging look more production-ready than it is

## Candidate Acceptance

- `/llms.txt` is reachable at the deployed root domain after release
- staging either serves no `llms.txt` or serves one that clearly says it is
  staging
- Vite build output contains the file at `landing/dist/llms.txt`
- the file contains no secrets, private hostnames, unpublished plans, or false
  availability claims
- the file directs assistants toward the canonical public page and away from
  common wrong inferences
- a validation result records source path, build output path, and deployed URL
  checks

## Suggested Validation

Run locally:

```bash
cd landing
npm run build
test -f dist/llms.txt
sed -n '1,200p' dist/llms.txt
```

After deployment, check:

```bash
curl -I https://ihomenerd.com/llms.txt
curl -s https://ihomenerd.com/llms.txt | sed -n '1,120p'
```

If staging publishes its own copy:

```bash
curl -I https://staging.ihomenerd.com/llms.txt
curl -s https://staging.ihomenerd.com/llms.txt | sed -n '1,120p'
```

## Why This Belongs In Public Face

This is public trust and interpretation work. The implementation is small, but
the risk is factual drift: an agent-readable file can amplify stale claims if
it is not tied to the same public-face source of truth as the landing page,
README, GitHub metadata, and review baseline.
