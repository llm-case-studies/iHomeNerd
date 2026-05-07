# OpenCode Kickoff - Public Face Foundation

You are working on the `public-face` initiative in `iHomeNerd`.

This is a docs-and-governance sprint, not a landing-code redesign sprint.

## Start Clean

Before switching branches, check:

```bash
git status --short --branch
git fetch origin
```

If the worktree is dirty, stop and report the files. Do not overwrite local
changes.

Create the implementation branch from `origin/main`:

```bash
git switch -c feature/public-face/public-face-foundation origin/main
```

Do not work on `main`.

## Read First

1. `docs/expert-briefs/README.md`
2. `docs/expert-briefs/LESSONS.md`
3. `docs/expert-briefs/initiatives/public-face/README.md`
4. `docs/expert-briefs/initiatives/public-face/INDEX.md`
5. `docs/WEB_PRICING_AND_LAUNCH_PLAN_2026-04-10.md`
6. `README.md`
7. `landing/index.html`
8. `landing/src/LandingPage.tsx`
9. `testing/initiatives/public-face/2026-05-07_public-face-foundation/request.md`

## Task

Create the first durable public-face lane:

- `docs/public-face/README.md`
- `docs/public-face/INDEX.md`
- dated research note for external AI impressions
- dated audit of root site, staging site, and GitHub public surface
- dated prioritized workstreams/backlog
- initiative README/index
- testing mirror for this sprint

The goal is to make the 2026-05-07 thread reusable, not to leave it trapped in
chat history.

## Fence

Allowed:

- `docs/public-face/`
- `docs/expert-briefs/initiatives/public-face/`
- `testing/initiatives/public-face/`
- `README.md` doc-link cleanup if useful

Do not change:

- `landing/src/`
- `frontend/src/`
- `backend/`
- `mobile/`
- runtime behavior
- deployment scripts

## Required Output

The created docs should clearly capture:

- what outside AI systems inferred
- what was actually observed on 2026-05-07
- where the public surfaces disagree
- what matters most to fix first

## Smoke and Result

Run:

```bash
rg --files docs/public-face docs/expert-briefs/initiatives/public-face testing/initiatives/public-face
git diff --check
```

Fill:

```text
testing/initiatives/public-face/2026-05-07_public-face-foundation/result.md
```

Record:

- commit SHA
- files created
- any remaining ambiguity not resolved by the docs scaffold
