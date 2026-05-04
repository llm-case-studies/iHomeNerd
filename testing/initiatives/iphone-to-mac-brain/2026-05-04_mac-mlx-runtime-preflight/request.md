# Test Request - Mac MLX Runtime Preflight

**Date issued:** 2026-05-04
**Initiative:** `iphone-to-mac-brain`
**Sprint:** `2026-05-04_mac-mlx-runtime-preflight`
**Target branch:** `feature/iphone-to-mac-brain/mac-mlx-runtime-preflight`
**Validation branch:** `validation/iphone-to-mac-brain/mac-mlx-runtime-preflight`
**Validation host:** `iMac-Debian`
**Runtime host:** `mac-mini`

## What You Are Validating

The macOS installer can safely preflight and prepare the real Mac MLX sidecar
runtime without running the whole installer or touching launchd.

This validates the reproducible form of the manual setup from
`2026-05-03_mac-mini-mlx-sidecar-smoke`.

## Branch Setup

```bash
git status --short --branch
git fetch origin
git switch -c validation/iphone-to-mac-brain/mac-mlx-runtime-preflight origin/feature/iphone-to-mac-brain/mac-mlx-runtime-preflight
```

If the branch already exists locally, switch to it and record current SHA.

Sync the product branch onto `mac-mini`:

```bash
ssh mac-mini 'cd ~/Projects/iHomeNerd && git fetch origin && git switch feature/iphone-to-mac-brain/mac-mlx-runtime-preflight && git pull --ff-only'
```

## Evidence Paths

Write result to:

```text
testing/initiatives/iphone-to-mac-brain/2026-05-04_mac-mlx-runtime-preflight/result.md
```

Put raw output under:

```text
testing/initiatives/iphone-to-mac-brain/2026-05-04_mac-mlx-runtime-preflight/evidence/
```

## Static Checks

From either host:

```bash
bash -n install-ihomenerd-macos.sh
```

Save output as:

```text
evidence/01_bash_syntax.txt
```

## Mac Preflight-Only Smoke

Run from `iMac-Debian`:

```bash
ssh -o BatchMode=yes mac-mini hostname
ssh mac-mini 'cd ~/Projects/iHomeNerd && IHN_MAC_LLM_BACKEND=mlx IHN_PREFLIGHT_ONLY=1 IHN_SKIP_OPEN=1 bash install-ihomenerd-macos.sh'
```

Expected:

- reports macOS/Darwin and `arm64`
- reports Python >=3.11
- reports MLX model as `mlx-community/Qwen2.5-1.5B-Instruct-4bit`
- reports `mlx-lm==0.31.3` or configured equivalent
- reports sidecar venv plan
- exits before repo download, CA creation/copy, venv install, launchd, service
  start, or browser open

Save output as:

```text
evidence/02_preflight_only.txt
```

## Runtime-Only Smoke

Use a temp install directory so this does not disturb the real mac-mini setup:

```bash
ssh mac-mini 'rm -rf "$HOME/.ihomenerd-smoke/mac-mlx-runtime-preflight"'

ssh mac-mini 'cd ~/Projects/iHomeNerd && IHN_INSTALL_DIR="$HOME/.ihomenerd-smoke/mac-mlx-runtime-preflight" IHN_MAC_LLM_BACKEND=mlx IHN_MLX_RUNTIME_ONLY=1 IHN_SKIP_OPEN=1 bash install-ihomenerd-macos.sh'
```

Expected:

- creates `${IHN_INSTALL_DIR}/runtime/mlx-sidecar-venv`
- installs pinned `mlx-lm==0.31.3` unless already present
- `mlx_lm.server --help` works from the sidecar venv
- does not create backend `.venv`
- does not write LaunchAgents
- does not call `launchctl`
- does not start iHN or MLX services

Save output as:

```text
evidence/03_runtime_only.txt
```

Probe the sidecar CLI:

```bash
ssh mac-mini '$HOME/.ihomenerd-smoke/mac-mlx-runtime-preflight/runtime/mlx-sidecar-venv/bin/mlx_lm.server --help | head -40'
```

Save as:

```text
evidence/04_mlx_server_help.txt
```

## Known-Bad Model Guard

Run:

```bash
ssh mac-mini 'cd ~/Projects/iHomeNerd && IHN_MAC_LLM_BACKEND=mlx IHN_MLX_MODEL=mlx-community/gemma-4-e2b-it-4bit IHN_PREFLIGHT_ONLY=1 IHN_SKIP_OPEN=1 bash install-ihomenerd-macos.sh'
```

Expected:

- non-zero exit, or an explicit refusal that prevents the installer from
  proceeding
- message mentions Gemma 4 is not validated / is incompatible with
  `mlx-lm==0.31.3`
- message mentions `IHN_ALLOW_UNVALIDATED_MLX_MODEL=1` if an override exists

Save as:

```text
evidence/05_gemma4_guard.txt
```

## Override Smoke

Run:

```bash
ssh mac-mini 'cd ~/Projects/iHomeNerd && IHN_MAC_LLM_BACKEND=mlx IHN_MLX_MODEL=mlx-community/gemma-4-e2b-it-4bit IHN_ALLOW_UNVALIDATED_MLX_MODEL=1 IHN_PREFLIGHT_ONLY=1 IHN_SKIP_OPEN=1 bash install-ihomenerd-macos.sh'
```

Expected:

- preflight can proceed only because the explicit override was set
- output still warns that the model is unvalidated or known risky

Save as:

```text
evidence/06_gemma4_override.txt
```

## Pass Criteria

- syntax check passes.
- preflight-only mode is side-effect safe.
- runtime-only mode creates only the sidecar runtime venv.
- default model is Qwen2.5 1.5B.
- default package is `mlx-lm==0.31.3`.
- backend venv and sidecar venv are separate.
- Gemma 4 guard prevents unsafe default usage.
- result.md is filled with exact branch and commit SHAs.
