# Result — Root/Staging Story Alignment

**Sprint:** 2026-05-07_root-staging-story-alignment
**Branch:** feature/public-face/root-staging-story-alignment
**Date:** 2026-05-07

## Verdict

**PASS.** The repo-controlled public surfaces now tell one coherent product story.

## Product Commit Under Test

```
8839bac924c14af94d909ac690978543a49c1056
```

(base: `origin/main`, before sprint changes applied)

## Files Changed

- `README.md` — opener and staging preamble rewritten
- `landing/index.html` — title, description, OG, Twitter, structured data, noscript updated
- `landing/src/LandingPage.tsx` — hero caveat box, #start section intro, CTA section copy updated
- `landing/src/i18n.ts` — `hero_badge` and `hero_desc` English strings updated
- `docs/public-face/reviews/2026-05-07_baseline/2026-05-07_root-staging-story-alignment_implementation-note.md` — before/after note added
- `testing/initiatives/public-face/2026-05-07_root-staging-story-alignment/result.md` — this file

ScoutFlow.tsx was reviewed and did not need CTA/handoff changes.

## Build Result

```
npm --prefix landing run build
```

PASS. Vite build completed successfully (3.87s). No errors.

## Story Changes Summary

### Before

- README said "local AI brain for documents, translation, cameras" and claimed "Open core"
- landing/index.html metadata led with "Public preview page" in title, description, OG, and structured data
- LandingPage.tsx used "local AI service team" phrasing; "staging URL", "canonical summary", and "private admin console" appeared prominently before product value
- Root domain told a different "Smart Home Intelligence" story

### After

- README opener: "A local AI home brain for private document chat, voice, translation, network awareness, and agent workflows — on machines you control." Removed "Open core" claim. Staging preamble reduced.
- landing/index.html title: "iHomeNerd — Local AI Home Brain for Private Data". Descriptions lead with product identity.
- LandingPage.tsx hero_badge: "Public repo. Local AI home brain." hero_desc aligned to canonical story. "staging URL", "canonical summary", "private admin console" wording removed from hero caveat box and install-path sections.
- Preview truthfulness remains (one "public preview" mention per file), but it is brief and appears after product value.

### Keyword audit

`home staging`, `private admin`, `canonical summary`, and `staging URL` — zero matches in modified source files. Remaining "public preview" mentions (one per file in README.md, landing/index.html, landing/src/LandingPage.tsx) are deliberate and truthful.

## Remaining Root-Domain Source Gap

The root domain (`ihomenerd.com`) splash page source is outside this repo. As of 2026-05-07, it serves a different product story ("Smart Home Intelligence") than what the staging landing page and README now describe ("Local AI Home Brain"). The canonical and OG URLs remain `https://staging.ihomenerd.com/` because the staging landing page is the truthful target until root deployment is aligned.

## Validation Handoff Notes

- **Validator branch:** validation/public-face/root-staging-story-alignment
- **Protocol:** `docs/public-face/reviews/protocol.md`
- **Templates:** `docs/public-face/reviews/templates/`
- Expected validation improvements: category clarity, root/staging consistency, and "works today" clarity should score higher. "staging/preview over-signaling" wrong inferences should be reduced.
- Known remaining: root domain source gap, no license decision, no robots/sitemap.
