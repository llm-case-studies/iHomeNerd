# OpenCode Kickoff - BranchMap Read-Only Governance

You are working on the `repo-orchestration` initiative in `iHomeNerd`.

This is a tooling sprint, not product runtime work.

## Start Clean

Before switching branches, check:

```bash
git status --short --branch
git fetch origin
```

If the worktree is dirty, stop and report the files. Do not overwrite local
changes.

Create the implementation branch from current `origin/main`:

```bash
git switch -c feature/repo-orchestration/branch-map-readonly-governance origin/main
```

Do not work on `main`.

## Read First

1. `docs/expert-briefs/README.md`
2. `docs/expert-briefs/LESSONS.md`
3. `docs/expert-briefs/initiatives/repo-orchestration/README.md`
4. `docs/expert-briefs/initiatives/repo-orchestration/INDEX.md`
5. `docs/expert-briefs/initiatives/repo-orchestration/LESSONS.md`
6. `docs/expert-briefs/initiatives/repo-orchestration/active/2026-05-07_branch-map-readonly-governance/01-brief.md`
7. `testing/initiatives/repo-orchestration/2026-05-07_branch-map-readonly-governance/request.md`

## Task

Build the first read-only `BranchMap` CLI.

Suggested files:

```text
tools/branch-map/branch_map.py
tools/branch-map/README.md
tools/branch-map/tests/
```

Minimum commands that should work:

```bash
python3 tools/branch-map/branch_map.py --repo . --base origin/main
python3 tools/branch-map/branch_map.py --repo . --base origin/main --format json
```

## Fence

Allowed:

- new files under `tools/branch-map/`
- tests for the branch-map tool
- documentation for the tool
- result note updates

Do not change:

- `backend/`
- `frontend/`
- `landing/`
- `browser-extension/`
- `mobile/`
- product docs unrelated to this sprint

## Required Tool Behavior

The tool must be read-only. It may run Git inspection commands, but it must not
create, switch, delete, rename, merge, rebase, or push branches.

It should report:

- branch name
- branch prefix and initiative when inferable
- ahead/behind counts versus the chosen base
- merge-base short SHA and date
- merged/no-merged/diverged-ish status
- warnings for suspicious branch patterns
- human-readable text output
- machine-readable JSON output

## Smoke and Result

Run tests and smoke the CLI against this repo.

Optional smoke if paths exist:

```bash
python3 tools/branch-map/branch_map.py --repo /Users/alex/Projects/PronunCo-orchestration-init --base origin/staging
python3 tools/branch-map/branch_map.py --repo /Users/alex/Projects/office-clerk --base origin/main
```

Fill:

```text
testing/initiatives/repo-orchestration/2026-05-07_branch-map-readonly-governance/result.md
```

Push the branch and report:

- commit SHA
- tests run
- smoke repos inspected
- warnings shown for `iHomeNerd`
- validation handoff notes for `iMac-Debian`
