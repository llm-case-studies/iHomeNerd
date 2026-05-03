# iPhone-to-Mac Brain Sprint Index

| Sprint | Status | Branch | Implementation Host | Build Host | Validation | Depends On |
|---|---|---|---|---|---|---|
| `2026-05-02_first-implementation-spine` | completed | merged to `main` | `mac-mini` / Codex | `mac-mini` | static + backend fake sidecar; live iPhone route blocked by stale app build | `feature/iphone-mac-brain-setup` |
| `2026-05-03_ios-mac-setup-route-smoke` | completed | `validation/iphone-to-mac-brain/ios-mac-setup-route-smoke` | `mac-mini` | `mac-mini` | PASS on real iPhone 12 Pro Max; evidence in `testing/initiatives/...` | current `main` built to iPhone |
| `2026-05-03_mlx-chat-contract-cleanup` | completed | `feature/iphone-to-mac-brain/mlx-chat-contract-cleanup` | `Acer-HL` | backend local | PASS on `iMac-Debian`; evidence in `testing/initiatives/...` | provider seam landed |
| `2026-05-03_mac-mini-mlx-sidecar-smoke` | active | `validation/iphone-to-mac-brain/mac-mini-mlx-sidecar-smoke` | `iMac-Debian` | `mac-mini` | `iMac-Debian` | real MLX runtime available |
| `2026-05-04_mac-installer-preflight-hardening` | queued | `feature/iphone-to-mac-brain/mac-installer-preflight` | `Acer-HL` or `mac-mini` | `mac-mini` | `iMac-Debian` | route smoke + sidecar smoke preferred |
| `2026-05-04_iphone-mac-pairing-approval` | queued | `feature/iphone-to-mac-brain/pairing-approval` | Swift-aware host | `mac-mini` | `iMac-Debian` | route smoke complete |
| `2026-05-04_token-gated-cert-handoff` | queued | `feature/iphone-to-mac-brain/token-gated-cert-handoff` | Swift/Python split | `mac-mini` | `iMac-Debian` | pairing approval complete |

## Current Priority

Next active lane: `2026-05-03_mac-mini-mlx-sidecar-smoke`.

The nearest evidence gaps are now closed:

- `/v1/chat` contract cleanup passed fake MLX sidecar validation.
- iPhone Mac setup routes passed real iPhone 12 Pro Max route smoke.

This sprint is intentionally evidence-first: prove the real `mac-mini` MLX
runtime before asking agents to build installer or pairing work on top of it.
