# iPhone-to-Mac Brain Sprint Index

| Sprint | Status | Branch | Implementation Host | Build Host | Validation | Depends On |
|---|---|---|---|---|---|---|
| `2026-05-02_first-implementation-spine` | completed | merged to `main` | `mac-mini` / Codex | `mac-mini` | static + backend fake sidecar; live iPhone route blocked by stale app build | `feature/iphone-mac-brain-setup` |
| `2026-05-03_ios-mac-setup-route-smoke` | completed | `validation/iphone-to-mac-brain/ios-mac-setup-route-smoke` | `mac-mini` | `mac-mini` | PASS on real iPhone 12 Pro Max; evidence in `testing/initiatives/...` | current `main` built to iPhone |
| `2026-05-03_mlx-chat-contract-cleanup` | completed | `feature/iphone-to-mac-brain/mlx-chat-contract-cleanup` | `Acer-HL` | backend local | PASS on `iMac-Debian`; evidence in `testing/initiatives/...` | provider seam landed |
| `2026-05-03_mac-mini-mlx-sidecar-smoke` | completed | `validation/iphone-to-mac-brain/mac-mini-mlx-sidecar-smoke` | `iMac-Debian` | `mac-mini` | PASS with findings; Qwen2.5 sidecar works, Gemma 4 default rejected | real MLX runtime available |
| `2026-05-04_mac-mlx-runtime-preflight` | completed | `feature/iphone-to-mac-brain/mac-mlx-runtime-preflight` | `Acer-HL` | `mac-mini` | PASS with 2 low-severity findings; evidence in `testing/initiatives/...` | route smoke + real sidecar smoke complete |
| `2026-05-04_mac-launchd-sidecar-service` | active | `feature/iphone-to-mac-brain/mac-launchd-sidecar-service` | `Acer-HL` | `mac-mini` | `iMac-Debian` | runtime preflight complete |
| `2026-05-04_iphone-mac-pairing-approval` | queued | `feature/iphone-to-mac-brain/pairing-approval` | Swift-aware host | `mac-mini` | `iMac-Debian` | route smoke complete |
| `2026-05-04_token-gated-cert-handoff` | queued | `feature/iphone-to-mac-brain/token-gated-cert-handoff` | Swift/Python split | `mac-mini` | `iMac-Debian` | pairing approval complete |

## Current Priority

Next active lane: `2026-05-04_mac-launchd-sidecar-service`.

The nearest evidence gaps are now closed:

- `/v1/chat` contract cleanup passed fake MLX sidecar validation.
- iPhone Mac setup routes passed real iPhone 12 Pro Max route smoke.
- real `mac-mini` MLX sidecar smoke passed with
  `mlx-community/Qwen2.5-1.5B-Instruct-4bit`.
- `mlx-community/gemma-4-e2b-it-4bit` is not a safe Mac MLX sidecar default for
  `mlx-lm==0.31.3`.
- macOS installer preflight/runtime-only modes now reproduce the validated MLX
  sidecar setup without touching launchd or backend venv.

Launchd service hardening is now active. It builds on the dedicated sidecar
venv and validated runtime-only path, while keeping larger MLX models behind
future benchmark/profile sprints.

Model selection reference:

- `MAC_MLX_MODEL_LADDER.md`
