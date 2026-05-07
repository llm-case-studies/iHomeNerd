# Repo Orchestration Initiative

This initiative tracks governance and coordination tooling for multi-agent,
multi-host development across `iHomeNerd`, `PronunCo`, `office-clerk`, and
related infrastructure repos.

It is not a product feature lane. Product behavior belongs in the owning
product initiative. This lane exists to keep agents, branches, validation
evidence, and handoffs visible enough that Alex can govern the system without
reconstructing history from chat memory.

## Current Operating Principle

Start with read-only visibility.

The first useful tool should show the branch tree, grouped by initiative, with
clear warnings for drift, stale branches, misplaced repo vocabulary, stranded
validation, and old divergent lines. It must not merge, delete, rename, rebase,
or create branches.

## Terms

- `BranchMap`: current operational view of branch topology and branch health.
- `BranchMuseum`: future historical mode for preserving before/after cleanup
  snapshots and telling the cleanup story.

`BranchMuseum` is a strong product name, but it is not sprint-one scope.

## Guardrails

- Prefer local Git facts over chat recollection.
- Treat GitHub PR metadata as useful context, not the only source of truth.
- Keep branch governance read-only until Alex explicitly asks for automation.
- Do not touch product runtime code from orchestration sprints unless a later
  sprint explicitly moves tooling into a product surface.
- Make warnings explainable. A human should be able to see why a branch was
  marked suspicious.
