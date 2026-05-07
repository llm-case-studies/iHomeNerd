# Repo Orchestration Lessons

- **Visibility before automation.** The first branch governance tool should be
  read-only. A tool that can merge, delete, or rewrite branches is too much
  authority for sprint one.
- **Branch names are evidence, not truth.** A branch named for an initiative can
  still be based from the wrong parent or pushed to the wrong repo.
- **Local main behind remote main is normal in multi-host work.** Treat it as a
  quiet status note unless the user is about to branch from the stale local
  ref.
- **Cross-repo vocabulary is a warning.** A branch like
  `feature/repo-bootstrap/office-clerk-bootstrap` inside `iHomeNerd` may be
  intentional, but the tool should make Alex notice it.
- **History matters.** Cleanup history is useful training data for future
  agents and useful governance evidence for humans.
