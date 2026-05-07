# Test Request - Root/Staging Story Alignment

**Date issued:** 2026-05-07
**Initiative:** `public-face`
**Sprint:** `2026-05-07_root-staging-story-alignment`
**Target branch:** `feature/public-face/root-staging-story-alignment`
**Validator branch:** `validation/public-face/root-staging-story-alignment`
**Validator host:** `iMac-Debian`
**Runtime host:** any Node/Vite-capable host

## What You Are Validating

Validate that the implementation makes iHomeNerd's repo-controlled public
surfaces tell one coherent public story:

> local AI home brain for private document chat, voice, translation, network
> awareness, and agent workflows on machines the user controls.

This is a story-alignment sprint, not a license, SEO, screenshot, or redesign
sprint.

## Product Commit Under Test

Record:

```bash
git rev-parse HEAD
```

## Required Commands

Run:

```bash
npm --prefix landing run build
git diff --check
rg -n "home staging|private admin|canonical summary|staging URL|public preview" README.md landing/index.html landing/src
```

The `rg` command is an audit aid. Report whether the remaining matches are
deliberate and less dominant than before.

## Content Review Probes

1. Confirm the README opener and landing first viewport describe the same
   product category.
2. Confirm the first public story does not read as virtual home staging.
3. Confirm preview/trial/install caveats are present but no longer dominate
   before the product value is clear.
4. Confirm metadata title/description/OG/canonical choices are improved or any
   root deployment blocker is clearly recorded.
5. Confirm the implementation does not claim a new license/open-source status.
6. Confirm it does not make GitHub settings, robots/sitemap, screenshots, or
   broad redesign changes.
7. Confirm `landing` builds cleanly.
8. Use `docs/public-face/reviews/protocol.md` and the templates under
   `docs/public-face/reviews/templates/` to record a short public-standing
   validation note: what wrong inferences should improve, what remains.

## Save Evidence

Save notes under:

```text
testing/initiatives/public-face/2026-05-07_root-staging-story-alignment/evidence/
```

Suggested evidence:

- file enumeration
- build log
- copy/metadata audit
- public-standing score note or wrong-inference note

## Result

Write findings to:

```text
testing/initiatives/public-face/2026-05-07_root-staging-story-alignment/result.md
```

Include:

- pass/fail verdict
- product commit under test
- files reviewed
- build result
- whether the public story is clearer
- any root-domain source/deployment gap
- any remaining public-standing risks
