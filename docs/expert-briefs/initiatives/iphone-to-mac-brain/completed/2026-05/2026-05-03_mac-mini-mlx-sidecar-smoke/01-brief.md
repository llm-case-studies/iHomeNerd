# Expert Brief - Mac Mini MLX Sidecar Smoke

**Date:** 2026-05-03
**Initiative:** `iphone-to-mac-brain`
**Status:** completed - PASS with findings
**Audience:** OpenCode validator on `iMac-Debian`

## Why This Sprint Exists

The `/v1/chat` contract now accepts both `prompt` and `messages`, and it passed
fake MLX sidecar validation. The iPhone setup route also passed on a real
iPhone.

The remaining unknown in the nearest path is the actual Apple Silicon runtime:
can `mac-mini` run a real MLX sidecar and can iHN route chat to it using the
same public backend contract?

## Execution Fence

- Repo: `iHomeNerd`
- Base branch: `origin/main`
- Working branch: `validation/iphone-to-mac-brain/mac-mini-mlx-sidecar-smoke`
- Merge target: `main`, only after evidence is reviewed
- Validation host: `iMac-Debian`
- Runtime/build host: `mac-mini`
- Product code changes: out of scope

## References

Read these first:

- `docs/expert-briefs/initiatives/iphone-to-mac-brain/README.md`
- `docs/APPLE_SILICON_NATIVE_MLX_HOSTING_2026-05-01.md`
- `testing/initiatives/iphone-to-mac-brain/2026-05-03_mac-mini-mlx-sidecar-smoke/request.md`

Relevant sources:

- `backend/app/config.py`
- `backend/app/llm.py`
- `backend/app/domains/language.py`
- `backend/app/capabilities.py`

## Feature Goal

Prove the real `mlx_lm.server` runtime on `mac-mini` can support:

- `GET /v1/models` on the sidecar
- iHN `/health` reporting `provider: mlx` and `backend: mlx_macos`
- iHN `/capabilities` reporting the same provider metadata
- iHN `/v1/chat` with `prompt`
- iHN `/v1/chat` with `messages`
- clean iHN 502 JSON error when the sidecar is unavailable

## Acceptable Scope

Good outcomes:

- MLX is already installed and the sprint records a PASS.
- MLX is missing and the sprint records an exact blocker.
- The model needs a first-run download and the sprint records the model,
  elapsed time, and final result.
- A tiny doc/test correction is made because the request was inaccurate.

Do not turn this into:

- installer design
- iPhone pairing or certificate handoff
- frontend model selector work
- MLX benchmarking
- model selection UX
- broad Python environment refactoring

## Runtime Contract

The intended sidecar command is:

```bash
mlx_lm.server --host 127.0.0.1 --port 11435 --model mlx-community/Qwen2.5-1.5B-Instruct-4bit
```

The intended backend environment is:

```bash
IHN_LLM_PROVIDER=mlx
IHN_MLX_SERVER_URL=http://127.0.0.1:11435
IHN_MLX_MODEL=mlx-community/Qwen2.5-1.5B-Instruct-4bit
IHN_HOST=127.0.0.1
IHN_PORT=17791
```

Validation found that the originally proposed Gemma 4 sidecar model crashes
generation under `mlx-lm==0.31.3`; Qwen2.5 1.5B is the validated starter model.

Keep both services bound to localhost on `mac-mini` for this sprint. The
validator can run probes through SSH on `mac-mini`; LAN exposure is not needed.

## Done Means

- mac-mini preflight is recorded.
- sidecar `/v1/models` is recorded, or a precise missing-runtime blocker is
  recorded.
- iHN `/health` and `/capabilities` are recorded with MLX metadata.
- prompt and messages chat probes return HTTP 200 with canonical fields:
  `role`, `content`, `text`, `response`, `model`, `backend`, `provider`.
- no-sidecar probe returns HTTP 502 with JSON `detail`.
- sidecar and backend logs are captured.
- result is committed on the validation branch and pushed.
