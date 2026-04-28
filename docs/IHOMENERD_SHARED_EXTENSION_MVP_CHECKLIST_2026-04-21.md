# Shared iHomeNerd Extension MVP Checklist

**Date:** 2026-04-21  
**Audience:** Claude building the shared extension, Alex coordinating beta rollout  
**Primary canary:** PronunCo on `https://staging.pronunco.com`

## Goal

Ship a **narrow, store-review-friendly beta** of one shared iHomeNerd-owned browser extension that lets PronunCo reach a selected local/LAN iHomeNerd brain from a secure hosted page.

The extension should be a **transport + trust + diagnostics** layer.
It should **not** absorb PronunCo app logic.

## Must Ship

- Extension popup with explicit selected-brain URL editing
- Stored selected brain in extension-local storage
- Per-origin host permission request flow
- Background relay that can proxy JSON requests to the selected brain
- Content-script bridge for hosted app pages
- Basic diagnostics:
  - current selected brain
  - permission granted / missing
  - health probe
  - capabilities display
- PronunCo legacy compatibility shim
- Error hints for:
  - missing permission
  - failed fetch
  - self-signed HTTPS cert trust
  - `.local` hostname issues

## Must Not Block Beta

- cross-app event bus
- WebSocket push
- context menus
- microphone arbitration across tabs
- auto-routing across multiple brains
- aggressive background discovery
- browser-native media streaming features

## Product Split

- Shared extension owns:
  - browser trust boundary
  - selected brain config
  - optional discovery/rescan
  - relay transport
  - diagnostics
- PronunCo owns:
  - lesson extraction logic
  - translation logic
  - persistence semantics
  - app fallback behavior
  - UI wording beyond extension diagnostics

## Required Beta Modes

### 1. Pinned brain mode

This is required for beta.

- User can paste a base URL
- User can save it
- User can test it
- Extension shows exactly which brain is active

### 2. Discovery-assisted setup

This is optional for beta if time allows.

- User-triggered scan or rescan only
- User still explicitly picks one brain as default
- Discovery must not silently change the active target

## PronunCo Compatibility Requirements

The beta is not ready unless the shared extension can stand in for the current PronunCo extension.

That means:

- PronunCo staging can detect the extension in-tab
- PronunCo staging can relay to the selected brain from HTTPS pages
- Lesson Companion `Check local companion` works
- `/health` and `/capabilities` probing works
- `/v1/lesson-extract` works
- `/v1/translate` works
- PronunCo persistence probing can reuse the same selected brain

## Acceptance Criteria

The build is good enough for beta when all of these pass:

1. On `https://staging.pronunco.com`, the app can detect the extension without mixed-content or CORS failures.
2. The user can set a brain such as `https://msi-raider-linux.local:17777` in the popup.
3. The popup can test `/health` and display product/version/models.
4. PronunCo Lesson Companion can use the same brain for local lesson extraction.
5. PronunCo can use the same brain for local translation.
6. If permissions are missing, the extension returns an actionable error instead of a vague fetch failure.
7. If HTTPS trust is missing on a remote node, the extension tells the user to open `/health` once and accept the certificate.
8. If a `.local` host is flaky, the extension hints that the node IP may be safer.

## Recommended Build Order

1. Scaffold the shared extension with popup, content script, and background worker.
2. Implement selected-brain storage and permission grant flow.
3. Implement generic background relay for JSON requests.
4. Implement popup diagnostics for `/health` and `/capabilities`.
5. Add the PronunCo legacy bridge shim.
6. Verify PronunCo staging works without frontend changes.
7. Add optional discovery/rescan if time remains.
8. Prepare store copy and screenshots.

## Beta Scope Guardrails

- Keep permissions narrow and explainable.
- Keep discovery user-initiated.
- Do not let brains authorize public origins.
- Do not auto-switch brains based only on claimed capability.
- Prefer one explicit selected brain over clever routing.

## Single-Sentence Build Instruction

Build the shared iHomeNerd extension as a conservative transport/trust layer first, preserve explicit selected-brain mode, and include a PronunCo compatibility shim so PronunCo staging can be the canary without waiting for a frontend rewrite.
