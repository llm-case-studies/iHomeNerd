# Feedback Template: Client Surface Boundary Review

Use this template for AI or human feedback.

## Reviewer

- Name / model:
- Date:

## High-level stance

- What is your overall view of the current boundary problem?
- Is the proposed 3-layer model workable: `core iHN`, `adapter/plugin`, and
  `app-owned`?

## Route and capability review

For each item below, mark one:

- `core`
- `adapter/plugin`
- `app-owned`
- `internal only`
- `unsure`

Then give one short reason.

Suggested items to classify:

- `/health`
- `/discover`
- `/capabilities`
- `/sessions`
- `/system/stats`
- `/setup/*`
- `/v1/chat`
- `/v1/translate`
- `/v1/transcribe-audio`
- `/v1/synthesize-speech`
- `/v1/voices`
- `/v1/models`
- `compare_pinyin`
- `normalize_pinyin`
- `extract_lesson_items`
- `generate_drill`
- `explain_score`
- `chat_persona`

## Leakage and confusion

- Which current surface leaks too much app/domain detail into iHN?
- Which helpers look more "product-level" than they really are?
- Which names/routes should be changed, namespaced, or hidden?

## Minimal contract for client apps

- What is the smallest stable public iHN surface a client app actually needs?
- What should apps be expected to own themselves?

## Recommendations

- Top 3 conceptual changes you would make
- Top 3 cleanup actions that should become later coding/testing sprints

