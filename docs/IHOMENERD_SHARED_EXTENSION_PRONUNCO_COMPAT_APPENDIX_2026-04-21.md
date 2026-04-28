# Shared iHomeNerd Extension: PronunCo Compatibility Appendix

**Date:** 2026-04-21  
**Purpose:** define the minimum compatibility surface the shared iHomeNerd extension must preserve so PronunCo can use it as a drop-in replacement during beta

## Why This Exists

PronunCo already has a working browser-extension bridge.

If the shared iHomeNerd extension does not preserve that bridge contract, then "shared extension first, frontend migration later" is not real.

For beta, the shared extension should support both:

- the long-term generic iHomeNerd bridge protocol
- the existing PronunCo bridge protocol described below

## Current PronunCo Contract

### Page/extension message constants

PronunCo currently uses these exact message constants:

- page source: `pronunco-local-bridge-page`
- extension source: `pronunco-local-bridge-extension`
- request type: `pronunco-local-bridge/request`
- response type: `pronunco-local-bridge/response`
- ready type: `pronunco-local-bridge/ready`

The current content script posts a ready signal immediately on load, then relays page messages through `chrome.runtime.sendMessage`.

Timing matters here:

- PronunCo pings the bridge with a short timeout
- the page-side bridge currently defaults to about `350ms` for extension availability checks
- the compatibility content script should therefore initialize at `document_start` and post its ready signal immediately

## Required Content-Script Behavior

The shared extension must support a content-script path that behaves like this:

1. Post a ready message to the page:

```json
{
  "source": "pronunco-local-bridge-extension",
  "type": "pronunco-local-bridge/ready"
}
```

2. Listen for page messages of this shape:

```json
{
  "source": "pronunco-local-bridge-page",
  "type": "pronunco-local-bridge/request",
  "requestId": "string",
  "payload": {}
}
```

3. Return a success envelope of this shape:

```json
{
  "source": "pronunco-local-bridge-extension",
  "type": "pronunco-local-bridge/response",
  "requestId": "same-request-id",
  "ok": true,
  "payload": {}
}
```

4. Return an error envelope of this shape:

```json
{
  "source": "pronunco-local-bridge-extension",
  "type": "pronunco-local-bridge/response",
  "requestId": "same-request-id",
  "ok": false,
  "error": "human-readable message",
  "errorCode": "optional_machine_code"
}
```

## Required Runtime Message Kinds

For beta, the shared extension should preserve these exact `kind` values:

- `pronunco-local-bridge/ping`
- `pronunco-local-bridge/get-config`
- `pronunco-local-bridge/set-config`
- `pronunco-local-bridge/request`
- `pronunco-local-bridge/probe`

These can be implemented as a compatibility shim over the generic iHomeNerd bridge core.

## Base URL Behavior

The current PronunCo bridge has a selected-brain default and mild normalization behavior.

Preserve these semantics for beta:

- trim whitespace
- remove a trailing slash
- if the configured value is empty, fall back to the selected default
- preserve explicit user-entered `http` or `https` URLs
- map the exact legacy default `http://msi-raider-linux.local:17777` to `https://msi-raider-linux.local:17777`

The compatibility path should not silently rewrite arbitrary user-entered HTTP nodes to HTTPS.

## Expected Responses

### 1. `pronunco-local-bridge/ping`

Expected response shape:

```json
{
  "available": true,
  "version": "extension-version",
  "configuredBaseUrl": "https://node-or-loopback:17777",
  "permissionGranted": true
}
```

Notes:

- PronunCo uses this to discover whether the extension is alive in the current tab.
- `configuredBaseUrl` should reflect the selected brain.

### 2. `pronunco-local-bridge/get-config`

Expected response shape:

```json
{
  "baseUrl": "https://node-or-loopback:17777",
  "permissionPattern": "https://node-or-loopback:17777/*",
  "permissionGranted": true
}
```

### 3. `pronunco-local-bridge/set-config`

Expected request shape:

```json
{
  "kind": "pronunco-local-bridge/set-config",
  "baseUrl": "https://node-or-loopback:17777"
}
```

Expected response shape:

```json
{
  "baseUrl": "https://node-or-loopback:17777",
  "permissionPattern": "https://node-or-loopback:17777/*"
}
```

### 4. `pronunco-local-bridge/request`

Expected request shape:

```json
{
  "kind": "pronunco-local-bridge/request",
  "baseUrl": "https://node-or-loopback:17777",
  "path": "/some-path",
  "method": "GET or POST",
  "body": {},
  "timeoutMs": 2500
}
```

Expected response envelope:

```json
{
  "ok": true,
  "status": 200,
  "baseUrl": "https://node-or-loopback:17777",
  "body": {}
}
```

Compatibility rules:

- this is a transport envelope, not an app-level reinterpretation
- `body` must preserve the backend JSON payload as returned by the node
- non-2xx responses must still return the envelope with `ok: false`, numeric `status`, and raw `body`
- if the backend returns an empty body, expose `body: null`
- if the backend returns non-JSON text, expose `body: { "raw": "..." }`

### 5. `pronunco-local-bridge/probe`

Expected request shape:

```json
{
  "kind": "pronunco-local-bridge/probe",
  "baseUrl": "https://node-or-loopback:17777",
  "path": "/health",
  "timeoutMs": 4000
}
```

Expected response shape is the same transport envelope used by `request`.

## Endpoints PronunCo Already Uses

The compatibility shim must preserve clean access to these endpoints through the selected brain:

- `GET /health`
- `GET /capabilities`
- `POST /v1/lesson-extract`
- `POST /v1/translate`

PronunCo persistence flows also reuse the same relay path and selected-brain state. Existing persistence paths include:

- `GET /v1/persistence/apps/pronunco`
- `PATCH /v1/persistence/apps/pronunco/enable`
- `GET /v1/pronunco/profiles`
- `POST /v1/pronunco/profiles`
- additional `/v1/pronunco/profiles/...` subpaths

The shared extension does not need to understand those APIs semantically. It only needs to preserve transport correctness.

## Error Semantics PronunCo Expects

The compatibility path should preserve actionable failures, especially:

- `permission_denied` when the extension lacks host permission for the selected base URL
- timeout failures that mention the target URL when possible
- fetch failures with practical hints for:
  - self-signed HTTPS cert trust
  - unreliable `.local` hostname resolution

The current permission failure text is effectively:

`Extension does not have permission to reach <baseUrl>`

Keeping that wording or something very close to it will reduce support confusion during beta.

PronunCo benefits from human-readable text because these messages surface directly into staging UX and support debugging.

## Permission / Trust Rules

For PronunCo, the extension should remain the trust boundary.

That means:

- hosted PronunCo pages must not fetch the node directly when the browser would block it
- the extension should hold and check host permissions
- brains must not authorize new public web origins on their own
- selected-brain state should stay visible in the popup for debugging
- `get-config` should expose the concrete permission pattern for the selected node, for example `https://msi-raider-linux.local:17777/*`

## Tab / Origin Coverage

For beta, the shared extension should inject its PronunCo compatibility bridge into at least:

- `https://pronunco.com/*`
- `https://*.pronunco.com/*`
- local dev origins used by PronunCo as needed

This should be broad enough for staging and production validation, but still explicitly limited to known PronunCo origins.

## Practical Beta Recommendation

Do not force PronunCo to migrate to a new page-side SDK before the shared extension is proven.

The fastest safe path is:

1. shared extension ships with the PronunCo compatibility shim
2. PronunCo staging uses it immediately
3. beta users validate real lesson extraction and translation flows
4. only then does PronunCo migrate to the generic iHomeNerd bridge SDK

## Bottom Line

If the shared extension can emulate the PronunCo bridge contract above, PronunCo can serve as the real beta canary.

If it cannot, the migration plan becomes a coupled rewrite and the schedule expands immediately.
