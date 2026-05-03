# First Implementation Spine

**Status:** completed, merged to `main`
**Key commits:** `446b5b2`, `7ca398b`, `06a3bf7`

## What Landed

- iOS Mac Setup screen
- iOS `/setup/mac` route
- iOS `/setup/mac/manifest` route
- setup mDNS advertising shape
- macOS installer switches for `IHN_MAC_LLM_BACKEND=mlx`
- Python LLM provider seam
- MLX sidecar routing through `mlx_macos`
- `/health`, `/capabilities`, and `/discover` provider metadata

## Validation State

Backend MLX routing passed with a fake MLX sidecar on `origin/wip/testing`.
Live iPhone route validation was blocked because the device had a stale build
that did not include the new setup routes.

## Next Milestone

Close the stale-build gap with `active/2026-05-03_ios-mac-setup-route-smoke/`,
then proceed to chat contract cleanup and real Mac MLX sidecar smoke.

