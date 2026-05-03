# iPhone-to-Mac Brain Sprint Index

| Sprint | Status | Branch | Implementation Host | Build Host | Validation | Depends On |
|---|---|---|---|---|---|---|
| `2026-05-02_first-implementation-spine` | completed | merged to `main` | `mac-mini` / Codex | `mac-mini` | static + backend fake sidecar; live iPhone route blocked by stale app build | `feature/iphone-mac-brain-setup` |
| `2026-05-03_ios-mac-setup-route-smoke` | active | `wip/testing` or no-code validation branch | `mac-mini` | `mac-mini` | `iMac-Debian` / `testing/initiatives/...` | current `main` built to iPhone |
| `2026-05-03_mlx-chat-contract-cleanup` | queued | `feature/mlx-chat-contract-cleanup` | `Acer-HL` | backend local | `iMac-Debian` | provider seam landed |
| `2026-05-03_mac-mini-mlx-sidecar-smoke` | queued | `feature/mac-mini-mlx-sidecar-smoke` | `mac-mini` | `mac-mini` | `iMac-Debian` | real MLX runtime available |
| `2026-05-04_mac-installer-preflight-hardening` | queued | `feature/mac-installer-preflight` | `Acer-HL` or `mac-mini` | `mac-mini` | `iMac-Debian` | route smoke + sidecar smoke preferred |
| `2026-05-04_iphone-mac-pairing-approval` | queued | `feature/iphone-mac-pairing-approval` | Swift-aware host | `mac-mini` | `iMac-Debian` | route smoke complete |
| `2026-05-04_token-gated-cert-handoff` | queued | `feature/token-gated-cert-handoff` | Swift/Python split | `mac-mini` | `iMac-Debian` | pairing approval complete |

## Current Priority

Start with `2026-05-03_ios-mac-setup-route-smoke`. The code paths landed, but
the last live iPhone test was blocked because the phone had a stale build. This
is the closest evidence gap and should be closed before deeper pairing work.

