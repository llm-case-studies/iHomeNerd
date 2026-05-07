# BranchMap CLI

Read-only branch topology and governance tool for multi-agent, multi-host
repositories.

Reports each branch's relationship to a chosen base, groups branches by
initiative and prefix, and surfaces explainable warnings for suspicious
branch patterns.

All Git operations are read-only. This tool never creates, switches, deletes,
renames, merges, rebases, or pushes branches.

## Usage

```bash
python3 tools/branch-map/branch_map.py --repo . --base origin/main
python3 tools/branch-map/branch_map.py --repo . --base origin/main --format json
python3 tools/branch-map/branch_map.py --repo . --base origin/main --format json --output report.json
```

### Options

| Option | Default | Description |
|---|---|---|
| `--repo` | `.` | Path to the git repository |
| `--base` | `origin/main` | Base ref to compare branches against |
| `--format` | `text` | Output format: `text` or `json` |
| `--output` | `(stdout)` | Write output to file instead of stdout |

## Output

### Text Report

Displays branches grouped by initiative, with:

- branch name
- prefix (`feature/`, `validation/`, `docs/`, `fix/`, `discussion/`, `wip/`)
- ahead/behind commit counts versus the chosen base
- merge-base short SHA and date
- merged / diverged / ahead / behind / even status
- tip SHA and date
- warnings for suspicious branch patterns

### JSON Report

Machine-readable output with the same fields as the text report, structured
as a JSON array under `branches`.

## Warnings

The tool applies a small set of explainable warning rules:

| Warning | Condition |
|---|---|
| Unknown prefix | Branch name does not match `feature/`, `validation/`, `docs/`, `fix/`, `discussion/`, or `wip/` |
| Long-running wip | `wip/*` branch with no commits in over 30 days |
| Diverged wip | `wip/*` branch ahead + behind > 20 commits |
| Very far behind | Branch behind base by > 50 commits |
| Ahead + behind, no initiative | Branch diverged but not grouped under a known initiative |
| Cross-repo vocabulary | Branch name references another repo (e.g. `office-clerk` in `iHomeNerd`) |
| Validation without feature | `validation/` branch exists without a corresponding `feature/` branch |
| Feature without validation (info) | Informational note when a `feature/` branch has no nearby `validation/` evidence |

Local `main` being behind `origin/main` is treated as a quiet status note,
not a warning.

## Running Tests

```bash
python3 -m pytest tools/branch-map/tests/ -v
```

## Exit Codes

- `0`: success (governance warnings do not cause nonzero exit)
- `1`: tool or runtime error (e.g. repo not found, git command failed)
