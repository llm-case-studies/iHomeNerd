# Result - Mac Mini MLX Sidecar Smoke

## Summary

- validation branch:
- validation commit SHA:
- tested main commit SHA:
- validation host:
- runtime host:
- sidecar model:
- verdict:

## Preflight

- SSH to mac-mini:
- macOS version:
- architecture:
- Python path/version:
- backend venv:
- backend venv Python version:
- `mlx_lm.server` path:
- `mlx` import:
- `mlx_lm` import:

## Runtime

- sidecar command:
- backend command:
- sidecar port:
- backend HTTPS port:
- model download required:

## Probe Results

| Probe | Status | Notes |
|---|---|---|
| sidecar `/v1/models` | | |
| iHN `/health` | | |
| iHN `/capabilities` | | |
| iHN `/v1/chat` prompt | | |
| iHN `/v1/chat` messages | | |
| no-sidecar 502 | | |

## Response Contract

- prompt response fields:
- messages response fields:
- `backend`:
- `provider`:
- legacy `response` present:

## Evidence Files

| File | Content |
|---|---|
| `evidence/01_mac_preflight.txt` | |
| `evidence/02_mlx_import_probe.txt` | |
| `evidence/03_sidecar_models.json` | |
| `evidence/04_backend_health.json` | |
| `evidence/05_capabilities.json` | |
| `evidence/06_chat_prompt.json` | |
| `evidence/07_chat_messages.json` | |
| `evidence/08_no_sidecar_502.txt` | |
| `evidence/09_sidecar_log.txt` | |
| `evidence/10_backend_log.txt` | |

## Blockers

- TBD

## Follow-Up

- next recommended sprint:
