# Test Request - BranchMap Read-Only Governance

**Date issued:** 2026-05-07
**Initiative:** `repo-orchestration`
**Sprint:** `2026-05-07_branch-map-readonly-governance`
**Product branch:** `feature/repo-orchestration/branch-map-readonly-governance`
**Validator branch:** `validation/repo-orchestration/branch-map-readonly-governance`
**Validation host:** `iMac-Debian`

## What You Are Validating

Validate that the new `BranchMap` CLI gives a useful, read-only view of branch
topology and branch-health warnings.

This is a governance tool. The most important safety property is that it
inspects Git state without changing it.

## Product Commit Under Test

Record:

```bash
git rev-parse HEAD
```

from the product branch under test.

## Required Checks

Run the tool's test suite as documented by the implementation branch.

Then smoke the CLI against `iHomeNerd`:

```bash
python3 tools/branch-map/branch_map.py --repo . --base origin/main
python3 tools/branch-map/branch_map.py --repo . --base origin/main --format json
```

Confirm the JSON parses:

```bash
python3 -m json.tool <json-output-file>
```

Use a file path or shell capture appropriate to the implementation.

## Read-Only Check

Before and after running the CLI, capture:

```bash
git status --short --branch
git rev-parse --abbrev-ref HEAD
git for-each-ref refs/heads refs/remotes --format='%(refname:short) %(objectname:short)'
```

The tool must not create, switch, delete, rename, merge, rebase, or push
branches.

## Expected iHomeNerd Warnings

The exact wording may differ, but the report should make these conditions
visible:

- `origin/wip/testing` is long-running or substantially diverged
- `origin/staging` is an old divergent line
- `origin/feature/repo-bootstrap/office-clerk-bootstrap` contains
  `office-clerk` vocabulary inside `iHomeNerd`
- local `main` behind `origin/main`, if present on the validation host, is a
  quiet status note rather than a failure

## Optional Cross-Repo Smoke

If available on the validation host, also run:

```bash
python3 tools/branch-map/branch_map.py --repo /Users/alex/Projects/PronunCo-orchestration-init --base origin/staging
python3 tools/branch-map/branch_map.py --repo /Users/alex/Projects/office-clerk --base origin/main
```

Do not fail validation if those repos are absent. Record availability.

## Save Evidence

Save:

- text output for `iHomeNerd`
- JSON output for `iHomeNerd`
- parsed JSON confirmation
- before/after read-only check
- optional cross-repo outputs

under:

```text
testing/initiatives/repo-orchestration/2026-05-07_branch-map-readonly-governance/evidence/
```

## Result

Write findings to:

```text
testing/initiatives/repo-orchestration/2026-05-07_branch-map-readonly-governance/result.md
```

Include:

- pass/fail verdict
- commit under test
- validation host
- commands run
- whether read-only behavior was preserved
- whether expected warnings appeared
- any confusing output or missing governance signal
