# Result - Mac Launchd Sidecar Service

**Date:** 2026-05-05
**Initiative:** `iphone-to-mac-brain`
**Sprint:** `2026-05-04_mac-launchd-sidecar-service`
**Implementation host:** `Acer-HL`
**Base branch:** `origin/main` (`f7bc24a`)
**Working branch:** `feature/iphone-to-mac-brain/mac-launchd-sidecar-service`
**Working commit:** `TBD` (will be filled after commit)
**Validation host:** `iMac-Debian`
**Runtime host:** `mac-mini`
**Verdict:** IMPLEMENTED — ready for validation

## Summary

Hardened all three launchd agent plists with production-ready configuration
(throttle, graceful shutdown, resource limits, process priority). Added
isolation/smoke controls (`IHN_SERVICE_LABEL_SUFFIX`, `IHN_PORT`,
`IHN_SKIP_OLLAMA`), fixed a heredoc expansion bug, switched to non-deprecated
`mlx_lm.server` CLI, and added end-to-end port configurability to
`install-ihomenerd-macos.sh`.

## Changes Since Prior Commit

### 1. Heredoc expansion fix (blocker)

- `run-mlx.sh` and `run-ollama.sh` heredocs changed from single-quoted
  (`'RUNMLX'`/`'RUNOLLAMA'`) to unquoted (`RUNMLX`/`RUNOLLAMA`) so
  installer-time variables (`${MLX_VENV_DIR}`, `${MLX_SERVER_PORT}`,
  `${MLX_MODEL}`, `${OLLAMA_CLI}`) expand correctly.
- Runtime-only variables (`$?`, `$code`, `$((code - 128))`, `$(kill -l)`,
  `$(date)`, `$PATH`) properly escaped with `\$` to avoid premature expansion.

### 2. Non-deprecated MLX invocation (blocker)

- Changed from `python -m mlx_lm.server` to `mlx_lm.server` CLI entry point
  in both `run-mlx.sh` generation and the `IHN_MLX_RUNTIME_ONLY` verification.
- `mlx_lm.server --help` used instead of `python -m mlx_lm.server --help`.

### 3. IHN_SERVICE_LABEL_SUFFIX support

- `IHN_SERVICE_LABEL_SUFFIX` appends to all launchd labels, plist filenames,
  log filenames, and printed service commands.
- When suffix is set (e.g. `.smoke`), smoke ports default to 18777 (brain)
  and 12435 (MLX) unless the user explicitly sets `IHN_PORT` or
  `IHN_MLX_SERVER_PORT`.
- Without suffix, default ports are 17777 (brain) and 11435 (MLX).

### 4. IHN_PORT support

- `IHN_PORT` exported in generated `run-ihomenerd.sh` alongside `IHN_HOST`.
- All curl probes, the success banner, and `open` command use `${IHN_PORT}`
  instead of hardcoded `17777`.

### 5. IHN_SKIP_OLLAMA support

- `IHN_SKIP_OLLAMA=1` skips ollama CLI detection, wrapper script generation,
  plist creation, and model pull entirely.
- When set, outputs `ok "Skipping Ollama setup (IHN_SKIP_OLLAMA=1)"`.

## Plist Hardening (preserved from prior commit)

| Agent | ThrottleInterval | ExitTimeOut | ProcessType | Nice | WorkingDirectory |
|---|---|---|---|---|---|
| `com.ihomenerd.brain${SUFFIX}` | 10 | 15 | Standard | — | `${INSTALL_DIR}/backend` |
| `com.ihomenerd.mlx${SUFFIX}` | 15 | 20 | Background | 5 | `${INSTALL_DIR}/runtime` |
| `com.ihomenerd.ollama${SUFFIX}` | 10 | 15 | Background | — | `${INSTALL_DIR}` |

All plists also include: dict-form `KeepAlive`, `EnvironmentVariables` (PATH),
`SoftResourceLimits` (NumberOfFiles 4096).

## run-mlx.sh EXIT trap (preserved from prior commit)

`log_exit()` captures exit code and signal name on termination, logging to
stderr with a UTC timestamp.

## Environment Variables

| Variable | Default | Notes |
|---|---|---|
| `IHN_SERVICE_LABEL_SUFFIX` | `""` | e.g. `.smoke` for isolation |
| `IHN_PORT` | 17777 (18777 with suffix) | brain HTTPS port |
| `IHN_MLX_SERVER_PORT` | 11435 (12435 with suffix) | MLX sidecar HTTP port |
| `IHN_SKIP_OLLAMA` | 0 | skip ollama detection/setup |
| `IHN_MAC_LLM_BACKEND` | `ollama` | `mlx` for native MLX mode |
| `IHN_MLX_MODEL` | `mlx-community/Qwen2.5-1.5B-Instruct-4bit` | |
| `IHN_MLX_LM_VERSION` | `0.31.3` | |
| `IHN_PREFLIGHT_ONLY` | 0 | |
| `IHN_MLX_RUNTIME_ONLY` | 0 | |

## Static Check

`bash -n install-ihomenerd-macos.sh` passes with no output.

## control_plane.py

No changes required. Existing launchd detection (`launchctl list | grep
"com\.ihomenerd"`) matches suffixed labels. Service management commands
(bootstrap, bootout, kickstart, print) remain compatible.

## Model Policy

Default MLX model remains `mlx-community/Qwen2.5-1.5B-Instruct-4bit` as
validated in `2026-05-03_mac-mini-mlx-sidecar-smoke`. No benchmark or
model switching was performed in this sprint.

## Validation Status

Pending — see
`testing/initiatives/iphone-to-mac-brain/2026-05-04_mac-launchd-sidecar-service/request.md`
for the validation plan.

## Evidence

Evidence will be collected by the validation host (`iMac-Debian`) against
`mac-mini` and placed under `evidence/`.

## Blockers

None from implementation side. `bash -n` passes on `Acer-HL`. The script
is ready for runtime validation on `mac-mini`.
