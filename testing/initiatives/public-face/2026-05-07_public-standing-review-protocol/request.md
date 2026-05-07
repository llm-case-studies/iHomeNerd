# Test Request - Public Standing Review Protocol

**Date issued:** 2026-05-07
**Initiative:** `public-face`
**Sprint:** `2026-05-07_public-standing-review-protocol`
**Target branch:** `feature/public-face/public-face-foundation`
**Validator branch:** `validation/public-face/public-standing-review-protocol`
**Validator host:** `iMac-Debian`
**Runtime host:** any docs-capable host

## What You Are Validating

Validate that the public-face initiative now has a repeatable process for
measuring public standing before and after improvement sprints.

Core checks:

1. review protocol exists under `docs/public-face/reviews/`
2. stable panel prompts exist
3. scorecard template exists
4. wrong-inference log template exists
5. synthesis template exists
6. baseline review folder exists
7. public-face index/backlog mention the protocol
8. initiative/testing mirrors list the sprint

## Product Commit Under Test

Record:

```bash
git rev-parse HEAD
```

## Required Checks

Run:

```bash
rg --files docs/public-face/reviews docs/expert-briefs/initiatives/public-face testing/initiatives/public-face
git diff --check
```

## Content Review Probes

Minimum review:

1. Confirm `protocol.md` distinguishes public interpretation from internal
   intent.
2. Confirm the prompts ask what outsiders infer, not what maintainers wish to
   communicate.
3. Confirm the scorecard dimensions can compare before/after public-face
   sprints.
4. Confirm the wrong-inference log treats mistaken outsider conclusions as
   public-face bugs.
5. Confirm the baseline folder points back to the 2026-05-07 research, audit,
   and backlog.
6. Confirm the protocol does not claim that a baseline has already been fully
   run.

## Save Evidence

Save notes under:

```text
testing/initiatives/public-face/2026-05-07_public-standing-review-protocol/evidence/
```

## Result

Write findings to:

```text
testing/initiatives/public-face/2026-05-07_public-standing-review-protocol/result.md
```

Include:

- pass/fail verdict
- product commit under test
- files reviewed
- whether the review protocol is usable for the root/staging alignment sprint
- any missing measurement dimension
