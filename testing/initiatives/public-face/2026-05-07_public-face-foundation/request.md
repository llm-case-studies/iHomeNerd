# Test Request - Public Face Foundation

**Date issued:** 2026-05-07
**Initiative:** `public-face`
**Sprint:** `2026-05-07_public-face-foundation`
**Target branch:** `feature/public-face/public-face-foundation`
**Validator branch:** `validation/public-face/public-face-foundation`
**Validator host:** `iMac-Debian`
**Runtime host:** any docs-capable host

## What You Are Validating

Validate that the new `public-face` initiative is real, coherent, and useful:

1. the knowledge-base folder exists under `docs/public-face/`
2. the research note captures the outside AI impressions from the 2026-05-07
   thread
3. the audit note captures the observed root/staging/GitHub gaps
4. the backlog is prioritized and action-oriented
5. the initiative README/index and testing mirror exist and point to the same
   sprint

## Product Commit Under Test

Record:

```bash
git rev-parse HEAD
```

## Required Checks

Run:

```bash
rg --files docs/public-face docs/expert-briefs/initiatives/public-face testing/initiatives/public-face
git diff --check
```

If `git diff --check` reports a formatting issue, record the exact file/path.

## Content Review Probes

Minimum review steps:

1. Open `docs/public-face/README.md` and confirm it explains the lane.
2. Open `docs/public-face/INDEX.md` and confirm it points to the dated docs.
3. Open the research note and confirm it captures both the Google AI and
   anonymous ChatGPT takeaways.
4. Open the audit note and confirm it records:
   - root/staging mismatch
   - metadata/canonical staging bias
   - repo substance vs weak public trust signals
   - missing license/discoverability basics as of 2026-05-07
5. Open the backlog and confirm workstreams are ordered rather than flat.
6. Open the initiative README/index and confirm the sprint appears there.
7. Open the testing index and confirm the same sprint slug appears there.

## Save Evidence

Save any notes or screenshots under:

```text
testing/initiatives/public-face/2026-05-07_public-face-foundation/evidence/
```

## Result

Write findings to:

```text
testing/initiatives/public-face/2026-05-07_public-face-foundation/result.md
```

Include:

- pass/fail verdict
- product commit under test
- files reviewed
- whether the thread research was captured accurately
- any missing public-face issue that should have been in the seed docs
