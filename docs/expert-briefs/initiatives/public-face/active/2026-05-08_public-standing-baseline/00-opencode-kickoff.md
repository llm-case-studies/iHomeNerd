# OpenCode Kickoff - Public Standing Baseline

You are working on the `public-face` initiative in `iHomeNerd`.

This is a measurement sprint. Do not change product code.

## Start Clean

```bash
git status --short --branch
git fetch origin
git switch -c feature/public-face/public-standing-baseline origin/main
```

If the worktree is dirty, stop and report the files.

## Read First

1. `docs/public-face/reviews/protocol.md`
2. `docs/public-face/reviews/templates/panel-prompts.md`
3. `docs/public-face/reviews/templates/scorecard.md`
4. `docs/public-face/reviews/templates/wrong-inference-log.md`
5. `docs/public-face/reviews/templates/synthesis.md`
6. `docs/public-face/reviews/2026-05-07_baseline/README.md`
7. `testing/initiatives/public-face/2026-05-08_public-standing-baseline/request.md`

## Task

Complete the baseline review under:

```text
docs/public-face/reviews/2026-05-07_baseline/
```

Required artifacts:

- `input-snapshot.md`
- `panel-responses.md`
- `scorecard.md`
- `wrong-inference-log.md`
- `synthesis.md`

## Fence

Allowed:

- `docs/public-face/reviews/2026-05-07_baseline/`
- `docs/expert-briefs/initiatives/public-face/`
- `testing/initiatives/public-face/`

Do not change:

- `landing/`
- `frontend/`
- `backend/`
- `README.md`
- deployment scripts
- GitHub settings
- license files

## Validation

Run:

```bash
rg --files docs/public-face/reviews/2026-05-07_baseline
git diff --check
```

Record results in:

```text
testing/initiatives/public-face/2026-05-08_public-standing-baseline/result.md
```
