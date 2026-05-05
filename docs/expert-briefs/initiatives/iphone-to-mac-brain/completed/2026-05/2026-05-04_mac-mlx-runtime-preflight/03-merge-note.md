# Merge Note - Mac MLX Runtime Preflight

## Branch

- working branch: `feature/iphone-to-mac-brain/mac-mlx-runtime-preflight`
- merge target: `main`
- validation branch: `validation/iphone-to-mac-brain/mac-mlx-runtime-preflight`

## Validation Outcome

- implementation host: `Acer-HL`
- validation host: `iMac-Debian`
- runtime host: `mac-mini`
- tested product commit: `6f1b55a`
- implementation merge commit: `cd74846`
- validation evidence commit: `4d02b18`
- verdict: PASS with 2 low-severity findings
- result path:
  `testing/initiatives/iphone-to-mac-brain/2026-05-04_mac-mlx-runtime-preflight/result.md`

## Evidence Summary

- preflight-only: PASS, exit 0, summary printed, no side effects
- runtime-only: PASS, temp sidecar venv created, `mlx-lm==0.31.3` installed,
  backend venv and launchd untouched
- sidecar venv: `${INSTALL_DIR}/runtime/mlx-sidecar-venv`
- Qwen2.5 model: default starter model is
  `mlx-community/Qwen2.5-1.5B-Instruct-4bit`
- Gemma 4 guard: PASS, exits 1 with clear known-incompatible message unless
  `IHN_ALLOW_UNVALIDATED_MLX_MODEL=1` is set
- no unexpected launchd/service side effects: confirmed

## Decision

- merge to `main`: yes
- close sprint: yes
- split follow-up: yes; launchd service hardening remains queued separately

## Follow-Up

- next sprint: `2026-05-04_mac-launchd-sidecar-service`
- low-severity follow-up: make `IHN_PREFLIGHT_ONLY=1` fully non-interactive even
  on low disk, or document `IHN_AUTO_YES=1` as required for automation.
- low-severity follow-up: switch runtime verification from
  `python -m mlx_lm.server --help` to a non-deprecated invocation.
