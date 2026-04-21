# RFC: iHomeNerd Browser Extension

> One extension, all apps, zero CORS headaches.

**Date:** 2026-04-21
**Status:** Draft — requesting comments from all app teams
**Owner:** Alex
**Audience:** PronunCo, TelPro-Bro, iMedisys, iScamHunter, WhoWhe2Wha, Crypto-Fakes, Kitchen, Tax

---

## 1. Problem Statement

iHomeNerd runs on the local network. Web apps (PronunCo on pronunco.com, TelPro-Bro on telpro-bro.com, etc.) need to talk to it from the browser. This creates three recurring problems:

1. **CORS blocking** — Browsers block HTTPS pages from fetching HTTP local-network APIs. Even with HTTPS on iHomeNerd, the origin mismatch triggers CORS restrictions.
2. **Certificate trust** — Each user must manually install iHomeNerd's local CA certificate. The process differs by OS and browser. Firefox has its own certificate store.
3. **Discovery** — Users must manually enter their iHomeNerd's IP address. If the IP changes (DHCP), the connection breaks. Households with multiple brains have no way to find them.

**Currently:** PronunCo solves problem #1 with its own browser extension (`PronunCo Local Bridge`). Every other app will face the exact same problem and would need to build its own extension. This doesn't scale.

**Proposed:** One universal **iHomeNerd Bridge** extension that serves all apps.

---

## 2. What the Extension Does

### 2.1 CORS Bridge (v0.1 — launch)

The core function. Any web app can send requests to iHomeNerd through the extension, bypassing CORS restrictions entirely.

**Protocol:** `window.postMessage` between page content script and extension service worker.

```
Web app (pronunco.com)                    Extension                      iHomeNerd (LAN)
  │                                         │                                │
  │ postMessage({                           │                                │
  │   source: 'ihomenerd-bridge-page',      │                                │
  │   method: 'POST',                       │                                │
  │   path: '/v1/translate',                │                                │
  │   body: { text: '...', to: 'es' }      │                                │
  │ }) ──────────────────────────────────►   │                                │
  │                                         │  fetch('https://192.168.0.206  │
  │                                         │    :17777/v1/translate', ...)   │
  │                                         │ ─────────────────────────────►  │
  │                                         │                                │
  │                                         │  ◄───── { translation: '...' } │
  │                                         │                                │
  │  ◄──── postMessage({ response })        │                                │
  │                                         │                                │
```

**Backwards compatibility:** The extension also listens for PronunCo's existing `pronunco-local-bridge-page` message source, so PronunCo works immediately without any code changes. PronunCo can migrate to the `ihomenerd-bridge-page` source at its own pace and eventually retire its dedicated extension.

**Allowed origins:** The extension only relays requests to private-network IPs (192.168.x.x, 10.x.x.x, 172.16-31.x.x, 127.0.0.1, *.local hostnames). It will never proxy requests to public internet addresses.

### 2.2 Brain Discovery (v0.1 — launch)

The extension can do what web pages cannot — scan the local network for iHomeNerd instances.

**How it works:**
1. On install (and periodically), the extension probes port 17777 across the local subnet
2. Each iHomeNerd responds to `GET /discover` with its capabilities, hostname, and available models
3. Extension stores discovered brains in `chrome.storage.local`
4. Web apps query the extension: "give me brains" or "give me a brain that can do X"

**Multi-brain households:**
```
Brain 1: MSI Raider (RTX 4070)  →  LLM, TTS, ASR, Vision
Brain 2: Raspberry Pi            →  Rules engine, persistence only
Brain 3: Old laptop              →  Document search (large SSD)
```

Apps can pick the best brain per task. The extension maintains the registry.

### 2.3 Connection Status & Badge (v0.1 — launch)

- Green badge icon: at least one brain reachable
- Orange badge: brain found but Ollama not running (limited capabilities)
- Red/grey badge: no brains found
- Click extension popup: see connected brains, their capabilities, connection quality

### 2.4 Cross-Tab Coordination (v0.2)

Multiple tabs from different apps may compete for hardware resources (microphone, camera via iHomeNerd vision).

- Extension tracks which tab currently holds the microphone
- Broadcasts "resource released" events so other tabs can acquire
- Prevents two PronunCo tabs from recording simultaneously
- Apps opt in: `postMessage({ source: 'ihomenerd-bridge-page', type: 'resource-acquire', resource: 'microphone' })`

### 2.5 Push Events — Brain → Browser (v0.2)

Without an extension, apps must poll. With the extension:

- Extension maintains a WebSocket/SSE connection to each brain
- Brain pushes events: sync conflicts, drill reminders, deadline alerts, scan results
- Extension routes events to the relevant tab or shows a native notification
- Apps subscribe: `postMessage({ type: 'subscribe', events: ['sync-conflict', 'deadline-due'] })`

**Example event flow:**
```
iHomeNerd Brain ──WebSocket──► Extension ──postMessage──► PronunCo tab
                                    │
                                    └──► chrome.notifications.create(...)
                                         "PronunCo: 3 cards synced from another device"
```

### 2.6 Context Menu Integration (v0.3)

Right-click on any web page:

| Menu Item | Action | Target App |
|-----------|--------|------------|
| Translate with iHomeNerd | Send selected text to `/v1/translate` | Any / PronunCo |
| Create pronunciation drill | Selected text → PronunCo deck item | PronunCo |
| Check this for scams | Send URL/text to ScamHunter analysis | iScamHunter |
| Save to documents | Ingest selected content into docstore | iHomeNerd core |
| Ask my documents about this | Selected text as RAG query | iHomeNerd core |

### 2.7 Offline Queue (v0.3+)

When the brain is unreachable (user on train, brain powered off):

- Extension queues write operations (new deck items, practice results, tutor notes)
- Replays queue when brain becomes reachable again
- Conflict resolution follows existing sync protocol (revision-based)

---

## 3. Installation Flow

The extension is offered on the existing `/setup` trust page — users are already doing manual setup there.

```
/setup page (served by iHomeNerd over HTTP)
  │
  ├── Step 1: Install CA certificate (existing)
  │     └── OS-specific instructions (auto-detected)
  │
  ├── Step 2: Install iHomeNerd Bridge extension
  │     ├── Chrome/Edge: Web Store link (one click)
  │     ├── Firefox: AMO link (one click)
  │     └── Before store approval: self-hosted download
  │
  ├── Step 3: Extension auto-configures
  │     ├── Detects it was installed from /setup page
  │     ├── Stores this brain's address
  │     └── Badge turns green
  │
  └── Step 4: Test connection (existing, now also tests via extension)
```

**Before store approval** (Phase 1 / beta):
- Firefox: self-signed `.xpi` served from `/setup/extension/` — one-click install
- Chrome/Edge: zip download + "Load Unpacked" instructions

---

## 4. Security Model

| Concern | Mitigation |
|---------|------------|
| Extension relays to arbitrary hosts | Only private-network IPs allowed (RFC 1918 + link-local + .local mDNS) |
| Malicious web page sends postMessage | Extension validates message origin against a configurable allowlist (default: known app domains) |
| Extension stores brain addresses | `chrome.storage.local` only — never synced to cloud, never leaves device |
| Man-in-the-middle on LAN | Extension prefers HTTPS when brain has trusted cert; warns on HTTP-only |

### 4.1 Origin Allowlist

The extension maintains a list of web origins allowed to use the bridge:

```json
{
  "allowed_origins": [
    "https://pronunco.com",
    "https://www.pronunco.com",
    "https://staging.pronunco.com",
    "https://telpro-bro.com",
    "https://ihomenerd.com",
    "https://iscamhunter.com",
    "https://crypto-fakes.com",
    "http://localhost:*"
  ]
}
```

Brains can extend this list via `/discover` response — e.g., a custom plugin could register its web app's origin.

---

## 5. App Integration Guide (for app teams)

### Minimal integration (works today with PronunCo's existing pattern):

```typescript
// Check if extension is available
window.postMessage({
  source: 'ihomenerd-bridge-page',
  type: 'ping'
}, '*')

// Listen for response
window.addEventListener('message', (event) => {
  if (event.data?.source === 'ihomenerd-bridge-extension' && event.data?.type === 'pong') {
    // Extension is active, brains are available
    console.log('Brains:', event.data.brains)
  }
})
```

### Making a request:

```typescript
window.postMessage({
  source: 'ihomenerd-bridge-page',
  id: crypto.randomUUID(),
  type: 'request',
  // Target a specific brain, or omit for auto-selection
  brainUrl: 'https://192.168.0.206:17777',
  method: 'POST',
  path: '/v1/translate',
  body: { text: 'Hello world', to: 'es' }
}, '*')
```

### Getting discovered brains:

```typescript
window.postMessage({
  source: 'ihomenerd-bridge-page',
  id: crypto.randomUUID(),
  type: 'discover',
  // Optional: filter by capability
  requireCapability: 'transcribe_audio'
}, '*')
```

---

## 6. Questions for App Teams

Please comment on the sections relevant to your app. We want to know:

### 6.1 General (all teams)

- [ ] Does the CORS bridge protocol (Section 2.1) cover your needs? Any additional headers, auth tokens, or streaming requirements?
- [ ] Would auto-discovery (Section 2.2) change how your app finds/configures the local companion?
- [ ] What origins should be in the default allowlist (Section 4.1)?
- [ ] Do you need streaming responses (SSE/chunked) through the bridge, or is request-response sufficient?

### 6.2 PronunCo

- [ ] PronunCo currently uses `pronunco-local-bridge-page` / `pronunco-local-bridge-extension` message sources. The extension will support both during transition. What timeline works for migrating to `ihomenerd-bridge-page`?
- [ ] Audio recording coordination (Section 2.4) — is the proposed resource-acquire/release protocol sufficient for your mic management?
- [ ] Would push events (Section 2.5) be useful for sync notifications? ("3 cards synced from your phone")
- [ ] Any PronunCo-specific context menu items beyond "Create pronunciation drill"?

### 6.3 TelPro-Bro

- [ ] TelPro-Bro does charisma coaching — would you want the extension to capture audio/video tab permissions on your behalf?
- [ ] Context menu: "Analyze this email for communication style" — useful?
- [ ] Push events for coaching reminders? ("You have a meeting in 30 min — review your prep notes")

### 6.4 iScamHunter / Crypto-Fakes

- [ ] Context menu "Check this for scams" (URL + selected text) — what data do you need from the page?
- [ ] Would you want the extension to passively monitor visited URLs and flag known scam domains? (privacy implications — needs explicit opt-in)
- [ ] Push events when a watched wallet/domain has new activity?

### 6.5 iMedisys

- [ ] Medical data is sensitive — any additional security requirements for the bridge?
- [ ] Would offline queue (Section 2.7) matter for clinic scenarios where the brain is on a local server?
- [ ] Context menu: "Look up ICD-10 code" from selected medical text?

### 6.6 WhoWhe2Wha

- [ ] Push events for deadline alerts are routed to WhoWhe2Wha — does the notification format in Section 2.5 work?
- [ ] Would you want the extension to intercept calendar links on web pages and offer "Add to WhoWhe2Wha timeline"?

### 6.7 Kitchen / Tax

- [ ] Photo capture from browser → iHomeNerd vision — would you want the extension to provide a "Snap receipt" or "Snap dish" camera shortcut?
- [ ] Tax: any concerns about financial document data flowing through the extension's postMessage channel?

---

## 7. Technical Scope

| Component | Description |
|-----------|-------------|
| `manifest.json` | Manifest V3, `host_permissions: ["*://192.168.*/*", "*://10.*/*", "*://172.16-31.*/*", "*://*.local/*"]` |
| `service-worker.js` | Background script: handles fetch relay, brain discovery, WebSocket connections, notifications |
| `content-script.js` | Injected into allowed origins: listens for `postMessage`, relays to service worker via `chrome.runtime.sendMessage` |
| `popup.html/js` | Extension popup: brain status, settings, manual brain address entry |
| Size | Estimated < 50KB total (no frameworks, vanilla JS) |

### Browser support
| Browser | Install method | Notes |
|---------|---------------|-------|
| Chrome | Web Store | Primary target |
| Edge | Web Store (same listing) | Manifest V3 compatible |
| Firefox | AMO (Add-ons) | Needs `browser_specific_settings.gecko.id` in manifest |
| Safari | Not planned for v1 | Would require separate Xcode project |

---

## 8. Versioning Plan

| Version | Features | Target |
|---------|----------|--------|
| **v0.1** | CORS bridge + backwards-compat with PronunCo extension + brain discovery + connection badge | Store submission |
| **v0.2** | Cross-tab resource coordination + push events + notification support | After v0.1 approved |
| **v0.3** | Context menu integration + offline queue | After app team feedback |
| **v1.0** | Passive URL monitoring (opt-in) + camera shortcuts + polished UX | Public launch |

---

## 9. How to Comment

Add your comments below, organized by section number. Include your app name.

### Comments

_(awaiting team feedback)_

---

*This RFC will be finalized after one round of feedback from all app teams. Target: extension v0.1 submitted to stores by end of April 2026.*
