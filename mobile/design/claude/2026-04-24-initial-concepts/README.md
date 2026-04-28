# Claude Design Export Staging

**Date:** 2026-04-24  
**Source:** Claude Design  
**Status:** first-pass concepts

## Share link

- `https://claude.ai/design/p/1e4ae0b5-e351-421d-8a66-37f8f9df7f80?via=share`

## What this folder is for

Use this folder to store exports and notes from the first Claude Design pass for:
- `iHN Home (iOS)` controller-class UI
- `iHN Node (Android)` node-class / travel-node UI
- `Command Center (web)` larger-screen `:17777` UI

Open the extracted HTML previews from:
- `html/index.html`

## Recommended contents

Put exports in these subfolders:
- `html/` for standalone HTML exports
- `pdf/` for PDF exports
- `screenshots/` for quick captures
- `prompts/` for the exact prompts used in Claude Design
- `notes/` for evaluation and change requests
- `raw/` for untouched zip exports from Claude Design

## Current assessment

Best first-pass directions:
- `Command Center (web)` is the strongest larger-screen concept
- `iHN Node (Android)` is the strongest product fit for a node-class app
- `iHN Home (iOS)` is promising, but still feels more generic and should be refined

## Suggested refinement themes

- make Home CA / trust health more prominent
- emphasize hotspot, clients, QR pairing, and hosted `:17777` on Android
- show handoff concepts like `Take this Home` and `Create my own Home`
- keep iHN separate from PronunCo or other app-specific workflows

## Export checklist

When Claude Design limits reset, export if available:
- standalone HTML
- PDF
- handoff bundle

If export is blocked, at minimum save:
- share URL
- screenshots
- prompts used

## Next prompt used for refinement

```text
This is a strong direction. Keep the overall visual language and product boundaries, but refine the design around trust, portable-node hosting, and handoff.

Changes I want:

1. Trust must be more prominent across all kits.
- Show Home CA fingerprint or trust status more clearly.
- Show per-node trust state in a more obvious way.
- Include mismatch / stale / repair states as first-class UI, not just one alert card.

2. Android node-class app should feel more like a portable host.
- Make hotspot name, connected clients, and local :17777 hosting more prominent.
- Add a clear “Open Command Center URL” action.
- Add “Show QR to pair” and “Take this Home / Create my own Home” actions.
- Include travel mode vs personal mode state.

3. iOS controller should feel more polished and less generic-admin.
- Keep it compact and native.
- Emphasize pairing, trust, alerts, and quick actions.
- Do not make it look like a mini desktop dashboard.

4. Command Center should reflect Home-level trust and handoff better.
- Add a clear Home Trust card or Trust Health panel.
- Show session/handoff concepts such as temporary session, class/session mode, and take-home flow.
- Keep dense operations on larger screens only.

5. Keep boundaries strict.
- Do not add PronunCo drills, lesson UIs, or app-specific workflows.
- Keep iHN centered on trust, nodes, models, runtime, updates, investigate, travel, and handoff.

Please produce a refined second pass for:
- iHN Home (iOS controller)
- iHN Node (Android portable host)
- Command Center (web)
```
