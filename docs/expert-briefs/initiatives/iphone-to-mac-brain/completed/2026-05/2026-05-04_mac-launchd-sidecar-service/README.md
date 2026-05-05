# Mac Launchd Sidecar Service

**Status:** completed - PASS with findings
**Initiative:** `iphone-to-mac-brain`
**Branch:** `feature/iphone-to-mac-brain/mac-launchd-sidecar-service`

## Purpose

Turned the validated MLX sidecar runtime into a reliable macOS user launchd
service that can be installed, restarted, inspected, and validated without
clobbering an existing iHomeNerd install.

Validation passed 10/10 smoke probes on `mac-mini` through `iMac-Debian`. The
default model stayed on the already validated Qwen2.5 1.5B starter.

Two low-severity findings remain: `mac-mini` needed `IHN_PYTHON_BIN` because it
does not have system Python 3.11+, and first-launch MLX sidecar readiness can
race the installer health message during cold start.

## Files

- `00-opencode-kickoff.md`: paste-ready OpenCode implementation prompt
- `01-brief.md`: sprint brief and execution fence
- `02-result-template.md`: implementer result template
- `03-merge-note.md`: merge note for initiative owner
- `testing/initiatives/iphone-to-mac-brain/2026-05-04_mac-launchd-sidecar-service/request.md`
