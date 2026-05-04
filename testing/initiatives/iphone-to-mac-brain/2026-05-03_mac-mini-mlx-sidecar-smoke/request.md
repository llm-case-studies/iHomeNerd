# Test Request - Mac Mini MLX Sidecar Smoke

**Date issued:** 2026-05-03
**Initiative:** `iphone-to-mac-brain`
**Sprint:** `2026-05-03_mac-mini-mlx-sidecar-smoke`
**Target branch:** `main`
**Validation branch:** `validation/iphone-to-mac-brain/mac-mini-mlx-sidecar-smoke`
**Validation host:** `iMac-Debian`
**Runtime host:** `mac-mini`

## What You Are Validating

The real Apple Silicon MLX sidecar on `mac-mini` can serve the iHN Python
backend through the already-merged `mlx_macos` provider path.

This is not the fake sidecar contract smoke. Use `mlx_lm.server` if it is
available. If it is not available, record a precise blocker and stop before
making product changes or installing packages.

Post-validation note: the first pass found that
`mlx-community/gemma-4-e2b-it-4bit` is not compatible with `mlx-lm==0.31.3`
for generation on the Mac sidecar. The replayable validated starter model is
`mlx-community/Qwen2.5-1.5B-Instruct-4bit`.

## Branch Setup

```bash
git status --short --branch
git fetch origin
git switch -c validation/iphone-to-mac-brain/mac-mini-mlx-sidecar-smoke origin/main
```

If the branch already exists locally, switch to it and record the current SHA.

## Mac Mini Preflight

Run these from `iMac-Debian`:

```bash
ssh -o BatchMode=yes mac-mini hostname
ssh mac-mini 'cd ~/Projects/iHomeNerd && git status --short --branch && git rev-parse HEAD'
ssh mac-mini 'uname -m; sw_vers; command -v python3; python3 --version; command -v brew || true; command -v mlx_lm.server || true'
ssh mac-mini 'cd ~/Projects/iHomeNerd/backend && if [ -x .venv/bin/python ]; then .venv/bin/python --version; else echo "backend .venv missing"; fi'
```

Record output in:

```text
testing/initiatives/iphone-to-mac-brain/2026-05-03_mac-mini-mlx-sidecar-smoke/evidence/01_mac_preflight.txt
```

Probe MLX imports on `mac-mini`:

```bash
ssh mac-mini 'python3 - <<'"'"'PY'"'"'
import importlib.util

for name in ["mlx", "mlx_lm"]:
    print(f"{name}={bool(importlib.util.find_spec(name))}")

try:
    import mlx.core as mx
    info = mx.metal.device_info() if hasattr(mx, "metal") else "no metal attr"
    print("mlx_device_info=", info)
except Exception as exc:
    print("mlx_probe_error=", repr(exc))
PY'
```

Record output in:

```text
testing/initiatives/iphone-to-mac-brain/2026-05-03_mac-mini-mlx-sidecar-smoke/evidence/02_mlx_import_probe.txt
```

Interpretation:

- macOS system `python3` may be older than 3.11; record it, but do not block on
  that alone.
- backend `.venv/bin/python` must be Python >=3.11 for `python -m app.main`.
- `mlx_lm.server` must be available in the shell used to start the sidecar.
- default `python3` import failures are evidence, but they are only blockers if
  they also prevent the actual `mlx_lm.server` command from starting.

If the backend venv is missing/old, `mlx_lm.server` is missing, or the sidecar
cannot start, stop and record the sprint as blocked unless Alex explicitly
approves environment setup.

## Runtime Setup

Sync mac-mini to current `main`:

```bash
ssh mac-mini 'cd ~/Projects/iHomeNerd && git fetch origin && git switch main && git pull --ff-only'
```

Terminal A on `mac-mini` or an SSH session kept open:

```bash
cd ~/Projects/iHomeNerd
mlx_lm.server --host 127.0.0.1 --port 11435 --model mlx-community/Qwen2.5-1.5B-Instruct-4bit
```

If the model downloads on first launch, capture the log and elapsed time.

Terminal B on `mac-mini` or a second SSH session:

```bash
cd ~/Projects/iHomeNerd/backend
source .venv/bin/activate
IHN_LLM_PROVIDER=mlx \
IHN_MLX_SERVER_URL=http://127.0.0.1:11435 \
IHN_MLX_MODEL=mlx-community/Qwen2.5-1.5B-Instruct-4bit \
IHN_HOST=127.0.0.1 \
IHN_PORT=17791 \
python -m app.main
```

If `backend/.venv` is missing or does not provide Python >=3.11, record that as
a blocker unless Alex approves environment setup.

## Probe Commands

Run probes from `iMac-Debian` by asking `mac-mini` to curl its own localhost
services:

```bash
ssh mac-mini 'curl -s http://127.0.0.1:11435/v1/models | python3 -m json.tool'
```

Save as:

```text
evidence/03_sidecar_models.json
```

```bash
ssh mac-mini 'curl -sk https://127.0.0.1:17791/health | python3 -m json.tool'
```

Save as:

```text
evidence/04_backend_health.json
```

```bash
ssh mac-mini 'curl -sk https://127.0.0.1:17791/capabilities | python3 -m json.tool'
```

Save as:

```text
evidence/05_capabilities.json
```

```bash
ssh mac-mini 'curl -sk -X POST https://127.0.0.1:17791/v1/chat -H "Content-Type: application/json" -d "{\"prompt\":\"Say hello from real MLX on the Mac in six words.\"}" | python3 -m json.tool'
```

Save as:

```text
evidence/06_chat_prompt.json
```

```bash
ssh mac-mini 'curl -sk -X POST https://127.0.0.1:17791/v1/chat -H "Content-Type: application/json" -d "{\"messages\":[{\"role\":\"user\",\"content\":\"Name the backend in four words.\"}]}" | python3 -m json.tool'
```

Save as:

```text
evidence/07_chat_messages.json
```

## No-Sidecar Error Smoke

Stop the MLX sidecar. Keep the backend running with `IHN_LLM_PROVIDER=mlx`,
then run:

```bash
ssh mac-mini 'curl -ski -X POST https://127.0.0.1:17791/v1/chat -H "Content-Type: application/json" -d "{\"prompt\":\"This should fail cleanly.\"}"'
```

Expected:

- HTTP 502
- response is JSON or clearly has JSON `detail`
- no traceback HTML/plain 500

Save as:

```text
evidence/08_no_sidecar_502.txt
```

Also save sidecar and backend logs:

```text
evidence/09_sidecar_log.txt
evidence/10_backend_log.txt
```

## Expected Pass Criteria

- sidecar `/v1/models` returns a model list including or compatible with
  `mlx-community/Qwen2.5-1.5B-Instruct-4bit`.
- iHN `/health` reports `provider == "mlx"` and `backend == "mlx_macos"`.
- iHN `/capabilities` reports chat capability with MLX provider metadata.
- both chat requests return HTTP 200.
- both chat responses include `role`, `content`, `text`, `response`, `model`,
  `backend`, and `provider`.
- chat response `backend == "mlx_macos"` and `provider == "mlx"`.
- no-sidecar request returns clean HTTP 502 JSON detail.

## Result Path

Write results to:

```text
testing/initiatives/iphone-to-mac-brain/2026-05-03_mac-mini-mlx-sidecar-smoke/result.md
```

Put raw command output under:

```text
testing/initiatives/iphone-to-mac-brain/2026-05-03_mac-mini-mlx-sidecar-smoke/evidence/
```
