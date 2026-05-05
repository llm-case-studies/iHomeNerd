# Test Request - Mac Launchd Sidecar Service

**Date issued:** 2026-05-05
**Initiative:** `iphone-to-mac-brain`
**Sprint:** `2026-05-04_mac-launchd-sidecar-service`
**Product branch:** `feature/iphone-to-mac-brain/mac-launchd-sidecar-service`
**Validator branch:** `validation/iphone-to-mac-brain/mac-launchd-sidecar-service`
**Validation host:** `iMac-Debian`
**Runtime host:** `mac-mini`

## What You Are Validating

Validate that the macOS installer can create a launchd-managed MLX sidecar
service using:

- a dedicated MLX sidecar venv
- non-production smoke labels
- non-production smoke ports
- no Ollama launchd registration during MLX-only smoke
- localhost-only sidecar binding
- canonical iHN chat response through the launchd-started sidecar

This test should not touch production `com.ihomenerd.brain`,
`com.ihomenerd.mlx`, or `~/.ihomenerd`.

## Product Commit Under Test

Record:

```bash
git rev-parse HEAD
```

from the product branch on `mac-mini`.

## Smoke Configuration

Use these values unless you have a strong reason to change them:

```bash
export IHN_SMOKE_DIR="$HOME/.ihomenerd-smoke/mac-launchd-sidecar-service"
export IHN_SMOKE_LABEL_SUFFIX=".smoke"
export IHN_SMOKE_PORT="18777"
export IHN_SMOKE_SETUP_PORT="18778"
export IHN_SMOKE_MLX_PORT="12435"
```

Expected labels:

```text
com.ihomenerd.brain.smoke
com.ihomenerd.mlx.smoke
```

Expected URLs:

```text
https://127.0.0.1:18777/health
http://127.0.0.1:12435/v1/models
```

## Preflight Safety Capture

Before running the installer, capture:

```bash
launchctl print "gui/$(id -u)/com.ihomenerd.brain" || true
launchctl print "gui/$(id -u)/com.ihomenerd.mlx" || true
launchctl print "gui/$(id -u)/com.ihomenerd.ollama" || true
test -d "$HOME/.ihomenerd" && echo "production install exists" || echo "production install absent"
test -d "$IHN_SMOKE_DIR" && echo "old smoke install exists" || echo "old smoke install absent"
```

Save as:

```text
evidence/01_preflight_safety.txt
```

## Static Checks

On `mac-mini`, on the product branch:

```bash
bash -n install-ihomenerd-macos.sh
```

Save as:

```text
evidence/02_bash_syntax.txt
```

Inspect the installer and generated launcher behavior. The product should not
use:

```text
python -m mlx_lm.server
```

The generated MLX runner should use either:

```text
mlx_lm.server
```

or:

```text
python -m mlx_lm server
```

Save the inspection as:

```text
evidence/03_mlx_invocation.txt
```

## Smoke Install

Run the full smoke install on `mac-mini` using the product branch:

```bash
IHN_INSTALL_DIR="$IHN_SMOKE_DIR" \
IHN_SERVICE_LABEL_SUFFIX="$IHN_SMOKE_LABEL_SUFFIX" \
IHN_PORT="$IHN_SMOKE_PORT" \
IHN_MLX_SERVER_PORT="$IHN_SMOKE_MLX_PORT" \
IHN_MAC_LLM_BACKEND=mlx \
IHN_SKIP_OLLAMA=1 \
IHN_AUTO_YES=1 \
IHN_SKIP_OPEN=1 \
bash install-ihomenerd-macos.sh
```

Save stdout/stderr as:

```text
evidence/04_smoke_install.txt
```

## Generated File Assertions

Capture and assert:

- `${IHN_SMOKE_DIR}/run-mlx.sh` exists and is executable
- `${IHN_SMOKE_DIR}/run-ihomenerd.sh` exists and is executable
- `run-mlx.sh` binds to `127.0.0.1`
- `run-mlx.sh` references `$IHN_SMOKE_MLX_PORT`
- `run-mlx.sh` does not bind to `0.0.0.0`
- `run-ihomenerd.sh` exports `IHN_PORT=$IHN_SMOKE_PORT`
- `run-ihomenerd.sh` exports `IHN_MLX_SERVER_URL=http://127.0.0.1:$IHN_SMOKE_MLX_PORT`

Save as:

```text
evidence/05_generated_files.txt
```

## Launchd Assertions

Capture:

```bash
launchctl print "gui/$(id -u)/com.ihomenerd.brain.smoke"
launchctl print "gui/$(id -u)/com.ihomenerd.mlx.smoke"
```

Assert:

- both labels exist
- no unsuffixed production label was booted or replaced by this test
- `com.ihomenerd.ollama.smoke` was not registered when `IHN_SKIP_OLLAMA=1`
- MLX service is not crash-looping

Save as:

```text
evidence/06_launchd_status.txt
```

## Runtime Probes

Probe MLX sidecar:

```bash
curl -fsS "http://127.0.0.1:${IHN_SMOKE_MLX_PORT}/v1/models"
```

Save as:

```text
evidence/07_mlx_models.json
```

Probe iHN health:

```bash
curl -sk "https://127.0.0.1:${IHN_SMOKE_PORT}/health"
```

Save as:

```text
evidence/08_ihn_health.json
```

Probe iHN chat:

```bash
curl -sk "https://127.0.0.1:${IHN_SMOKE_PORT}/v1/chat" \
  -H 'content-type: application/json' \
  -d '{"prompt":"Reply with exactly: launchd mlx ok"}'
```

Save as:

```text
evidence/09_ihn_chat.json
```

Assert the chat response has at least:

- `role`
- `content`
- `text`
- `response`
- `model`
- `backend`
- `provider`

## Cleanup

Unload only smoke labels:

```bash
launchctl bootout "gui/$(id -u)/com.ihomenerd.brain.smoke" || true
launchctl bootout "gui/$(id -u)/com.ihomenerd.mlx.smoke" || true
launchctl bootout "gui/$(id -u)/com.ihomenerd.ollama.smoke" || true
```

Remove only smoke plists and smoke install directory:

```bash
rm -f "$HOME/Library/LaunchAgents/com.ihomenerd.brain.smoke.plist"
rm -f "$HOME/Library/LaunchAgents/com.ihomenerd.mlx.smoke.plist"
rm -f "$HOME/Library/LaunchAgents/com.ihomenerd.ollama.smoke.plist"
rm -rf "$IHN_SMOKE_DIR"
```

Then verify production labels and production install state match the preflight
capture.

Save as:

```text
evidence/10_cleanup.txt
```

## Result

Fill:

```text
testing/initiatives/iphone-to-mac-brain/2026-05-04_mac-launchd-sidecar-service/result.md
```

Commit result and evidence to:

```text
validation/iphone-to-mac-brain/mac-launchd-sidecar-service
```

Push the validation branch.
