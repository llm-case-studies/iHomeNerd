# Result - BranchMap Read-Only Governance

- Verdict: PASS (implementation smoke-ready, follow-up fix applied)
- Product commit: `92b094181809d14f4b7f1e518c87043a11d79a14`
- Follow-up fix commit: (see below)
- Implementation host: `Acer-HL` (OpenCode on Linux)
- Validation host: `iMac-Debian`
- Validator branch: `validation/repo-orchestration/branch-map-readonly-governance`

## Follow-Up Fix: Git Worktree Support (2026-05-06)

**Issue:** BranchMap failed in Git worktrees because `tools/branch-map/branch_map.py`
checked `os.path.isdir(os.path.join(repo_path, ".git"))`. In Git worktrees,
`.git` is a file (pointing to the main repo), not a directory.

**Fix:** Replaced the directory check with a read-only `git rev-parse --git-dir`
call via a new `is_git_repo()` helper. This correctly detects both normal repos
and worktrees.

**Tests added:** `test_cli_worktree_support` — creates a worktree via
`git worktree add`, verifies `.git` is a file, runs the CLI in the worktree,
and confirms it succeeds.

**All 31 tests passing** (30 original + 1 new worktree test).

## Commands Run

```bash
# Tests
python3 -m pytest tools/branch-map/tests/ -v

# Smoke against iHomeNerd
python3 tools/branch-map/branch_map.py --repo . --base origin/main
python3 tools/branch-map/branch_map.py --repo . --base origin/main --format json

# JSON parse check
python3 -m json.tool <json-output>
```

## Read-Only Verification

Before and after running the CLI, branch refs were captured:

```
docs/repo-orchestration/branch-map-sprint-setup 56a8983
feature/android-model-catalog cfb7bee
feature/android-node-core/build-provenance-surface 5b986d4
feature/android-node-core/nsd-observability-and-mdns-truthfulness fc8a807
feature/android-server-profile-surface 0361989
feature/android-uniform-web-serving 759edd0
feature/iphone-to-mac-brain/mac-launchd-sidecar-service 1756e95
feature/iphone-to-mac-brain/mac-mlx-runtime-preflight 6f1b55a
feature/iphone-to-mac-brain/mlx-chat-contract-cleanup cd16348
feature/iphone-to-mac-brain/pairing-approval 6548cb0
feature/repo-bootstrap/office-clerk-bootstrap 5b8baf8
feature/repo-orchestration/branch-map-readonly-governance 56a8983
feature/uniform-web-ui/frontend-model-selector 181e200
feature/uniform-web-ui/speech-extraction-plugin-namespace 19b30aa
main 0b21580
wip/acer-hl 0b21580
```

No branches were created, switched, deleted, renamed, merged, rebased, or pushed by the tool.

## iHomeNerd Output Summary

43 branches analyzed against base `origin/main`.

Expected warnings confirmed:

- `origin/wip/testing` — substantially diverged (ahead 32, behind 78), very far behind base, not grouped by initiative
- `origin/staging` — old divergent line (ahead 13, behind 158), very far behind base
- `origin/feature/repo-bootstrap/office-clerk-bootstrap` — cross-repo vocabulary (`office-clerk` inside `iHomeNerd-coding`)
- Local `main` behind `origin/main` — quiet `[INFO]` note (105 commits behind, expected in multi-host workflows)
- `validation/iphone-to-mac-brain/ios-mac-setup-route-smoke` — validation without corresponding feature branch
- `validation/iphone-to-mac-brain/mac-mini-mlx-sidecar-smoke` — validation without corresponding feature branch
- Multiple `[INFO]` notes for feature branches without nearby validation evidence

## Optional Cross-Repo Smoke

Not available on this implementation host (Linux). Expected paths:
- `/Users/alex/Projects/PronunCo-orchestration-init`
- `/Users/alex/Projects/office-clerk`

These are macOS paths not present on the current implementation host. The validation host (`iMac-Debian`) should have these available.

## Validation Handoff Notes for `iMac-Debian`

1. Checkout `validation/repo-orchestration/branch-map-readonly-governance` from `origin/feature/repo-orchestration/branch-map-readonly-governance`
2. Run: `python3 -m pytest tools/branch-map/tests/ -v`
3. Smoke:
   ```bash
   python3 tools/branch-map/branch_map.py --repo . --base origin/main
   python3 tools/branch-map/branch_map.py --repo . --base origin/main --format json
   ```
4. Validate JSON parses with `python3 -m json.tool`
5. Run read-only check: capture `git status --short --branch`, `git rev-parse --abbrev-ref HEAD`, and `git for-each-ref` before and after
6. Confirm expected warnings appear in output (wip/testing, staging, office-clerk-bootstrap cross-repo vocab, local main quiet info note)
7. Optional cross-repo smoke if `/Users/alex/Projects/PronunCo-orchestration-init` and `/Users/alex/Projects/office-clerk` are available
8. Save evidence and update this result.md

## Files

```
tools/branch-map/branch_map.py      — main CLI
tools/branch-map/README.md          — usage and warning documentation
tools/branch-map/tests/__init__.py  — test package
tools/branch-map/tests/test_branch_map.py  — 30 tests (all passing)
```
