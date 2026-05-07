# OpenCode Kickoff - Root/Staging Story Alignment

Paste this into the coding OpenCode session on `Acer-HL`.

```text
You are implementing the next iHomeNerd public-face sprint.

Repo: iHomeNerd
Initiative: public-face
Sprint: 2026-05-07_root-staging-story-alignment
Implementation host: Acer-HL
Build host: any Node/Vite-capable host
Validation host: iMac-Debian
Base branch: origin/main
Working branch: feature/public-face/root-staging-story-alignment
Merge target: main after validation

Start clean:

git status --short --branch
git fetch origin
git switch -c feature/public-face/root-staging-story-alignment origin/main

Read first:

1. docs/public-face/README.md
2. docs/public-face/INDEX.md
3. docs/public-face/audits/2026-05-07_public-surface-audit.md
4. docs/public-face/backlog/2026-05-07_public-face-workstreams.md
5. docs/public-face/reviews/protocol.md
6. docs/public-face/reviews/templates/scorecard.md
7. docs/public-face/reviews/templates/wrong-inference-log.md
8. docs/expert-briefs/initiatives/public-face/active/2026-05-07_root-staging-story-alignment/01-brief.md
9. testing/initiatives/public-face/2026-05-07_root-staging-story-alignment/request.md

Primary outcome:

Make root/staging/README public story alignment better. A cold visitor should
infer that iHomeNerd is a local AI home brain for private document chat, voice,
translation, network awareness, and agent workflows on machines they control.

Allowed implementation surface:

- README.md opener and public preview wording
- landing/index.html title, description, canonical/OG/story metadata where truthful
- landing/src/LandingPage.tsx first-viewport story, preview caveats, CTAs, and repeated staging wording
- landing/src/ScoutFlow.tsx only if CTA/handoff wording needs alignment
- docs/public-face/reviews/2026-05-07_baseline/ only if you add a brief before/after note
- testing/initiatives/public-face/2026-05-07_root-staging-story-alignment/result.md

If the root homepage source is not in this repo, do not invent or overwrite it.
Record the gap clearly and align the repo-controlled public surfaces that do
exist.

Out of scope:

- license decision or adding LICENSE
- GitHub repo settings, topics, releases, stars, or discussions
- robots.txt, sitemap.xml, social preview image generation
- broad visual redesign
- Command Center UI changes
- full landing-page localization
- pricing/business-model policy changes beyond clearer wording of existing
  public/free/preview claims

Required checks before push:

- npm --prefix landing run build
- git diff --check
- rg -n "home staging|private admin|canonical summary|staging URL|public preview" README.md landing/index.html landing/src

Result note:

Fill testing/initiatives/public-face/2026-05-07_root-staging-story-alignment/result.md with:

- final commit SHA
- files changed
- build result
- summary of story changes
- any remaining root-domain source gap
- validation handoff notes

Commit and push:

git status --short --branch
git add README.md landing/index.html landing/src testing/initiatives/public-face/2026-05-07_root-staging-story-alignment/result.md docs/public-face/reviews/2026-05-07_baseline
git commit -m "feat: align public root and staging story"
git push origin feature/public-face/root-staging-story-alignment

Stop and report if the branch base is not origin/main or if unrelated local
changes are present.
```
