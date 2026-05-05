# Expert Brief - Speech Extraction + Plugin Namespace

**Date:** 2026-05-04
**Initiative:** `uniform-web-ui`
**Status:** active sprint
**Audience:** OpenCode implementer on `Acer-HL`

## Why This Sprint Exists

The completed client-surface boundary review converged on one first coding move:

- extract generic speech routes from `plugins/pronunco.py`
- place PronunCo-specific routes behind a plugin namespace
- split `/capabilities` so the public surface stops pretending plugin helpers
  are core

This is intentionally the first implementation sprint because it is both:

- high-signal for the boundary model
- mechanically small enough to finish without reopening every product question

## Execution Fence

- Repo: `iHomeNerd`
- Base branch: `origin/main`
- Working branch: `feature/uniform-web-ui/speech-extraction-plugin-namespace`
- Merge target: `main` after validation
- Implementation host: `Acer-HL`
- Smoke host: `Acer-HL` or any Python-capable host
- Validation host: `iMac-Debian`

## References

Read these first:

- `docs/expert-briefs/README.md`
- `docs/expert-briefs/LESSONS.md`
- `docs/expert-briefs/initiatives/uniform-web-ui/README.md`
- `docs/expert-briefs/initiatives/uniform-web-ui/active/2026-05-04_client-surface-boundary-review/round-2-synthesis.md`
- `testing/initiatives/uniform-web-ui/2026-05-04_speech-extraction-plugin-namespace/request.md`

Relevant source:

- `backend/app/main.py`
- `backend/app/capabilities.py`
- `backend/app/plugins/pronunco.py`
- `backend/app/domains/language.py`
- `backend/app/domains/vision_router.py`

Useful reference examples:

- `docs/expert-briefs/reference/2026-05-02_android-uniform-web-serving/`
- `docs/expert-briefs/reference/2026-05-02_android-model-catalog/`

## Product Goal

After this sprint:

1. generic speech capabilities are clearly part of core iHN
2. PronunCo-specific routes are clearly part of plugin space
3. `/capabilities` makes the distinction visible to clients and reviewers
4. the flat route surface becomes slightly smaller and less misleading

## Required Scope

### A. Extract speech into a core domain router

Move these routes out of `backend/app/plugins/pronunco.py` into a core domain
router (new file such as `backend/app/domains/speech.py` is fine):

- `POST /v1/transcribe-audio`
- `POST /v1/synthesize-speech`
- `GET /v1/voices`

The route behavior should remain consistent with current callers unless the
boundary cleanup requires a small honest fix.

### B. Plugin namespace for PronunCo

Move PronunCo-specific plugin routes under:

- `/v1/plugins/pronunco/...`

Minimum expected routes:

- lesson extraction
- dialogue session / turn (even if still provisional)

Flat core-looking PronunCo routes should not remain as the only public path.

### C. Split `/capabilities`

Adjust `/capabilities` so it distinguishes:

- `core`
- `plugins`

It does **not** need full stability enforcement machinery yet. But the response
should stop implying that PronunCo helpers are first-class core features.

### D. Remove redundant flat image stub

Delete the redundant flat `/v1/image-extract` stub rather than carrying it
forward. The vision router should remain the honest image surface.

## Out Of Scope

- frontend changes
- iOS or Android changes
- PronunCo repo changes
- dialogue primitive extraction into core
- full capability tier enforcement
- adapter sub-layer redesign
- broad route-inventory cleanup outside this seam

## Acceptance Criteria

The branch should make these outcomes true:

- `POST /v1/transcribe-audio` works from core domain code, not PronunCo plugin code
- `POST /v1/synthesize-speech` works from core domain code
- `GET /v1/voices` works from core domain code
- `POST /v1/lesson-extract` no longer presents as a flat core route
- `POST /v1/plugins/pronunco/lesson-extract` exists and works
- `/capabilities` returns separate `core` and `plugins` sections
- `/v1/image-extract` is gone as a flat redundant stub

## Build And Smoke Expectations

This is backend work, so smoke should be cheap but real.

Before handoff:

1. run focused backend tests where sensible
2. run curl-style smoke against the touched routes
3. verify the app still starts
4. verify route registration is honest and non-duplicative

Useful commands:

```bash
python -m pytest backend/tests/test_language_api.py -q
python -m pytest backend/tests/test_chat_contract.py -q
uvicorn backend.app.main:app --host 127.0.0.1 --port 17779 --reload
```

If new tests are warranted, keep them tightly scoped to the route move or the
capability response shape.

## Deliverables

Required:

1. implementation on `feature/uniform-web-ui/speech-extraction-plugin-namespace`
2. concise result note using `02-result-template.md`
3. updated validator handoff at:
   - `testing/initiatives/uniform-web-ui/2026-05-04_speech-extraction-plugin-namespace/request.md`

## Done Means

- code committed on the named branch
- route ownership is cleaner and visible
- `/capabilities` makes core vs plugin distinction explicit
- smoke checks are run and recorded
- the validator request tells the tester exactly what to probe

