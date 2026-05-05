# Kickoff Prompt: Adapter Families and Client Ports

## Context

This discussion builds on the completed **client surface boundary review**
(2 rounds, 7 reviewers). Read the prior synthesis for context:

- `../2026-05-04_client-surface-boundary-review/round-2-synthesis.md`

Key decisions already made (do not re-litigate):
- Core surface: ~16-20 route families, Tier 0/1
- Plugin namespace: `/v1/plugins/{plugin_id}/...`
- ASR/TTS/voices are core (being extracted to `domains/speech.py`)
- iHN is a general local AI platform (iOfficeNerd = commercial deployment)

## Your task

Please review the discussion sprint at:

`docs/expert-briefs/initiatives/uniform-web-ui/active/2026-05-05_adapter-families-and-client-ports/`

Start with:

- `README.md`
- `01-seed.md`

Then respond using:

- `02-feedback-template.md`

Focus on:

- whether `client apps` are the right architecture unit, or only pressure tests
- what the reusable server-side adapter families should be
- what the client-side app core / capability port / provider adapter model
  should look like
- whether similar discussions should begin in client repos now, or after this
  cross-client draft stabilizes

This is a discussion-only sprint:

- no coding
- no testing
- no implementation branch changes

Treat the current structure as a strong draft, not a final doctrine.
Challenge the boundaries where needed.

**Save your response to a file.** Use this exact path and naming convention:

```
docs/expert-briefs/initiatives/uniform-web-ui/active/2026-05-05_adapter-families-and-client-ports/responses/<your-model-name>-round-1.md
```

For example: `responses/deepseek-round-1.md`, `responses/grok-round-1.md`.
Use lowercase, hyphenated model name.

Do not skip this step. Feedback that only exists in chat history is lost.
