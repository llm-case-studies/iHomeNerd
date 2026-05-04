# Mac Mini MLX Sidecar Smoke

**Status:** completed - PASS with findings
**Initiative:** `iphone-to-mac-brain`
**Branch:** `validation/iphone-to-mac-brain/mac-mini-mlx-sidecar-smoke`

## Purpose

Proved that the real MLX runtime on `mac-mini` can serve iHN chat through the
Python backend's `mlx_macos` provider path.

The sprint also found that `mlx-community/gemma-4-e2b-it-4bit` is not a safe
default with `mlx-lm==0.31.3`; the validated starter model is
`mlx-community/Qwen2.5-1.5B-Instruct-4bit`.

## Files

- `00-opencode-kickoff.md`: paste-ready validator prompt
- `01-brief.md`: sprint brief and execution fence
- `02-result-template.md`: result shape for the validator
- `03-merge-note.md`: merge note for the initiative owner
- `testing/initiatives/iphone-to-mac-brain/2026-05-03_mac-mini-mlx-sidecar-smoke/request.md`
