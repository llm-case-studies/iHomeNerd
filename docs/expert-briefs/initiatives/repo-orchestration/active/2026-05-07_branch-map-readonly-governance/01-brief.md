# Expert Brief - BranchMap Read-Only Governance

**Date:** 2026-05-07
**Initiative:** `repo-orchestration`
**Status:** active sprint
**Audience:** OpenCode implementer on `Acer-HL`

## Why This Sprint Exists

Alex needs an immediate way to see branch topology before an agent-created mess
turns into archaeology. Recent cleanup made the `iHomeNerd` branch tree readable
again, but agents can create plausible-looking disorder quickly.

Sprint one should produce a local, read-only branch map that runs in a terminal
and uses Git facts already present in the checkout.

## Execution Fence

- Repo: `iHomeNerd`
- Base branch: `origin/main`
- Working branch: `feature/repo-orchestration/branch-map-readonly-governance`
- Merge target: `main` after validation
- Implementation host: `Acer-HL`
- Validation host: `iMac-Debian`
- Build/deploy host: not applicable

This is tooling work. Do not change backend, frontend, landing, browser
extension, Android, or iOS product behavior.

## References

Read first:

- `docs/expert-briefs/README.md`
- `docs/expert-briefs/LESSONS.md`
- `docs/expert-briefs/initiatives/repo-orchestration/README.md`
- `docs/expert-briefs/initiatives/repo-orchestration/INDEX.md`
- `docs/expert-briefs/initiatives/repo-orchestration/LESSONS.md`
- `docs/expert-briefs/initiatives/repo-orchestration/active/2026-05-07_branch-map-readonly-governance/README.md`
- `testing/initiatives/repo-orchestration/2026-05-07_branch-map-readonly-governance/request.md`

Useful current examples:

- `docs/expert-briefs/initiatives/iphone-to-mac-brain/INDEX.md`
- `docs/expert-briefs/initiatives/android-node-core/INDEX.md`
- `docs/expert-briefs/initiatives/apple-release-engineering/INDEX.md`

## Product Goal

Add a small read-only branch governance CLI. Suggested path:

```text
tools/branch-map/branch_map.py
tools/branch-map/README.md
tools/branch-map/tests/
```

Use Python standard library unless there is a strong reason not to. The tool
should run without installing repo-wide frontend or backend dependencies.

Minimum command shape:

```bash
python3 tools/branch-map/branch_map.py --repo . --base origin/main
python3 tools/branch-map/branch_map.py --repo . --base origin/main --format json
```

## Required Behavior

The CLI must:

- inspect local and remote-tracking branches using read-only `git` commands
- show each branch's relationship to the chosen base
- report ahead/behind counts
- show merge-base short SHA and date
- group or label branches by initiative when branch names match the current
  convention
- distinguish `feature/`, `validation/`, `discussion/`, `docs/`, `fix/`, and
  `wip/` prefixes
- produce a readable text report for humans
- produce a JSON report for later tools
- exit non-zero only for tool/runtime errors, not for governance warnings

## Warning Rules

Implement a small first set of warnings. Keep them explainable.

Required warnings:

- branch is outside known naming prefixes
- branch is ahead of base and not clearly grouped by initiative
- branch is very far behind base
- branch is both ahead and behind base
- `wip/*` branch is long-running or substantially diverged
- branch name appears to contain another repo's vocabulary, for example
  `office-clerk` inside `iHomeNerd`
- validation branch exists without an obvious feature branch with the same
  initiative/sprint slug
- feature branch exists without nearby validation evidence, reported as an
  informational note rather than a failure

Treat local `main` being behind `origin/main` as a quiet status note, not a
scary warning, unless the current branch is about to be used as the base.

## Suggested Git Facts

Useful commands:

```bash
git for-each-ref refs/heads refs/remotes --format=...
git merge-base <base> <branch>
git rev-list --count <base>..<branch>
git rev-list --count <branch>..<base>
git log -1 --format=...
git branch -r --merged <base>
git branch -r --no-merged <base>
```

Do not require GitHub API access in sprint one. If the user has not fetched,
report that the view is based on current local refs.

## Smoke Expectations

At minimum, smoke the tool against:

- this `iHomeNerd` checkout
- a temporary fixture repo created by the tests

If available on the implementation host, also smoke against:

- `/Users/alex/Projects/PronunCo-orchestration-init`
- `/Users/alex/Projects/office-clerk`

Do not fail the sprint if optional repos are absent. Record what was available.

## Out Of Scope

- branch deletion, rename, merge, rebase, or checkout
- GitHub write operations
- UI/dashboard work
- Office Clerk integration
- persistent snapshot storage
- `BranchMuseum` before/after reports
- reconstructing all old cleanup history
- modifying product runtime code

## Done Means

- CLI implemented under `tools/branch-map/`
- README explains usage and warning meanings
- tests cover classification and warning logic
- local smoke output captured in the result note
- validation request remains runnable on `iMac-Debian`
- branch pushed for validation
