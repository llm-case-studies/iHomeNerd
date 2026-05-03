# iPhone-to-Mac Brain

## Goal

Make iHN Home's friendliest onboarding path start on an iPhone and graduate to
an Apple Silicon Mac as the always-on home brain.

The iPhone is the trusted concierge and portable controller. The Mac is the
durable local compute node. The user should be able to begin with a private
AI experience on the phone before installing or promoting desktop software.

## Product Philosophy

- **Phone first:** the App Store iPhone app is the least intimidating entry
  point and can host a small local node immediately.
- **Mac as promotion:** an M-series Mac becomes the long-running home brain only
  after the user chooses more permanence.
- **Trust is explicit:** the iPhone can approve and guide setup, but it cannot
  bypass macOS consent, Gatekeeper, signing, or notarization.
- **Local bootstrap, public safety:** setup starts from a LAN-local page served
  by the iPhone, but production Mac software still needs normal macOS trust.
- **Certificate material is sensitive:** no public setup URL should expose the
  Home CA private key. Early managed-home flows can be token-gated; public flows
  should move toward CSR signing.
- **MLX is the Apple path:** iOS and Apple Silicon Macs should use native MLX
  where it is practical, while iHN remains the TLS, discovery, control-plane,
  and contract layer.

## Current State

Already landed on `main`:

- iOS Mac Setup screen
- iOS bootstrap routes: `/setup/mac` and `/setup/mac/manifest`
- setup mDNS advertising shape
- macOS installer switches for `IHN_MAC_LLM_BACKEND=mlx`
- Python LLM provider seam
- MLX sidecar routing through `mlx_macos`
- `/health`, `/capabilities`, and `/discover` provider metadata

## Near-Term Milestones

1. Live iPhone route smoke for `/setup/mac` and `/setup/mac/manifest`.
2. Cross-platform `/v1/chat` contract cleanup.
3. Real Mac mini MLX sidecar smoke through iHN.
4. macOS preflight and installer hardening.
5. iPhone approve/deny pairing flow.
6. Token-gated certificate handoff.

## Source Docs

- `docs/IPHONE_TO_MAC_BRAIN_SETUP_VISION_2026-05-01.md`
- `docs/APPLE_SILICON_NATIVE_MLX_HOSTING_2026-05-01.md`
- `mobile/testing/requests/IPHONE_TO_MAC_BRAIN_SETUP_AND_MLX_PROVIDER_TEST_REQUEST_2026-05-02.md`

