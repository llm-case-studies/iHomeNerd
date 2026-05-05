# Mac Launchd Sidecar Service

**Status:** active sprint
**Initiative:** `iphone-to-mac-brain`
**Branch:** `feature/iphone-to-mac-brain/mac-launchd-sidecar-service`

## Purpose

Turn the validated MLX sidecar runtime into a reliable macOS user launchd
service that can be installed, restarted, inspected, and validated without
clobbering an existing iHomeNerd install.

This sprint is plumbing hardening. It should not change the default model away
from the already validated Qwen2.5 1.5B starter.

## Files

- `00-opencode-kickoff.md`: paste-ready OpenCode implementation prompt
- `01-brief.md`: sprint brief and execution fence
- `02-result-template.md`: implementer result template
- `03-merge-note-template.md`: merge note shape for initiative owner
- `testing/initiatives/iphone-to-mac-brain/2026-05-04_mac-launchd-sidecar-service/request.md`
