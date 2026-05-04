# Sprint Pack: Client Surface Boundary Review

**Sprint type:** discussion-only  
**Initiative:** `uniform-web-ui`  
**Date:** 2026-05-04

This sprint exists to answer one product question before we create more routes,
UI, or contract fixes:

> What should be part of the stable client-facing iHN surface, and what should
> remain in adapters, plugins, helpers, or app-owned workflows?

Use this pack to collect viewpoints from Codex, Claude, DeepSeek, Gemini, or
human reviewers. The target is not consensus for its own sake. The target is a
cleaner boundary model that can later drive a real coding/testing sprint.

Files:

- `01-seed.md` - framing, working model, and concrete questions
- `02-feedback-template.md` - structured response guide for contributors
- `03-synthesis-template.md` - decision log for convergence
- `04-portfolio-working-list.md` - current startup/client inventory and first-pass
  relationship to iHN
- `05-participant-invite.md` - reusable handoff note for AI or human reviewers

## Participant expectations

Contributors should:

- read `01-seed.md` first
- use `04-portfolio-working-list.md` as context, not as doctrine
- challenge category mistakes, hidden assumptions, and route-boundary leakage
- prefer concrete route/capability examples over abstract philosophy
- avoid jumping into code proposals unless a code example is needed to clarify a
  boundary

Contributors should **not**:

- treat the current taxonomy as final
- bikeshed wording while ignoring the boundary model
- assume that every useful helper must become a public stable iHN route
- collapse sibling products, deployment variants, and client apps into one
  bucket

## Expected deliverables

Each participant should ideally leave:

1. one completed response using `02-feedback-template.md`, or equivalent
2. at least 2-3 concrete classification recommendations
3. at least one disagreement, tension, or uncertainty worth preserving
4. if useful, one candidate follow-on sprint topic

Strong contributions usually do one or more of these:

- move a product from `client` to `sibling` or `deployment`
- move a helper from `core` to `adapter/plugin`
- argue that a stable primitive should exist below multiple apps
- show where a current capability leaks too much app semantics into iHN core

Exit condition:

- we reach a stable-enough boundary model for client-facing iHN surface work
- then cut a coding/testing sprint from `origin/main`
