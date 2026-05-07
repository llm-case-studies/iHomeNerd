# Public Standing Reviews

This folder tracks how iHomeNerd's public surface is understood by outsiders
over time.

The goal is not to prove that the product is good. The goal is to measure what
the public surface causes a cold visitor, search engine, or AI summarizer to
infer.

Use this folder before and after public-face improvement sprints.

## Review Rhythm

Run a review:

- before a public-face improvement sprint, to capture the baseline
- after the sprint lands publicly, to measure movement
- after major changes to root site, staging site, README, license, repo
  metadata, screenshots, or crawl metadata

## Folder Shape

```text
docs/public-face/reviews/
  README.md
  protocol.md
  templates/
    panel-prompts.md
    scorecard.md
    wrong-inference-log.md
    synthesis.md
  2026-05-07_baseline/
    README.md
```

## Review Principle

Treat every wrong outsider inference as a public-face bug.

Examples:

- "This is virtual home staging."
- "The repo looks abandoned."
- "It is unclear whether reuse is allowed."
- "The product seems private/internal because staging dominates the story."

The review process should show whether those bugs disappear after sprints.
