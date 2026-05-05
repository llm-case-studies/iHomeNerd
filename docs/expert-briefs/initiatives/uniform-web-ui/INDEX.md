# Uniform Web UI Initiative Index

## Active discussion sprints

- `active/2026-05-04_client-surface-boundary-review/`
- `active/2026-05-05_adapter-families-and-client-ports/`

## Intended outcome

Turn spike-era route and capability decisions into a cleaner client-facing
surface model:

- stable iHN product surface
- adapter/plugin surface
- app-owned workflows and UX

The current sprint is discussion-only. It should end in a conceptual plateau
that is strong enough to seed later coding/testing work.

## Ready follow-on work

Conceptual:

- `active/2026-05-05_adapter-families-and-client-ports/`
  - tunes the model from client-centric examples toward need categories,
    server-side adapter families, and client-side capability ports

Practical:

- mirror this discussion lightly into selected client repos after the adapter
  family draft stabilizes
- preferred first mirrors:
  - `PronunCo`
  - one non-speech client such as `iMedisys` or `iLegalFlow`
- do not start all client discussions in parallel; use one speech-heavy and one
  docs/rules-heavy client as pressure tests first
