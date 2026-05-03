# Test Request — Frontend Model Selector

**Date issued:** 2026-05-03 (stub — implementer should refine before handoff)
**Branch:** `feature/frontend-model-selector`
**Validator host:** `iMac-Debian` / `wip/testing`

## What you're validating

That the new ModelsPanel in the Command Center SPA correctly lists `/v1/models` from the active node, lets the user switch via `/v1/models/load`, and reports load time and errors honestly. The same bundle should work against any node serving the Command Center.

## Prerequisites

- Backend node running (`uvicorn app.main:app --host 0.0.0.0 --port 8000`) with the new bundle in `backend/app/static/`
- Optional: iPhone node at `192.168.0.220:17777` if the iOS uniform-web-serving sprint has landed (so you can test the SAME bundle against an iOS node)

## Probe sequence — backend

1. Open browser at `http://<backend-host>:8000/`. Command Center loads.
2. ModelsPanel visible. List populated from `GET /v1/models`.
3. Click "Load" on a non-currently-loaded model.
4. Observe in-flight indicator.
5. On success, `load_time_seconds` shows.
6. Trigger a deliberate error (e.g., POST `/v1/models/load` with `{"model_id":"bogus"}`). Confirm 400 + detail string is shown to the user inline.

## Probe sequence — iOS (if iOS sprint has landed)

1. Open browser at `https://192.168.0.220:17777/`. Same SPA loads — verify by checking page title or a known asset.
2. ModelsPanel populated from the iPhone's `/v1/models`. Models listed should be Qwen 2.5 1.5B + Gemma 4 E2B 4-bit.
3. Switch from currently-loaded → other. Should observe ~3-5s load_time on iPhone 12 PM.
4. Repeat the bogus-id error case. iPhone returns 400 with detail.

## Cross-platform parity check

- Same bundle hash in `backend/app/static/index.html` is served by every node tested.
- ModelsPanel UI is identical across backend and iOS (no platform-specific divergence in the React component).

## Pass criteria

- Backend probe: full sequence passes.
- iOS probe (if applicable): full sequence passes against iPhone node.
- No console errors in browser devtools beyond expected.
- Failed `/v1/models/load` shows error inline; success shows load_time_seconds.

## Fail criteria

- Panel doesn't render or fails on initial fetch.
- "Load" button does nothing or crashes.
- Errors not shown to user.
- Layout breaks the surrounding Command Center.

## What to record

- Browser screenshots before/after a successful load
- Network-tab capture of one full `/v1/models/load` request/response
- If iOS reached: confirmation that iPhone `mlx-community/...` model id appears verbatim in the panel
- Any UI papercut worth a follow-up

## Next-step hint if validation fails

- Inspect bundle: `ls -la backend/app/static/`. If hash didn't change, vite build was skipped.
- `curl -sk <node>/v1/models` directly to confirm the contract response is well-formed.
- Inspect React error boundaries — typed response shape mismatches will throw.
