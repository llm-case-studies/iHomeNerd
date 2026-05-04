# Test Request — Frontend Model Selector

**Date issued:** 2026-05-03
**Branch:** `feature/uniform-web-ui/frontend-model-selector`
**Validator host:** `iMac-Debian` / `wip/testing`

## What you're validating

That the new ModelsPanel in the Command Center SPA correctly lists `/v1/models` from the active node, lets the user switch via `/v1/models/load`, and reports load time and errors honestly. The same bundle should work against any node serving the Command Center.

## Prerequisites

- Backend node running (`uvicorn app.main:app --host 0.0.0.0 --port 8000`) with the new bundle in `backend/app/static/`
- Optional: iPhone node at `192.168.0.220:17777` if the iOS uniform-web-serving sprint has landed (so you can test the SAME bundle against an iOS node)

## Backend /v1/models route status

As of this sprint's handoff, the backend FastAPI does **not** yet expose `GET /v1/models` or `POST /v1/models/load` routes. The ModelsPanel component handles this honestly — it shows a fetch error inline when the endpoint returns non-200. A follow-up sprint should add these routes to the backend.

## Probe sequence — backend

1. Open browser at `http://<backend-host>:8000/`. Command Center loads.
2. Navigate to the "Models" tab (box icon).
3. Panel renders. If node has no `/v1/models` endpoint, an error message is displayed inline.
4. `POST /v1/models/load` with `{"model_id":"bogus"}` returns error with detail string shown inline.

## Probe sequence — iOS (if iOS sprint has landed)

1. Open browser at `https://192.168.0.220:17777/`. Same SPA loads.
2. ModelsPanel populated from the iPhone's `/v1/models`. Models listed should match the iPhone's available models.
3. Switch from currently-loaded to another model. Observe load_time_seconds.
4. Repeat the bogus-id error case. iPhone returns 400 with detail.

## Edge cases exposed by implementation

These were identified during the sprint and should be validated:

- **Empty model list**: Node returns `{"available": [], "loaded": null, "backend": null}` → panel shows "No models available on this node yet."
- **Concurrent loads**: If user clicks "Load" on two models rapidly, second request should not interfere with first (each button independently shows its loading state).
- **Load on already-loaded model**: "Load" button is disabled (shows "Loaded") when that model is already active.
- **Network error**: When node is unreachable, panel shows reachability error inline.
- **Non-JSON error body**: If the node returns HTML or plain text instead of JSON, the error message shows the raw status code.

## Cross-platform parity check

- Same bundle hash in `backend/app/static/index.html` is served by every node tested.
- ModelsPanel UI is identical across backend and iOS (no platform-specific divergence in the React component).

## Pass criteria

- Backend probe: Models tab visible in the Command Center. Panel renders.
- If `/v1/models` is unavailable, error shown inline rather than crash.
- Failed `/v1/models/load` shows error inline; success shows load_time_seconds.
- No console errors in browser devtools beyond expected.

## Fail criteria

- Panel doesn't render or crashes on mount.
- "Load" button does nothing or crashes.
- Errors not shown to user.
- Layout breaks the surrounding Command Center.

## What to record

- Browser screenshots of the Models tab
- Network-tab capture of `/v1/models` and `/v1/models/load` request/response
- If iOS reached: confirmation that iPhone model IDs appear verbatim in the panel
- Any UI papercut worth a follow-up

## Next-step hint if validation fails

- Inspect bundle: `ls -la backend/app/static/`. If hash didn't change, vite build was skipped.
- `curl -sk <node>/v1/models` directly to confirm the contract response is well-formed.
- Inspect React error boundaries — typed response shape mismatches will throw.
