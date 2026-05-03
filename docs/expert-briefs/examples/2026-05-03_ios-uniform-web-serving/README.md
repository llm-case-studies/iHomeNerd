# Sprint Pack: iOS Uniform Web Serving

The iOS counterpart to `2026-05-02_android-uniform-web-serving`.

## Why this sprint

The Android sprint landed bundled-SPA serving on the Android node. The iOS node still serves an 8-line stub HTML at `/`. This sprint brings iOS to parity: serve the real bundled Command Center SPA from the iOS app's resources, fail honestly when assets are missing, and leave a clear route contract for `/`, `/index.html`, `/assets/*`, and SPA deep links.

Architecture context: `docs/ARCHITECTURE_NODE_PARITY.md` (on `feature/uniform-web-ui`) — see §2 (menu vs lab) and §6 (per-platform state). iOS row in §6 currently reads "Menu missing on web side. 8-line stub `indexHTML` at `/`." This sprint closes that gap.

## Sprint topic

`feature/ios-uniform-web-serving`

Goal:

- serve the real bundled Command Center SPA from the iOS NodeRuntime's TLS port (`:17777`)
- mirror the Android serving contract: `/`, `/index.html`, `/assets/*`, SPA fallback for non-API paths
- fail honestly when bundled assets are missing — no synthetic placeholder pretending to be the real thing
- preserve all existing `/v1/*` API and `/setup/*` routes

Same six-rule pattern as Codex's three Android sprints:

1. real feature branch off `origin/main`
2. brief that names host, branch, merge target
3. point implementer at existing iOS sources + the Android sprint as analogue
4. require the implementer to leave a testing request behind
5. require iOS build/deploy smoke before testing handoff
6. merge only after validation

## Files in this pack

- `01-brief.md` — what the coding agent should do
- `02-result-template.md` — how the coding agent reports back
- `03-merge-note-template.md` — how the owner records promotion/hold

The validator request for this sprint lives in:

- `mobile/testing/requests/IOS_UNIFORM_WEB_SERVING_TEST_REQUEST_2026-05-03.md`

## Reference: the Android analogue

When in doubt, read `docs/expert-briefs/examples/2026-05-02_android-uniform-web-serving/` first. The iOS sprint tries to deliver the same browser-visible contract from a different runtime, so the Android sprint's brief, result note, and testing request are useful templates.
