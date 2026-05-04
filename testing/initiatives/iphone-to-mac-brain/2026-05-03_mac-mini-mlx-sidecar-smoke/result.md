# Validation Result — Mac Mini MLX Sidecar Smoke

**Date:** 2026-05-03
**Initiative:** `iphone-to-mac-brain`
**Sprint:** `2026-05-03_mac-mini-mlx-sidecar-smoke`
**Validation branch:** `validation/iphone-to-mac-brain/mac-mini-mlx-sidecar-smoke`
**Base:** `origin/main` (7f84a8d)
**Validator:** OpenCode on iMac-Debian
**Runtime host:** mac-mini (Apple Silicon M1, macOS 26.4.1)
**Successful sidecar model:** `mlx-community/Qwen2.5-1.5B-Instruct-4bit`

## Verdict: PASS (with findings)

The real MLX sidecar path is proven working end-to-end on Apple Silicon
hardware with `mlx-lm==0.31.3`. All smoke probes return expected results. One
significant product finding: the hardcoded default model is incompatible.

## Runtime Setup

| Component | Location / Value |
|-----------|-----------------|
| MLX venv | `~/.ihomenerd/runtime/mlx-sidecar-venv` (Python 3.12.13) |
| mlx-lm version | 0.31.3 (latest PyPI, 2026-04-22) |
| Sidecar model | `mlx-community/Qwen2.5-1.5B-Instruct-4bit` (~740 MB download) |
| Backend venv | `~/Projects/iHomeNerd/backend/.venv` (Python 3.12.13) |
| iHN commit | `7f84a8d` on `main` |

## Probe Results

| # | Probe | Expected | Actual | Pass |
|---|-------|----------|--------|------|
| 1 | Sidecar `/v1/models` | Model list | Qwen2.5 + Gemma4 listed | PASS |
| 2 | iHN `/health` | `provider=mlx`, `backend=mlx_macos` | `provider: "mlx"`, `backend: "mlx_macos"` | PASS |
| 3 | iHN `/capabilities` | MLX metadata on chat caps | All 8 chat caps: `provider=mlx`, `backend=mlx_macos` | PASS |
| 4 | `/v1/chat` prompt | HTTP 200, canonical fields | `role`, `content`, `text`, `response`, `model`, `backend`, `provider` all present | PASS |
| 5 | `/v1/chat` messages | HTTP 200, canonical fields | Same canonical field set as prompt probe | PASS |
| 6 | No-sidecar 502 | HTTP 502, JSON `detail` | `502 Bad Gateway`, `{"detail":"LLM provider unreachable..."}` | PASS |

### Probe Details

**Probe 1 - Sidecar Models:**
```
{"object":"list","data":[
  {"id":"mlx-community/gemma-4-e2b-it-4bit","object":"model",...},
  {"id":"mlx-community/Qwen2.5-1.5B-Instruct-4bit","object":"model",...}
]}
```

**Probe 2 - Backend Health:**
```json
{"ok":true, "llm":{"ok":true, "provider":"mlx", "backend":"mlx_macos",
 "model":"mlx-community/Qwen2.5-1.5B-Instruct-4bit"}}
```

**Probe 4 - Chat (prompt):**
```json
{"role":"assistant","content":"Hello from real MLX on the Mac.",
 "response":"Hello from real MLX on the Mac.",
 "text":"Hello from real MLX on the Mac.",
 "model":"mlx-community/Qwen2.5-1.5B-Instruct-4bit",
 "backend":"mlx_macos","provider":"mlx"}
```

**Probe 5 - Chat (messages):**
```json
{"role":"assistant","content":"Database, server, networking, security.",
 "response":"Database, server, networking, security.",
 "text":"Database, server, networking, security.",
 "model":"mlx-community/Qwen2.5-1.5B-Instruct-4bit",
 "backend":"mlx_macos","provider":"mlx"}
```

**Probe 6 - Sidecar Down (502):**
```
HTTP/1.1 502 Bad Gateway
{"detail":"LLM provider unreachable: All connection attempts failed"}
```

## Finding: Hardcoded Default Model Is Incompatible

The model `mlx-community/gemma-4-e2b-it-4bit` (hardcoded in
`backend/app/config.py` at tested commit `7f84a8d`) is incompatible with
`mlx-lm==0.31.3`. The model's safetensors contain
`self_attn.k_norm` parameters (layers 15-34) that the 0.31.3 Gemma4 architecture
does not recognize:

```
ValueError: Received 140 parameters not in model:
language_model.model.layers.15.self_attn.k_norm.weight, ...
```

This causes the generation thread to crash silently. Sidecar `/v1/models`
still responds (served by HTTP handler directly), but all POST completion
endpoints hang indefinitely, and the iHN backend returns 502.

**Impact:** The default configuration in `backend/app/config.py` creates an
unsafe default that will 502 on any fresh mac-mini install with
`mlx-lm==0.31.3`.

**Follow-up required:** Replace the hardcoded default model with a known-
compatible model (e.g., `mlx-community/Qwen2.5-1.5B-Instruct-4bit`) in
`backend/app/config.py` and all referenced docs. This is a product code
change — out of scope for this validation sprint.

## Model Download Timing

| Model | Files | Size | Time |
|-------|-------|------|------|
| `gemma-4-e2b-it-4bit` | 8 files | ~3.3 GB | ~80s (download only, load failed) |
| `Qwen2.5-1.5B-Instruct-4bit` | 9 files | ~740 MB | ~17s (download + load) |

## Evidence Index

```
evidence/
  01_mac_preflight.txt          - mac-mini environment preflight
  02_mlx_import_probe.txt       - mlx/mlx_lm import probe results
  03_mlx_install.txt            - MLX sidecar venv installation log
  04_gemma4_blocker.txt         - Gemma 4 incompatibility documentation
  04a_gemma4_sidecar_log.txt    - Full sidecar log with crash traceback
  05_sidecar_models.json        - Sidecar /v1/models (Qwen2.5)
  06_backend_health.json        - iHN /health with MLX provider
  07_capabilities.json          - iHN /capabilities summary
  07a_capabilities_full.json    - Full /capabilities payload
  08_chat_prompt.json           - /v1/chat prompt response
  09_chat_messages.json         - /v1/chat messages response
  10_no_sidecar_502.txt         - 502 JSON error when sidecar is down
  11_sidecar_log.txt            - Full Qwen2.5 sidecar log
  12_backend_log.txt            - Full iHN backend log
```
