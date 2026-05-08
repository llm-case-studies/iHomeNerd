# Test Request - Public Standing Baseline

**Date issued:** 2026-05-08
**Initiative:** `public-face`
**Sprint:** `2026-05-08_public-standing-baseline`
**Target branch:** `feature/public-face/public-standing-baseline`
**Validator branch:** `validation/public-face/public-standing-baseline`
**Validator host:** `iMac-Debian`
**Runtime host:** any docs-capable host

## What You Are Validating

Validate that the baseline public standing review is complete, dated, and
grounded in the review protocol.

## Required Checks

Run:

```bash
rg --files docs/public-face/reviews/2026-05-07_baseline
git diff --check
```

## Content Probes

Confirm:

- `input-snapshot.md` distinguishes live root, live staging, promoted repo
  source, public GitHub metadata, and crawl basics
- `panel-responses.md` covers all four panel passes
- `scorecard.md` scores all protocol dimensions from 1-5 and includes evidence
- `wrong-inference-log.md` includes severity and status for known public-face
  misunderstandings
- `synthesis.md` names the top three next actions
- no product code or deployment files changed

## Result

Write validation findings to:

```text
testing/initiatives/public-face/2026-05-08_public-standing-baseline/result.md
```
