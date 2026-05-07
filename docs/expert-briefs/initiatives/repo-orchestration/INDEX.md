# Repo Orchestration Index

## Active Sprint

| Sprint | Status | Branch | Implementation Host | Validation Host | Purpose |
|---|---|---|---|---|---|
| `2026-05-07_branch-map-readonly-governance` | active | `feature/repo-orchestration/branch-map-readonly-governance` | `Acer-HL` | `iMac-Debian` | Build the first read-only branch topology and warning CLI. |

## Queued Candidates

| Candidate | Purpose | Notes |
|---|---|---|
| `branch-museum-snapshot-preservation` | Preserve branch cleanup history from local and remote-tracking refs. | Future mode after `BranchMap` is useful. |
| `multi-host-branch-snapshot-collection` | Gather reflog and remote-tracking evidence from Dell, Mac mini, Acer-HL, and iMac-Debian. | Read-only forensic sprint; useful before reflogs expire. |
| `office-clerk-governance-integration` | Decide whether Office Clerk should host branch-map outputs or just consume them. | Concept sprint before code. |

## Current Priority

First make `BranchMap` useful from a terminal. Do not start UI or museum work
until the current-tree view is reliable enough to catch branch mistakes before
they spread.
