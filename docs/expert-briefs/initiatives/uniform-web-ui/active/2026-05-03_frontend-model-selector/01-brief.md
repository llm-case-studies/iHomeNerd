# Expert Brief — Frontend Model Selector Panel

**Date:** 2026-05-03
**Audience:** OpenCode coding agent (`Qwen` and `DeepSeek` are both reasonable candidates; pick at handoff time)
**Status:** active sprint

## Why this sprint exists

The `/v1/models` listing endpoint and `/v1/models/load` switch endpoint shipped to main via `feature/mlx-llm-engine` (commit `3318276`, merged into main as `9be3c7d`). Android has a parallel `/v1/models` shape (commit `6363444`). The backend has had model-listing concepts for a while.

What's missing: a UI consumer in the Command Center SPA. Without it, switching models on iOS requires a curl. DeepSeek's cross-platform perf compare was originally blocked by exactly this gap.

This sprint adds the panel. It's the first sprint where one piece of UI lights up on multiple node types at once.

This sprint should keep the panel small, contract-conformant, and styling-consistent with the existing Command Center.

## Execution Fence

- Repo: `iHomeNerd`
- Implementation host: `Acer-HL`
- Base branch: `origin/main`
- Working branch: `feature/frontend-model-selector`
- Merge target when validated: `main`
- Validation lane: `wip/testing`
- Build host (vite build): any host with node+npm; `iMac-macOS` is the conventional pick

## References

Read these first:

- `docs/ARCHITECTURE_NODE_PARITY.md` (on `feature/uniform-web-ui`) — §3 (menu item anatomy), §4 (lifecycle)
- `docs/expert-briefs/reference/2026-05-02_android-model-catalog/` — the Android-side model catalog sprint; tells you how the Android node's `/v1/models` payload is shaped
- `docs/expert-briefs/README.md` — sprint workflow rules

Relevant frontend sources:

- `frontend/src/CommandCenter.tsx` — top-level component; orchestrates the panels
- `frontend/src/components/ChatPanel.tsx` — adjacent panel; good style/pattern reference
- `frontend/src/components/SystemPanel.tsx` — another adjacent for layout cues
- `frontend/index.html` and `frontend/vite.config.ts` — vite is already set to output to `backend/app/static/`

iOS endpoint shape (what the panel consumes):

```bash
# from any iPhone with Hosting on:
curl -sk https://<iphone-ip>:17777/v1/models
```

returns:

```json
{
  "available": [
    {"id": "mlx-community/Qwen2.5-1.5B-Instruct-4bit", "name": "Qwen 2.5 Instruct", ...},
    {"id": "mlx-community/gemma-4-e2b-it-4bit", "name": "Gemma 4 E2B Instruct", ...}
  ],
  "loaded": "mlx-community/gemma-4-e2b-it-4bit",
  "backend": "mlx_ios"
}
```

```bash
curl -sk -X POST https://<iphone-ip>:17777/v1/models/load \
  -H 'Content-Type: application/json' \
  -d '{"model_id":"mlx-community/Qwen2.5-1.5B-Instruct-4bit"}'
```

returns:

```json
{
  "loaded": "mlx-community/Qwen2.5-1.5B-Instruct-4bit",
  "load_time_seconds": 4.32,
  "backend": "mlx_ios"
}
```

Errors (per the iOS handler in `NodeRuntime.swift`): 400 for unknown model id, 503 for OOM, 502 for other engine failures. Detail string in `body.detail`.

## Feature goal

Add a model selector panel to the Command Center SPA.

Smallest acceptable shape:

- a new component (file: `frontend/src/components/ModelsPanel.tsx` or similar)
- on mount: `GET /v1/models`, render a list, highlight the currently-loaded one
- a "Load this model" button per row that triggers `POST /v1/models/load` and shows in-flight + result state
- shows the response's `load_time_seconds` after a successful load
- shows the error `detail` honestly on failure (with the status code class — 400 vs 503 vs 502)
- integrate the new panel into `CommandCenter.tsx` so it's reachable

Visual: match the existing panel style. Don't redesign the dashboard.

## Acceptable implementation scope

Choose the smallest sensible slice. Good examples:

- one new `ModelsPanel.tsx` file with a simple list + load button
- one route entry / panel slot in `CommandCenter.tsx`
- light styling reusing existing classes from `ChatPanel.tsx`

Do **not** turn this into:

- a download progress widget (the load endpoint blocks; just show a spinner)
- a model marketplace browser
- a settings-tab redesign
- a TypeScript types refactor (add what you need, no ambient cleanup)
- a benchmark comparison view

## Build and smoke expectations

Before handing off to testing:

1. branch builds (`cd frontend && npm install && npm run build`)
2. inspect `backend/app/static/` — confirm the new bundle includes ModelsPanel
3. probe in a browser pointed at the backend (which already serves the bundle):
   - panel renders
   - `/v1/models` request fires
   - clicking "Load" triggers `POST /v1/models/load`
   - success shows load_time_seconds; error shows detail
4. (optional) point a browser at an iPhone node serving the new bundle (requires the iOS uniform-web-serving sprint to have landed; if not, skip and note in the result)

Useful commands:

```bash
cd frontend
npm install
npm run build
# bundle is at backend/app/static/

cd ../backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
# in browser: http://localhost:8000/

# or against a real iPhone node (if iOS web-serving sprint has landed):
# https://192.168.0.220:17777/
```

## Deliverables

Required:

1. implementation on `feature/frontend-model-selector`
2. concise result note using `02-result-template.md`
3. a concrete validator handoff at:
   - `mobile/testing/requests/FRONTEND_MODEL_SELECTOR_TEST_REQUEST_2026-05-03.md`

## Done means

- code committed on the named branch
- vite build green; new bundle in `backend/app/static/`
- panel renders against backend in a real browser
- result note explains what changed
- testing request walks the validator through the cross-platform check (backend + iPhone if iOS-serving has landed)

## If you think the approach is wrong

Specific pushback we'd value:

- separate panel vs. extension to `ChatPanel`? Lean: separate panel — it's a different concern.
- TypeScript types for the response: define inline, or add to a shared types file? Lean: inline; defer central types until the second consumer arrives.
- handling the case where `/v1/models` returns an empty `available` list (some nodes may not implement it). 404? 200 + empty list? Both happen in the wild. Handle both honestly.
- error display: toast, inline, or modal? Lean: inline, near the failed-button.

If your read of any of those differs strongly, reply on the branch before implementing.
