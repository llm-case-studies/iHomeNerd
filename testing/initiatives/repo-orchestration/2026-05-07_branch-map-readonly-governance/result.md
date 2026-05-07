# Result - BranchMap Read-Only Governance

- Verdict: **PASS** (with one finding: worktree incompatibility)
- Product commit (implementation): `92b094181809d14f4b7f1e518c87043a11d79a14`
- Validator branch HEAD: `25129ad8b1e131d90524d20820f59f325b88835b`
- Validation host: Linux (Debian-based, iHomeNerd-testing repo)
- Validator branch: `validation/repo-orchestration/branch-map-readonly-governance`

## Commands Run

```bash
# Tests (30-test suite)
python3 -m unittest tools/branch-map/tests/test_branch_map.py -v

# Smoke against iHomeNerd
python3 tools/branch-map/branch_map.py --repo . --base origin/main
python3 tools/branch-map/branch_map.py --repo . --base origin/main --format json

# JSON parse check
python3 -m json.tool testing/initiatives/repo-orchestration/2026-05-07_branch-map-readonly-governance/evidence/json-output.json
```

## Test Results

```
Ran 30 tests in 0.834s
OK
```

All 30 tests pass. (Note: `pytest` was not available on this host; `unittest` was used instead — same test file, identical coverage.)

## Read-Only Verification

Before and after state captured via:
- `git status --short --branch`
- `git rev-parse --abbrev-ref HEAD`
- `git for-each-ref refs/heads refs/remotes --format='%(refname:short) %(objectname:short)'`

Branch refs before and after are **identical** (40 refs, all same SHAs). The only file modifications are the evidence files written by `--output`. No branches were created, switched, deleted, renamed, merged, rebased, or pushed. **Read-only behavior confirmed.**

## iHomeNerd Output Summary

40 branches analyzed against base `origin/main` (31 warnings, 5 info notes).

Expected warnings confirmed in output:

| Condition | Confirmed? | Detail |
|---|---|---|
| `origin/wip/testing` substantially diverged | PASS | ahead 32, behind 78; also flagged as very far behind base and not grouped by initiative |
| `origin/staging` old divergent line | PASS | ahead 13, behind 158; flagged as very far behind base and not grouped by initiative |
| `office-clerk` branch vocabulary in iHomeNerd | PASS | Both `office-clerk` and `office_clerk` vocab detected in `feature/repo-bootstrap/office-clerk-bootstrap` and `validation/repo-bootstrap/office-clerk-bootstrap` |
| Local `main` behind `origin/main` as quiet INFO | N/A | No local `main` branch exists on this validation host. The code correctly emits `[INFO]` for this condition when present (verified via code review of `branch_map.py:283-287`). No false positive. |
| Validation without feature branch | PASS | `validation/iphone-to-mac-brain/ios-mac-setup-route-smoke` and `validation/iphone-to-mac-brain/mac-mini-mlx-sidecar-smoke` flagged |
| Feature without validation (INFO) | PASS | 5 `[INFO]` notes for feature branches without nearby validation evidence |

## Worktree Compatibility Probe

**Finding: CLI fails with Git worktrees.**

The CLI checks `os.path.isdir(os.path.join(repo_path, ".git"))` at `tools/branch-map/branch_map.py:450`. In Git worktrees, `.git` is a **file** (not a directory) that contains a reference to the main `.git` directory. The CLI exits with `Error: '<path>' is not a git repository` when pointed at a worktree.

```
$ python3 tools/branch-map/branch_map.py --repo /tmp/branchmap-worktree-test --base origin/main --format json
Error: '/tmp/branchmap-worktree-test' is not a git repository
EXIT_CODE: 1
```

This is recorded as a finding, not fixed in validation. The fix would be to use `os.path.exists()` instead of `os.path.isdir()`, or call `git rev-parse --git-dir` for robust detection.

## Optional Cross-Repo Smoke

Not available on this validation host:
- `/home/alex/Projects/PronunCo-orchestration-init` — not found
- `/home/alex/Projects/office-clerk` — not found

These paths exist on macOS hosts per the original implementation notes.

## Evidence Files

```
testing/initiatives/repo-orchestration/2026-05-07_branch-map-readonly-governance/evidence/
├── text-output.txt       — text format against iHomeNerd (40 branches)
├── json-output.json      — JSON format against iHomeNerd (40 branches)
└── json-parsed.txt       — JSON parse confirmation (python3 -m json.tool output)
```

## Findings Summary

| Check | Result |
|---|---|
| 30-test suite | PASS (all 30 pass) |
| Text output against iHomeNerd | PASS |
| JSON output against iHomeNerd | PASS |
| JSON parses | PASS |
| Read-only behavior | PASS (refs identical before/after) |
| origin/wip/testing warning | PASS |
| origin/staging warning | PASS |
| office-clerk vocabulary warning | PASS |
| Local main quiet INFO | N/A (no local main branch; code correct) |
| Cross-repo smoke (PronunCo/office-clerk) | N/A (repos not on this host) |
| Worktree compatibility | **FAIL** — `.git` as file not handled |
