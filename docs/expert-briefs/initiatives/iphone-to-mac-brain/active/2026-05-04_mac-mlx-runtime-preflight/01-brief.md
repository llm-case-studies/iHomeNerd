# Expert Brief - Mac MLX Runtime Preflight

**Date:** 2026-05-04
**Initiative:** `iphone-to-mac-brain`
**Status:** active sprint
**Audience:** OpenCode implementer on `Acer-HL`

## Why This Sprint Exists

The real Mac MLX sidecar path passed on `mac-mini`, but only after manual setup:
DS created a dedicated sidecar venv, installed `mlx-lm==0.31.3`, and switched
from the unsafe Gemma 4 default to Qwen2.5 1.5B.

The next risk is reproducibility. Before launchd hardening, pairing approval,
or certificate handoff, the installer needs a boring, testable way to preflight
and prepare the MLX runtime.

## Execution Fence

- Repo: `iHomeNerd`
- Base branch: `origin/main`
- Working branch: `feature/iphone-to-mac-brain/mac-mlx-runtime-preflight`
- Merge target: `main` after validation
- Implementation host: `Acer-HL`
- Runtime/build host: `mac-mini`
- Validation host: `iMac-Debian`

## References

Read these first:

- `docs/expert-briefs/initiatives/iphone-to-mac-brain/README.md`
- `docs/expert-briefs/initiatives/iphone-to-mac-brain/LESSONS.md`
- `testing/initiatives/iphone-to-mac-brain/2026-05-03_mac-mini-mlx-sidecar-smoke/result.md`
- `docs/APPLE_SILICON_NATIVE_MLX_HOSTING_2026-05-01.md`

Relevant source:

- `install-ihomenerd-macos.sh`
- `backend/app/config.py`
- `backend/app/domains/control_plane.py`

## Product Goal

When a Mac install is run with `IHN_MAC_LLM_BACKEND=mlx`, the installer should:

- require Apple Silicon (`arm64`)
- require backend Python >=3.11
- use `mlx-community/Qwen2.5-1.5B-Instruct-4bit` unless `IHN_MLX_MODEL` is set
- pin `mlx-lm==0.31.3` by default, overridable via `IHN_MLX_LM_VERSION`
- install MLX into a dedicated sidecar venv, not `backend/.venv`
- run `mlx_lm.server` from that sidecar venv
- reject `mlx-community/gemma-4-e2b-it-4bit` by default with a clear message
- support safe preflight/runtime-only modes for validators

## Required Installer Interface

Add or preserve these environment controls:

| Variable | Behavior |
|---|---|
| `IHN_MAC_LLM_BACKEND=mlx` | enable native Mac MLX mode |
| `IHN_MLX_MODEL` | sidecar model; default Qwen2.5 1.5B |
| `IHN_MLX_LM_VERSION` | package version; default `0.31.3` |
| `IHN_MLX_VENV_DIR` | sidecar venv path; default `${INSTALL_DIR}/runtime/mlx-sidecar-venv` |
| `IHN_PREFLIGHT_ONLY=1` | print checks/plan and exit before side effects |
| `IHN_MLX_RUNTIME_ONLY=1` | prepare only the sidecar venv/runtime and exit |
| `IHN_ALLOW_UNVALIDATED_MLX_MODEL=1` | allow Gemma 4 or other unvalidated model override |

`IHN_PREFLIGHT_ONLY=1` must not download the repo archive, copy/generate CA
material, create venvs, call `pip install`, write LaunchAgents, call
`launchctl`, start services, or open a browser.

`IHN_MLX_RUNTIME_ONLY=1` may create/update only the sidecar venv and install
`mlx-lm`; it must not touch backend venv, CA material, LaunchAgents, or running
services.

## Out Of Scope

- launchd service redesign
- full notarized installer packaging
- iPhone pairing approval
- certificate handoff
- frontend model selector
- MLX benchmarking beyond the smoke needed by the request
- changing the default backend from Ollama to MLX for all Macs

## Implementation Notes

The current installer installs `mlx-lm` into `backend/.venv` and starts
`run-mlx.sh` from that venv. This sprint should separate the sidecar runtime
from the backend runtime so future installer work can manage them independently.

Prefer shell helpers with clear names over duplicating version/model/path logic
through the script.

## Done Means

- `bash -n install-ihomenerd-macos.sh` passes.
- MLX mode defaults to Qwen2.5 1.5B and pinned `mlx-lm==0.31.3`.
- Gemma 4 default is rejected unless explicitly overridden.
- sidecar venv path is separate from backend venv path.
- `IHN_PREFLIGHT_ONLY=1` can be safely run on `mac-mini`.
- `IHN_MLX_RUNTIME_ONLY=1` can create or reuse the sidecar venv on `mac-mini`.
- result.md is filled and branch is pushed.
