# Public Standing Scorecard

**Review date:** 2026-05-08
**Review label:** baseline after root/staging story-alignment promotion
**Compared to:** 2026-05-07 public surface audit

Use 1-5 scores.

| Dimension | Score | Evidence | Change vs previous |
|---|---:|---|---|
| Category clarity | 3 | Promoted README/landing source now says local AI home brain; live root still says smart-home intelligence. | improved in repo source, unchanged live |
| Root/staging consistency | 2 | Live root and live staging still tell different stories; promoted landing source is not deployed yet. | slightly improved in source only |
| "Works today" clarity | 3 | README and staging describe Docker today, VM next, live image later; root page does not explain this. | improved in README/source |
| Install/onboarding confidence | 3 | README gives quick start and Docker compose, but no polished release or one-line image. | stable |
| Trust/legal clarity | 2 | README removed `Open core`, but GitHub license remains null. | improved by removing overclaim, still weak |
| Repo credibility | 3 | Good README/docs and recent push, but no description, homepage, topics, releases, screenshots, or license. | stable to slightly improved |
| Visual/professional polish | 3 | Root page is polished but stale; staging is richer but still preview-heavy. | stable |
| AI/search-summary accuracy | 2 | Live root/staging mismatch still invites category drift and staging-overemphasis. | source improved, live not yet |
| Next-action clarity | 3 | Staging and README offer current paths; root CTA only sends to staging. | improved in README/source |

## Summary

- Biggest improvement: repo-controlled story now has a stronger canonical
  product definition.
- Biggest remaining weakness: live root and live staging are still behind the
  promoted source.
- New confusion introduced: none found; the main confusion is deployment lag.
- Recommended next sprint: deploy/replace the live root and staging public
  pages from the promoted story, then clean up GitHub trust metadata.
