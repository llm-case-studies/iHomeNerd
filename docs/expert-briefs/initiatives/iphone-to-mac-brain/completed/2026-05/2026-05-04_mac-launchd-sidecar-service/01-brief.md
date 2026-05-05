# Expert Brief - Mac Launchd Sidecar Service

**Date:** 2026-05-05
**Initiative:** `iphone-to-mac-brain`
**Status:** completed - PASS with findings
**Audience:** OpenCode implementer on `Acer-HL`

## Why This Sprint Exists

The Mac MLX runtime is now reproducible: the installer can create a dedicated
sidecar venv, pin `mlx-lm==0.31.3`, and reject the known-bad Gemma 4 model.

The next risk is service lifecycle. A real Mac brain node needs the MLX sidecar
to behave like normal macOS infrastructure: launchd-managed, localhost-bound,
restartable, inspectable, and safe to validate without damaging a real install.

## Execution Fence

- Repo: `iHomeNerd`
- Base branch: `origin/main`
- Working branch: `feature/iphone-to-mac-brain/mac-launchd-sidecar-service`
- Merge target: `main` after validation
- Implementation host: `Acer-HL`
- Runtime/build host: `mac-mini`
- Validation host: `iMac-Debian`

## References

Read these first:

- `docs/expert-briefs/initiatives/iphone-to-mac-brain/README.md`
- `docs/expert-briefs/initiatives/iphone-to-mac-brain/LESSONS.md`
- `docs/expert-briefs/initiatives/iphone-to-mac-brain/MAC_MLX_MODEL_LADDER.md`
- `testing/initiatives/iphone-to-mac-brain/2026-05-04_mac-mlx-runtime-preflight/result.md`
- `docs/APPLE_SILICON_NATIVE_MLX_HOSTING_2026-05-01.md`

Relevant source:

- `install-ihomenerd-macos.sh`
- `backend/app/config.py`
- `backend/app/main.py`

## Product Goal

When a Mac install is run with `IHN_MAC_LLM_BACKEND=mlx`, the installer should:

- create or reuse the dedicated MLX sidecar venv from the prior sprint
- generate `run-mlx.sh` using a non-deprecated MLX server invocation
- register a launchd user agent for the MLX sidecar
- bind the sidecar only to `127.0.0.1`
- let the backend point at that sidecar via `IHN_MLX_SERVER_URL`
- support test-safe launchd labels and ports so validation can run beside a
  real install
- keep the validated default model as
  `mlx-community/Qwen2.5-1.5B-Instruct-4bit`

## Required Installer Interface

Preserve existing controls:

| Variable | Behavior |
|---|---|
| `IHN_MAC_LLM_BACKEND=mlx` | enable native Mac MLX mode |
| `IHN_MLX_MODEL` | sidecar model; default Qwen2.5 1.5B |
| `IHN_MLX_LM_VERSION` | package version; default `0.31.3` |
| `IHN_MLX_VENV_DIR` | sidecar venv path; default `${INSTALL_DIR}/runtime/mlx-sidecar-venv` |
| `IHN_MLX_SERVER_PORT` | sidecar localhost port; default `11435` |
| `IHN_PREFLIGHT_ONLY=1` | print checks/plan and exit before side effects |
| `IHN_MLX_RUNTIME_ONLY=1` | prepare only the sidecar venv/runtime and exit |
| `IHN_ALLOW_UNVALIDATED_MLX_MODEL=1` | allow Gemma 4 or other unvalidated model override |

Add or complete these controls:

| Variable | Behavior |
|---|---|
| `IHN_PORT` | backend HTTPS port; default `17777`; setup HTTP port remains `IHN_PORT + 1` |
| `IHN_SERVICE_LABEL_SUFFIX` | optional suffix appended to launchd labels, plist filenames, and log filenames for smoke installs, for example `.smoke` |
| `IHN_SKIP_OLLAMA=1` | skip Ollama launchd registration and model pulls; useful for MLX-only smoke installs |

The label suffix is for validation isolation. With
`IHN_SERVICE_LABEL_SUFFIX=.smoke`, the installer should use labels like:

```text
com.ihomenerd.brain.smoke
com.ihomenerd.mlx.smoke
com.ihomenerd.ollama.smoke
```

The production default without a suffix must remain:

```text
com.ihomenerd.brain
com.ihomenerd.mlx
com.ihomenerd.ollama
```

## Required Service Behavior

- `run-mlx.sh` must run from `${MLX_VENV_DIR}`.
- Prefer the console script form:

```bash
exec "${MLX_VENV_DIR}/bin/mlx_lm.server" --host 127.0.0.1 --port "${MLX_SERVER_PORT}" --model "${MLX_MODEL}"
```

- If a fallback is needed, use the non-deprecated module form:

```bash
python -m mlx_lm server
```

- Do not use the deprecated form:

```bash
python -m mlx_lm.server
```

- The sidecar must never bind to `0.0.0.0` or the LAN IP.
- Launchd plists should have unique stdout/stderr log files when a label suffix
  is used.
- The printed status/stop/start commands should reflect the actual label and
  plist names used by the install.

## Model Ladder Note

More capable MLX models exist, but model choice is not part of this sprint. The
validated default remains Qwen2.5 1.5B. Larger models should be introduced by
future benchmark/profile sprints using
`docs/expert-briefs/initiatives/iphone-to-mac-brain/MAC_MLX_MODEL_LADDER.md`.

## Out Of Scope

- changing the installer default to Qwen3, Qwen2.5 7B, Phi, Llama, or DeepSeek
- benchmarking larger models
- adding multi-model routing
- adding an in-process MLX provider
- iPhone pairing approval
- certificate handoff
- frontend model selector work
- notarized app packaging

## Implementation Notes

Keep this mostly inside `install-ihomenerd-macos.sh` unless a small backend
change is required to honor `IHN_PORT` correctly.

Do not make validation rely on production labels or production ports. The
validator should be able to run a smoke install with:

```bash
IHN_INSTALL_DIR="$HOME/.ihomenerd-smoke/mac-launchd-sidecar-service" \
IHN_SERVICE_LABEL_SUFFIX=.smoke \
IHN_PORT=18777 \
IHN_MLX_SERVER_PORT=12435 \
IHN_MAC_LLM_BACKEND=mlx \
IHN_SKIP_OLLAMA=1 \
IHN_AUTO_YES=1 \
IHN_SKIP_OPEN=1 \
bash install-ihomenerd-macos.sh
```

## Done Means

- `bash -n install-ihomenerd-macos.sh` passes.
- Installer-generated `run-mlx.sh` uses a non-deprecated MLX server invocation.
- Full MLX install registers `com.ihomenerd.mlx` by default.
- Smoke install with suffix registers `com.ihomenerd.mlx.smoke`.
- Smoke install can use non-production ports for both iHN and MLX.
- Smoke install with `IHN_SKIP_OLLAMA=1` does not register an Ollama smoke
  service or touch Ollama models.
- `launchctl print` shows the smoke MLX service running after install.
- `GET http://127.0.0.1:<smoke_mlx_port>/v1/models` works.
- `GET https://127.0.0.1:<smoke_ihn_port>/health` reports MLX provider.
- `POST https://127.0.0.1:<smoke_ihn_port>/v1/chat` returns canonical fields.
- Smoke cleanup unloads only suffixed labels and removes only the smoke install
  directory.
- result.md is filled and branch is pushed.
