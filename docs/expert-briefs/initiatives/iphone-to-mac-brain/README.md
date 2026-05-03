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

## Lessons from Android Sprints

Carry these rules into the iPhone-to-Mac work:

- **Treat the Mac build as the artifact authority.** For iOS, the branch alone is not enough; record the exact commit, built artifact identity, and any sidecar/runtime prerequisites used for smoke.
- **Keep the three hosts explicit in every sprint.** Name the implementation host (Acer-HL), Apple build/deploy host (mac-mini), and validation/evidence host (iMac-Debian) in the execution fence.
- **Require smoke before validation handoff.** A coding sprint is not ready for testers until it builds on the Mac, installs on the iPhone, launches, and the touched route or contract responds honestly.
- **Separate product sprints from evidence sprints.** Route-smoke, sidecar-availability, and stale-build checks are valid initiative work even when they do not change product code.
- **Suspect artifact drift before declaring regressions.** If phone behavior differs, verify commit, prerequisite assets, app freshness, and MLX sidecar state before assuming the code changed.
- **Write machine-only blockers into the request.** If Xcode signing, device trust, or MLX availability is a precondition, put it in the sprint request so the next tester does not rediscover it the hard way.

## Host Access Contract

Use these host roles unless a sprint says otherwise:

- `Acer-HL`: OpenCode implementation host for focused backend or non-Xcode work.
- `mac-mini` / `mac-mini-m1.local`: Apple Silicon build/deploy host for iOS,
  macOS, Xcode signing, and local MLX runtime smoke.
- `iMac-Debian`: validation and evidence host.

SSH should be key-based between the sprint hosts. Verified on 2026-05-03:

```bash
ssh Acer-HL.local 'ssh -o BatchMode=yes mac-mini hostname'
ssh iMac-Debian.local 'ssh -o BatchMode=yes mac-mini hostname'
```

Both paths returned `mac-mini-m1.local` when invoked with the shared household
SSH key. Prefer `mac-mini` or `mac-mini-m1.local` over raw IPs because the Mac
mini uses DHCP and has already moved between LAN addresses.

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
