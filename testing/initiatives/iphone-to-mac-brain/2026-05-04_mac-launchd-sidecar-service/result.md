# Result - Mac Launchd Sidecar Service

**Date:** 2026-05-05
**Initiative:** `iphone-to-mac-brain`
**Sprint:** `2026-05-04_mac-launchd-sidecar-service`
**Validator host:** `iMac-Debian`
**Runtime host:** `mac-mini`
**Product branch:** `feature/iphone-to-mac-brain/mac-launchd-sidecar-service`
**Product commit (tip):** `1756e951eef76acb0f03fd26ea7071bc5f1859eb`
**Implementation commit:** `6125f7430d1474fcbd4e21fa9db6adf0224f2634`
**Verdict:** PASS

## Evidence Index

| # | File | Status |
|---|------|--------|
| 01 | `evidence/01_preflight_safety.txt` | PASS |
| 02 | `evidence/02_bash_syntax.txt` | PASS |
| 03 | `evidence/03_mlx_invocation.txt` | PASS |
| 04 | `evidence/04_smoke_install.txt` | PASS |
| 05 | `evidence/05_generated_files.txt` | PASS |
| 06 | `evidence/06_launchd_status.txt` | PASS |
| 07 | `evidence/07_mlx_models.json` | PASS |
| 08 | `evidence/08_ihn_health.json` | PASS |
| 09 | `evidence/09_ihn_chat.json` | PASS |
| 10 | `evidence/10_cleanup.txt` | PASS |

## Pass Criteria Assessment

### 01 - Preflight Safety
- Production labels `com.ihomenerd.brain`, `com.ihomenerd.mlx`, `com.ihomenerd.ollama` all absent
- Production `~/.ihomenerd` exists (untouched)
- No stale smoke install from prior run

### 02 - Bash Syntax
`bash -n install-ihomenerd-macos.sh` passes with no output.

### 03 - MLX Invocation
Installer uses `mlx_lm.server` CLI entry point (not deprecated `python -m mlx_lm.server`). References at lines 292-296 (verification) and line 461 (exec in generated `run-mlx.sh`).

### 04 - Smoke Install
Full smoke install succeeded with `IHN_INSTALL_DIR`, `IHN_SERVICE_LABEL_SUFFIX=".smoke"`,
`IHN_PORT=18777`, `IHN_MLX_SERVER_PORT=12435`, `IHN_MAC_LLM_BACKEND=mlx`, `IHN_SKIP_OLLAMA=1`.
All stages passed: Mac check, model selection, CA generation, backend venv, MLX sidecar venv
(`mlx-lm==0.31.3`), launchd registration. One warning: "MLX sidecar is not ready yet" during
health wait, but subsequent probes confirmed it became ready. `IHN_PYTHON_BIN` was needed --
see Finding 1.

### 05 - Generated Files
`run-mlx.sh`: EXISTS, EXECUTABLE, binds to `127.0.0.1` (not `0.0.0.0`), references port `12435`.
`run-ihomenerd.sh`: EXISTS, EXECUTABLE, exports `IHN_PORT="18777"`, exports `IHN_MLX_SERVER_URL="http://127.0.0.1:12435"`.

### 06 - Launchd Status
- `com.ihomenerd.brain.smoke`: state = running, minimum runtime = 10, exit timeout = 15, maxfiles = 4096
- `com.ihomenerd.mlx.smoke`: state = running, nice = 5, minimum runtime = 15, exit timeout = 20, spawn type = background, maxfiles = 4096
- `com.ihomenerd.ollama.smoke`: NOT FOUND (correct, `IHN_SKIP_OLLAMA=1`)
- All unsuffixed production labels: NOT FOUND (not touched)
- Only `.smoke` plists exist in `~/Library/LaunchAgents/`

### 07 - MLX Sidecar Models
`GET http://127.0.0.1:12435/v1/models` returns model list including `mlx-community/Qwen2.5-1.5B-Instruct-4bit`.

### 08 - iHN Health
`GET https://127.0.0.1:18777/health` returns `ok: true`, `provider: mlx`, `backend: mlx_macos`, `model: mlx-community/Qwen2.5-1.5B-Instruct-4bit`, `port: 18777`.

### 09 - iHN Chat
`POST https://127.0.0.1:18777/v1/chat` returns HTTP 200 with all required fields: `role`, `content`, `response`, `text`, `model`, `backend`, `provider`. Response: "Launch daemon is working fine." (model paraphrased the prompt, semantically correct).

### 10 - Cleanup
Smoke services unloaded, plists removed, smoke directory removed. Production `~/.ihomenerd` still exists. Production labels still absent. State matches preflight.

## Findings

### Finding 1 -- `IHN_PYTHON_BIN` required on this host
mac-mini system Python is 3.9.6. No Homebrew Python 3.11+ is installed system-wide.
The backend `.venv/bin/python` (3.12.13) was supplied via `IHN_PYTHON_BIN` to allow
the installer to pass the Python version gate. The installer's `find_python311()`
function correctly fell through all candidate paths and would have failed without
the explicit override.

**Severity:** Note, not a blocker. The installer's Python detection logic is correct;
this host simply lacks a system-wide Python 3.11+. A one-time `brew install python@3.12`
would resolve it permanently.

### Finding 2 -- MLX sidecar startup race
The installer reported "The Brain is up, but the MLX sidecar is not ready yet."
Both services were running by the time runtime probes executed (~30s later).
The sidecar health wait loop may benefit from a longer timeout or retry interval
for cold model warm-up on first launch.

**Severity:** Cosmetic. The services ultimately work correctly.
