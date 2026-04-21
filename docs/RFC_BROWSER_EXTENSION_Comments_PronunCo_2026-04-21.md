# Vision: Shared iHomeNerd Browser Extension

**Date:** 2026-04-21
**Perspective:** PronunCo implementation and release planning
**Audience:** Alex, Claude, iHomeNerd extension build work
**Related docs:**

- `/media/alex/LargeStorage/Projects/iHomeNerd/docs/RFC_BROWSER_EXTENSION_2026-04-21.md`
- [IHOMENERD_BROWSER_EXTENSION_PRONUNCO_REVIEW_2026-04-21.md](/media/alex/LargeStorage/Projects/PronunCo/docs/development/IHOMENERD_BROWSER_EXTENSION_PRONUNCO_REVIEW_2026-04-21.md:1)

## Position

PronunCo supports the move to **one shared iHomeNerd-owned browser extension**.

That is the right product direction.

The current per-app model does not scale:

- one store submission per app
- one extension per app
- duplicated trust and permission UX
- duplicated browser-bridge bugs
- user confusion about which extension does what

The right split is:

- **shared extension owns:** browser trust boundary, local/LAN relay, selected-brain config, optional discovery, diagnostics
- **apps own:** adapters, capability usage, app-specific routing rules, UI behavior, fallback logic

In short:

`iHomeNerd Bridge is transport + trust + discovery. Apps own adapters.`

## What PronunCo Needs

PronunCo is the best canary because it already has a real browser-bridge path that users can exercise today.

For PronunCo, a successful shared extension must preserve these properties:

- hosted `https://pronunco.com` / `https://staging.pronunco.com` pages can reach the local brain without CORS/mixed-content breakage
- explicit selected brain remains visible and testable
- health and capability probes remain easy to understand
- local translation and lesson extraction keep working
- migration from the dedicated PronunCo extension is smooth

PronunCo does **not** need the shared extension to understand drills, decks, coach UX, or lesson semantics.
That logic belongs in PronunCo.

## Recommended Architecture

### 1. Shared extension core

The extension should own:

- content script
- background/service worker
- popup/settings UI
- selected brain storage
- optional discovery registry
- host permission grants
- diagnostics and test flow

### 2. Generic bridge protocol

The extension should expose a generic protocol like:

- `ping`
- `get-config`
- `set-config`
- `discover`
- `request`

That is the right long-term contract for all apps.

### 3. App-owned adapters

Each app should have a thin adapter/SDK layer in its own repo.

For PronunCo, the adapter should decide:

- when to prefer local translation
- when to prefer local lesson extraction
- how to interpret `health` / `capabilities`
- how to render errors and hints
- when to fall back to cloud or browser-only behavior

This keeps the extension generic and store-friendly.

### 4. Legacy PronunCo compatibility shim

For beta, the shared extension should include a **PronunCo legacy compatibility layer**.

That means the new extension must support the existing PronunCo protocol, not just the old source string names.

Compatibility should cover:

- `pronunco-local-bridge-page`
- `pronunco-local-bridge-extension`
- current request/response type strings
- request ID flow
- `kind` values such as:
  - `pronunco-local-bridge/ping`
  - `pronunco-local-bridge/request`

This is what allows PronunCo to switch extensions without forcing an immediate frontend rewrite.

## Discovery Strategy

Discovery is useful. It should not be the only mode.

### Recommended model

1. **Pinned brain mode**
   - user picks a brain explicitly
   - extension stores it as the current default
   - apps can rely on predictable behavior

2. **Discovery-assisted setup**
   - extension can scan or rescan for brains
   - user sees candidate nodes with hostname, capabilities, and model summary
   - user chooses one as the pinned default

3. **Capability-based routing**
   - optional later mode
   - app can ask for a brain with capability `X`
   - should not replace the explicit selected-brain path

### Why this matters for PronunCo

PronunCo support/debugging is much simpler when the user can answer:

`I am connected to this brain at this URL.`

That matters for:

- lesson extraction issues
- local translation quality
- persistence sync questions
- certificate/debugging problems

## Security / Trust Boundary

The extension should remain the authority for browser trust decisions.

### Strong recommendation

- origin allowlisting must stay extension-owned
- brains may suggest metadata
- brains must **not** silently authorize new public web origins

That keeps the trust boundary understandable for release and store review.

### Practical beta posture

- explicit known-app allowlist
- optional localhost/dev allowlist
- per-origin host permission grants
- selected brain visible in popup
- clear test button and diagnostics

## v0.1 Beta Scope

If the goal is browser-store submission and beta testing early next week, the extension scope should stay narrow.

### Ship now

- generic request/response bridge
- selected brain storage and editing
- explicit `Test connection` flow
- health/capabilities inspection
- optional discovery or manual rescan
- PronunCo legacy shim
- clear fetch/certificate hints
- simple badge state

### Do not block beta on these

- cross-tab resource coordination
- push events / WebSocket routing
- context menus
- offline queue
- cross-app event bus
- rich notification workflows

Those are good v0.2+ features, not beta prerequisites.

## Browser Store Risk Posture

If the target is fast beta review, the extension should look conservative and explainable.

### Recommendations

- minimize permissions
- avoid broad permanent host permissions when optional grants can work
- keep discovery user-triggered or clearly user-initiated
- keep the popup simple and diagnostic
- use clear privacy copy:
  - addresses stay local
  - requests go only to local/LAN brains
  - no cloud sync inside the extension

From a PronunCo perspective, "boring and narrow" is more important than "ambitious."

## PronunCo Migration Plan

### Beta migration target

1. User installs shared iHomeNerd extension
2. User configures or discovers a brain
3. PronunCo works through the shared extension without frontend changes because the legacy shim is present
4. Once stable, PronunCo can migrate from the legacy message source to the generic iHomeNerd bridge SDK
5. Old PronunCo extension can be retired

### Immediate PronunCo acceptance criteria

The shared extension is good enough for PronunCo beta if all of these pass:

1. Lesson Companion on staging can detect the brain and show model/capability state
2. `Check local companion` works reliably on secure PronunCo pages
3. local lesson extraction works end-to-end
4. local translation works end-to-end
5. persistence-related probing can reuse the same selected brain
6. certificate and fetch failures surface actionable hints

## Concrete Build Order For Claude

### Phase 1: shared core

1. Create the iHomeNerd extension scaffold
2. Implement popup/config with explicit selected-brain editing
3. Implement background relay for generic `request`
4. Implement content-script bridge and page messaging
5. Add diagnostics: permission state, health test, capability display

### Phase 2: PronunCo canary

6. Implement the PronunCo legacy compatibility shim
7. Verify PronunCo staging works against the shared extension without frontend changes
8. Verify:
   - lesson extraction
   - local translation
   - persistence health/probe path

### Phase 3: beta hardening

9. Add optional discovery/rescan UI
10. Add migration note for users with the old PronunCo extension
11. Prepare store assets and privacy copy
12. Submit beta build to Chrome/Edge/Firefox channels as appropriate

## Suggested Message To Claude

If Claude is building this now, the instruction should be:

`Build the shared iHomeNerd extension as a narrow transport/trust layer first. Keep discovery secondary, preserve explicit selected-brain mode, and include a full PronunCo legacy compatibility shim so PronunCo staging can serve as the canary without waiting for a frontend migration.`

## Bottom Line

PronunCo should actively support this shared-extension strategy.

But the shared extension should be shaped like infrastructure, not like a cross-app product brain.

The winning beta formula is:

- one shared extension
- app-owned adapters
- explicit selected brain
- optional discovery
- strong trust boundary
- full PronunCo compatibility for migration

That is the fastest route to:

- less store overhead
- less duplicated code
- cleaner UX for users
- a realistic beta submission next week
