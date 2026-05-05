# Merge Note - Mac Launchd Sidecar Service

## Branch

- working branch: `feature/iphone-to-mac-brain/mac-launchd-sidecar-service`
- merge target: `main`
- validation branch: `validation/iphone-to-mac-brain/mac-launchd-sidecar-service`

## Validation Outcome

- implementation host: `Acer-HL`
- validation host: `iMac-Debian`
- runtime host: `mac-mini`
- tested product commit: `1756e951eef76acb0f03fd26ea7071bc5f1859eb`
- implementation commits: `d650b7b`, `97eee6b`, `38d9687`
- validation evidence commit: `79e0244` (cherry-pick of validation branch
  `01af346`)
- verdict: PASS with 2 low-severity findings
- result path:
  `testing/initiatives/iphone-to-mac-brain/2026-05-04_mac-launchd-sidecar-service/result.md`

## Evidence Summary

- syntax: PASS, `bash -n install-ihomenerd-macos.sh` produced no output
- non-deprecated MLX invocation: PASS, uses `mlx_lm.server`
- smoke labels: PASS, `com.ihomenerd.brain.smoke` and
  `com.ihomenerd.mlx.smoke` used
- smoke ports: PASS, iHN `18777`, MLX `12435`
- launchd MLX service: PASS, running with hardening settings
- MLX `/v1/models`: PASS, Qwen2.5 1.5B listed
- iHN `/health`: PASS, `provider=mlx`, `backend=mlx_macos`
- iHN `/v1/chat`: PASS, canonical response fields present
- cleanup: PASS, smoke labels/plists/install removed, production install
  untouched

## Decision

- merge to `main`: yes
- close sprint: yes
- split follow-up: yes; Python bootstrap and first-launch wait hardening stay
  as separate follow-ups

## Follow-Up

- next sprint candidate: `2026-05-04_iphone-mac-pairing-approval`
- install hardening: document or automate Python 3.11+ bootstrap for clean
  macOS hosts.
- launchd polish: extend MLX sidecar readiness wait on cold first launch.
