# iPhone-to-Mac Brain Sprint Index

| Sprint | Status | Branch | Implementation Host | Build Host | Validation | Depends On |
|---|---|---|---|---|---|---|
| `2026-05-02_first-implementation-spine` | completed | merged to `main` | `mac-mini` / Codex | `mac-mini` | static + backend fake sidecar; live iPhone route blocked by stale app build | `feature/iphone-mac-brain-setup` |
| `2026-05-03_ios-mac-setup-route-smoke` | completed | `validation/iphone-to-mac-brain/ios-mac-setup-route-smoke` | `mac-mini` | `mac-mini` | PASS on real iPhone 12 Pro Max; evidence in `testing/initiatives/...` | current `main` built to iPhone |
| `2026-05-03_mlx-chat-contract-cleanup` | completed | `feature/iphone-to-mac-brain/mlx-chat-contract-cleanup` | `Acer-HL` | backend local | PASS on `iMac-Debian`; evidence in `testing/initiatives/...` | provider seam landed |
| `2026-05-03_mac-mini-mlx-sidecar-smoke` | completed | `validation/iphone-to-mac-brain/mac-mini-mlx-sidecar-smoke` | `iMac-Debian` | `mac-mini` | PASS with findings; Qwen2.5 sidecar works, Gemma 4 default rejected | real MLX runtime available |
| `2026-05-04_mac-mlx-runtime-preflight` | completed | `feature/iphone-to-mac-brain/mac-mlx-runtime-preflight` | `Acer-HL` | `mac-mini` | PASS with 2 low-severity findings; evidence in `testing/initiatives/...` | route smoke + real sidecar smoke complete |
| `2026-05-04_mac-launchd-sidecar-service` | completed | `feature/iphone-to-mac-brain/mac-launchd-sidecar-service` | `Acer-HL` | `mac-mini` | PASS with 2 low-severity findings; evidence in `testing/initiatives/...` | runtime preflight complete |
| `2026-05-04_iphone-mac-pairing-approval` | active | `feature/iphone-to-mac-brain/pairing-approval` | `Acer-HL` or Swift-aware host | `mac-mini` | `iMac-Debian` | route smoke complete |
| `2026-05-04_token-gated-cert-handoff` | queued | `feature/iphone-to-mac-brain/token-gated-cert-handoff` | Swift/Python split | `mac-mini` | `iMac-Debian` | pairing approval complete |

## Current Priority

Active lane: `2026-05-04_iphone-mac-pairing-approval`.

Next queued lane: `2026-05-04_token-gated-cert-handoff`.

The nearest evidence gaps are now closed:

- `/v1/chat` contract cleanup passed fake MLX sidecar validation.
- iPhone Mac setup routes passed real iPhone 12 Pro Max route smoke.
- real `mac-mini` MLX sidecar smoke passed with
  `mlx-community/Qwen2.5-1.5B-Instruct-4bit`.
- `mlx-community/gemma-4-e2b-it-4bit` is not a safe Mac MLX sidecar default for
  `mlx-lm==0.31.3`.
- macOS installer preflight/runtime-only modes now reproduce the validated MLX
  sidecar setup without touching launchd or backend venv.
- macOS launchd sidecar service smoke passed with suffixed labels, isolated
  smoke ports, `IHN_SKIP_OLLAMA=1`, and cleanup that left production
  `~/.ihomenerd` untouched.

The Mac MLX lane now has a validated sidecar runtime and launchd lifecycle.
Larger MLX models remain behind future benchmark/profile sprints.

Model selection reference:

- `MAC_MLX_MODEL_LADDER.md`
