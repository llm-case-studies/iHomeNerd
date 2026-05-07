# BranchMap Read-Only Governance

## Goal

Create the first working `BranchMap`: a read-only terminal tool that shows the
current branch topology of a repo clearly enough for Alex to notice when agent
branching goes strange.

This sprint should produce a practical CLI and validation evidence. It should
not build a UI, mutate branches, or implement the future `BranchMuseum` mode.

## Why This Sprint Exists

Multi-agent work can create branches faster than humans can inspect them.
`iHomeNerd` is now in a much cleaner shape than it was a week ago, but that
cleanliness needs an early-warning instrument.

The tool should answer:

- what branches exist?
- where did they fork from the baseline?
- which initiative do they appear to belong to?
- are they merged, ahead, behind, stale, divergent, or suspicious?
- are validation branches close to their feature branches?
