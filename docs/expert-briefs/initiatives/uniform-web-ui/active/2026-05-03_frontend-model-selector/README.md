# Sprint Pack: Frontend Model Selector

The first cross-platform UI sprint that lights up on every node uniformly the moment its bundle reaches them.

## Why this sprint

The `/v1/models` (list) and `/v1/models/load` (switch) HTTP endpoints landed on `main` via the `feature/mlx-llm-engine` merge (`9be3c7d`). They're available today on the iOS node and on the backend; Android already has its own `/v1/models` per Codex's `feature/android-model-catalog` sprint (commit `6363444`). What's missing is a UI consumer in the SPA — a panel that shows the available models, the currently loaded one, and a button to switch.

This is also the first cross-platform UI sprint: the same React panel will work on every node that serves the Command Center SPA, because the contract is identical above the line. (Architecture doc `docs/ARCHITECTURE_NODE_PARITY.md` §2: "menu items have one shape across platforms.")

## Sprint topic

`feature/frontend-model-selector`

Goal:

- new panel in `frontend/src/components/` (or extension to `ChatPanel.tsx`) that:
  - calls `GET /v1/models` to populate a model picker
  - shows which model is currently loaded
  - calls `POST /v1/models/load` with `{model_id}` on user selection
  - shows load progress / errors honestly
- vite build green; the new bundle lands in `backend/app/static/`

## Files in this pack

- `01-brief.md` — what the coding agent should do
- `02-result-template.md` — how the coding agent reports back
- `03-merge-note-template.md` — how the owner records promotion/hold

The validator request for this sprint lives in:

- `mobile/testing/requests/FRONTEND_MODEL_SELECTOR_TEST_REQUEST_2026-05-03.md`

## Reference: per the architecture doc

This sprint is the first concrete consumer of the unified menu surface. If implemented well, the same UI works on backend and iOS today; on Android once the SPA bundle reaches it via the build-pipeline sprint; on future SBC nodes when they come online. That's the fabric working as designed.
