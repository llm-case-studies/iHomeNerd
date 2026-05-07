# Expert Brief - Public Standing Review Protocol

**Date:** 2026-05-07
**Initiative:** `public-face`
**Status:** implemented/pending validation
**Audience:** docs/launch owner on any docs-capable host

## Why This Sprint Exists

The public-face backlog says the next visible work should align the root domain,
staging page, README, and repo story.

Before that work becomes a series of subjective polish passes, iHomeNerd needs a
repeatable way to ask:

- did outsiders understand the product better?
- did AI/search summaries stop making wrong category guesses?
- did trust/legal/onboarding confidence improve?
- did any new confusion appear?

This sprint creates the review protocol and templates that will measure those
changes.

## Execution Fence

- Repo: `iHomeNerd`
- Working branch: `feature/public-face/public-face-foundation`
- Merge target: `main` after validation
- Implementation host: mac-mini / Codex thread
- Validation host: `iMac-Debian`

## References

Read first:

- `docs/public-face/README.md`
- `docs/public-face/INDEX.md`
- `docs/public-face/research/2026-05-07_external-ai-impressions.md`
- `docs/public-face/audits/2026-05-07_public-surface-audit.md`
- `docs/public-face/backlog/2026-05-07_public-face-workstreams.md`
- `testing/initiatives/public-face/2026-05-07_public-standing-review-protocol/request.md`

## Required Scope

Create:

- `docs/public-face/reviews/README.md`
- `docs/public-face/reviews/protocol.md`
- `docs/public-face/reviews/templates/panel-prompts.md`
- `docs/public-face/reviews/templates/scorecard.md`
- `docs/public-face/reviews/templates/wrong-inference-log.md`
- `docs/public-face/reviews/templates/synthesis.md`
- `docs/public-face/reviews/2026-05-07_baseline/README.md`

Update:

- `docs/public-face/INDEX.md`
- `docs/public-face/backlog/2026-05-07_public-face-workstreams.md`
- public-face initiative and testing indexes

## Out Of Scope

- running the actual baseline panel
- root homepage redesign
- staging copy rewrite
- GitHub repo settings mutations
- license decision
- screenshots or generated media
- crawl metadata implementation

## Done Means

- future public-face sprints can run the same before/after review
- wrong outsider inferences can be tracked as public-face bugs
- score movement can be compared across sprints
- root/staging story alignment has a measurement protocol before it starts
