# Expert Brief - Public Face Foundation

**Date:** 2026-05-07
**Initiative:** `public-face`
**Status:** active sprint
**Audience:** docs/launch owner on any docs-capable host

## Why This Sprint Exists

The 2026-05-07 public-face review surfaced a consistent pattern:

- `ihomenerd.com` and `staging.ihomenerd.com` do not tell the same story
- outside AI summaries are therefore filling gaps with weak guesses
- GitHub has more real substance than outsiders are perceiving
- public trust signals such as licensing, repo metadata, and crawl hygiene are
  weaker than the engineering work underneath them

That means iHomeNerd needs a first-class initiative for its public face, not
just occasional landing-page edits.

## Execution Fence

- Repo: `iHomeNerd`
- Base branch: `origin/main`
- Working branch: `feature/public-face/public-face-foundation`
- Merge target: `main`
- Implementation host: any docs-capable host
- Validation host: `iMac-Debian`

## References

Read first:

- `docs/expert-briefs/README.md`
- `docs/expert-briefs/LESSONS.md`
- `docs/expert-briefs/initiatives/public-face/README.md`
- `docs/expert-briefs/initiatives/public-face/INDEX.md`
- `docs/WEB_PRICING_AND_LAUNCH_PLAN_2026-04-10.md`
- `README.md`
- `landing/index.html`
- `landing/src/LandingPage.tsx`
- `testing/initiatives/public-face/2026-05-07_public-face-foundation/request.md`

## Product Goal

After this sprint:

1. iHomeNerd has a durable public-face knowledge base
2. the 2026-05-07 thread findings are captured in repo-visible docs
3. the initiative has a sprint index and a testing mirror
4. future website, GitHub, SEO, and trust work can anchor on one backlog

## Required Scope

### A. Create the durable knowledge base

Create `docs/public-face/` with:

- a lane README
- an index
- a dated research note for outside AI impressions
- a dated factual audit of current public surfaces
- a dated prioritized workstream backlog

### B. Create the initiative lane

Create:

- `docs/expert-briefs/initiatives/public-face/README.md`
- `docs/expert-briefs/initiatives/public-face/INDEX.md`
- `active/2026-05-07_public-face-foundation/`

The sprint pack should read like a normal initiative in this repo, not a
special-case memo.

### C. Create the testing mirror

Create:

- `testing/initiatives/public-face/INDEX.md`
- `testing/initiatives/public-face/2026-05-07_public-face-foundation/request.md`
- `testing/initiatives/public-face/2026-05-07_public-face-foundation/result.md`

This is a docs-review validation loop, not an app-runtime validation loop.

### D. Optional doc-surface cleanup

If helpful, add one discoverability link from `README.md` into the new
`docs/public-face/` lane and correct any obviously stale doc path in that same
section.

## Out Of Scope

- root homepage redesign
- staging landing copy rewrite
- repo settings mutations on GitHub
- adding a license file
- creating screenshots or demo media
- implementing `robots.txt` or `sitemap.xml`
- changing Docker/VM/install behavior

## Validation Expectations

This is a docs-first sprint. Validation should confirm:

1. the new folder structure exists
2. the content reflects the 2026-05-07 thread accurately
3. the backlog is ordered and actionable
4. the initiative/testing mirrors are coherent
5. no claims are presented as facts without a date or source context

Suggested commands:

```bash
rg --files docs/public-face docs/expert-briefs/initiatives/public-face testing/initiatives/public-face
git diff --check
```

## Deliverables

Required:

1. new docs under `docs/public-face/`
2. initiative scaffold under `docs/expert-briefs/initiatives/public-face/`
3. testing scaffold under `testing/initiatives/public-face/`
4. concise result note in `testing/initiatives/public-face/2026-05-07_public-face-foundation/result.md`

## Done Means

- the research from the 2026-05-07 thread is now in repo docs
- a future implementer can find the problem statement quickly
- the next public-face sprint can start from a clear backlog instead of a chat
  recap
