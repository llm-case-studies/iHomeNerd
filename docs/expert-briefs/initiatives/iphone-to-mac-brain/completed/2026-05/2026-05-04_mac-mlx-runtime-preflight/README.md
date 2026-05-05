# Mac MLX Runtime Preflight

**Status:** completed - PASS with findings
**Initiative:** `iphone-to-mac-brain`
**Branch:** `feature/iphone-to-mac-brain/mac-mlx-runtime-preflight`

## Purpose

Made the macOS installer/runtime path repeat the validated manual MLX setup:
a dedicated sidecar venv, pinned `mlx-lm`, Qwen2.5 starter model, and clear
preflight errors before launchd or pairing work grows on top of it.

Validation passed on `mac-mini` through `iMac-Debian`. Two low-severity findings
remain: disk confirmation can still prompt before preflight-only exits unless
`IHN_AUTO_YES=1` is set, and `python -m mlx_lm.server --help` prints a
deprecation warning while still exiting 0.

## Files

- `00-opencode-kickoff.md`: paste-ready OpenCode implementation prompt
- `01-brief.md`: sprint brief and execution fence
- `02-result-template.md`: implementer result template
- `03-merge-note.md`: merge note for initiative owner
- `testing/initiatives/iphone-to-mac-brain/2026-05-04_mac-mlx-runtime-preflight/request.md`
