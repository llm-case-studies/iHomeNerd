# Result - Mac MLX Runtime Preflight

**Date:** 2026-05-04
**Initiative:** `iphone-to-mac-brain`
**Sprint:** `2026-05-04_mac-mlx-runtime-preflight`
**Implementation host:** `Acer-HL`
**Base branch:** `origin/main` (`8ab67ac`)
**Working branch:** `feature/iphone-to-mac-brain/mac-mlx-runtime-preflight`
**Validation host:** `iMac-Debian`
**Runtime host:** `mac-mini`
**Verdict:** IMPLEMENTED — ready for validation

## Summary

The macOS installer now reproduces the validated manual MLX setup from
`2026-05-03_mac-mini-mlx-sidecar-smoke`. Key changes to
`install-ihomenerd-macos.sh`:

- Default MLX model: `mlx-community/Qwen2.5-1.5B-Instruct-4bit` (was Gemma 4)
- Pinned MLX package: `mlx-lm==0.31.3` by default, overridable via
  `IHN_MLX_LM_VERSION`
- Dedicated sidecar venv: `${INSTALL_DIR}/runtime/mlx-sidecar-venv` by default,
  overridable via `IHN_MLX_VENV_DIR`
- Backend venv (`${INSTALL_DIR}/backend/.venv`) stays separate and does not
  receive `mlx-lm`
- Gemma 4 models fail fast unless `IHN_ALLOW_UNVALIDATED_MLX_MODEL=1` is set
- Safe modes:
  - `IHN_PREFLIGHT_ONLY=1`: prints checks and plan, exits before any side
    effects (no download, CA, venv install, launchd, or service start)
  - `IHN_MLX_RUNTIME_ONLY=1`: creates/updates only the MLX sidecar runtime
    venv, verifies `mlx_lm.server`, exits before repo download, CA, backend
    venv, launchd, or service start
- `run-mlx.sh` now uses `${MLX_VENV_DIR}/bin/python` instead of
  `backend/.venv/bin/python`

## Static Check

`bash -n install-ihomenerd-macos.sh` passes with no output.

## Environment Variables

| Variable | Default |
|---|---|
| `IHN_MAC_LLM_BACKEND` | `ollama` |
| `IHN_MLX_MODEL` | `mlx-community/Qwen2.5-1.5B-Instruct-4bit` |
| `IHN_MLX_LM_VERSION` | `0.31.3` |
| `IHN_MLX_SERVER_PORT` | `11435` |
| `IHN_MLX_VENV_DIR` | `${INSTALL_DIR}/runtime/mlx-sidecar-venv` |
| `IHN_PREFLIGHT_ONLY` | disabled |
| `IHN_MLX_RUNTIME_ONLY` | disabled |
| `IHN_ALLOW_UNVALIDATED_MLX_MODEL` | disabled |

## Validation Status

Pending — see `testing/initiatives/iphone-to-mac-brain/2026-05-04_mac-mlx-runtime-preflight/request.md`
for the validation plan.

## Evidence

Evidence will be collected by the validation host (`iMac-Debian`) against
`mac-mini` and placed under `evidence/`.

## Blockers

None from implementation side. `bash -n` passes on `Acer-HL`. The script is
ready for runtime validation on `mac-mini`.
