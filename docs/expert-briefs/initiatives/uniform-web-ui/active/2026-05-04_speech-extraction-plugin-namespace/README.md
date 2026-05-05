# Speech Extraction + Plugin Namespace

**Status:** active sprint  
**Initiative:** `uniform-web-ui`  
**Branch:** `feature/uniform-web-ui/speech-extraction-plugin-namespace`

## Purpose

This is the first coding sprint that follows the completed client-surface
boundary review on `main`.

The goal is to make one high-signal boundary correction without reopening the
whole architecture:

- extract generic speech routes out of `plugins/pronunco.py`
- move PronunCo-specific routes behind `/v1/plugins/pronunco/...`
- split `/capabilities` into `core` vs `plugins`
- delete the redundant flat `/v1/image-extract` stub

This sprint should prove that the new boundary model produces a cleaner public
surface with minimal product risk.

## Files

- `00-opencode-kickoff.md` - paste-ready OpenCode implementation prompt
- `01-brief.md` - sprint brief and execution fence
- `02-result-template.md` - implementer result template
- `03-merge-note-template.md` - merge note shape for initiative owner
- `testing/initiatives/uniform-web-ui/2026-05-04_speech-extraction-plugin-namespace/request.md`

