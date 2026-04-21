# iHomeNerd Bridge Extension — Handoff for Continuation

**Date:** 2026-04-21
**Status:** v0.1 built, tested end-to-end, not yet on web stores
**For:** AG (Antigravity) / Codex teams picking up while Claude Code is at rate limit
**Back online:** Thursday 2026-04-23

---

## What Was Done (2026-04-21)

### 1. Browser Extension Built and Working
- **Location:** `browser-extension/ihomenerd-bridge/` (8 files)
- Manifest V3 for Chrome, Edge, Firefox
- Generic bridge protocol (`ihomenerd-bridge/*`) + PronunCo legacy shim (`pronunco-local-bridge/*`)
- LAN auto-discovery via subnet scanning
- Popup with Scan LAN, brain selection, Test Connection, diagnostics
- Tested end-to-end: Dell → MSI brain → iMac (all worked)

### 2. Dual HTTP/HTTPS Server
- HTTPS on port 17777 (full API, requires trusted CA cert)
- HTTP on port 17778 (setup-only routes, no TLS — solves chicken-and-egg)
- `/setup` page serves both cert install AND extension install instructions
- `/setup/extension` serves the extension as a downloadable zip
- Browser-specific install instructions (Chrome/Edge vs Firefox)

### 3. Persistence API Fixes (from earlier in session)
- SQLite connection leak fixed with `_db()` context manager
- All 6 Codex API contract findings addressed
- 70/70 automated tests pass on MSI

### 4. Local CA Trust System
- `certs.py`: generates local CA (10yr) + server certs (signed by CA, regenerated on IP change)
- `setup.html`: auto-detects OS/browser, shows relevant cert install instructions
- Firefox extra step documented (enterprise_roots.enabled or manual import)
- Apple `.mobileconfig` profile generated on-the-fly for iOS/macOS

---

## What Needs Doing Next (Priority Order)

### P0: Web Store Submission
**Goal:** Get the extension on Chrome Web Store + Firefox AMO so users don't need Developer Mode.

**Checklist** (see also `docs/IHOMENERD_SHARED_EXTENSION_STORE_CHECKLIST_2026-04-21.md` in PronunCo repo):

1. **Chrome Web Store ($5 one-time fee)**
   - Register developer account at https://chrome.google.com/webstore/devconsole
   - Prepare assets:
     - 1 screenshot of popup (healthy connected state)
     - 1 screenshot showing error/permission state
     - 128x128 icon (current placeholder needs upgrading to a real icon)
     - Short description (≤132 chars): "Connect web apps to your local iHomeNerd AI brain on your home network."
     - Detailed description emphasizing: local-only, no cloud, user-controlled
   - Privacy policy page (can be a simple page on ihomenerd.com)
   - Submit zip of `browser-extension/ihomenerd-bridge/`
   - Justification for `optional_host_permissions`: "User explicitly enters their local brain's address and grants permission to that specific origin"

2. **Firefox AMO (free)**
   - Same assets
   - Uses `browser_specific_settings.gecko.id: "bridge@ihomenerd.com"` (already in manifest)
   - Can also self-sign with `web-ext sign` for immediate sideloading from /setup page

3. **Edge Add-ons (free)**
   - Same Chrome extension works, separate store listing

### P1: PronunCo Integration Verification
**Goal:** Verify PronunCo staging works through the shared extension with zero frontend changes.

**Test checklist:**
1. Install shared extension on a browser that does NOT have the old PronunCo Local Bridge
2. Open `https://staging.pronunco.com`
3. Verify: Lesson Companion detects the brain
4. Verify: `Check local companion` works
5. Verify: Local lesson extraction works
6. Verify: Local translation works
7. Verify: Persistence probing works

**If anything fails:** The PronunCo compatibility appendix has exact message shapes:
`PronunCo/docs/development/IHOMENERD_SHARED_EXTENSION_PRONUNCO_COMPAT_APPENDIX_2026-04-21.md`

The existing PronunCo extension code (to compare against):
`PronunCo/browser-extension/pronunco-local-bridge/` (background.js, content-script.js, popup.js)

### P2: Extension Icon
**Goal:** Replace placeholder "iHN" text icons with a real brand icon.

Current icons are ImageMagick-generated blue squares with white text. Need:
- 16x16, 48x48, 128x128 PNG
- Should match iHomeNerd branding
- Simple, recognizable at 16px (brain/network motif)

### P3: Discovery Refinements
**Goal:** Make subnet scanning faster and smarter.

Current approach scans IPs 1-254 in batches of 30 with 2.5s timeout per probe. Possible improvements:
- Probe common router-assigned ranges first (.1, .100-.110, .200-.210)
- Cache last-known brain IPs and probe those first
- Use mDNS/DNS-SD if available (brain already advertises `_ihomenerd._tcp` via avahi)
- Show progress during scan (current: just spinner)

### P4: CORS Fix on iHomeNerd Backend
**Goal:** Allow direct fetch (without extension) from known app origins.

Current CORS regex in `main.py` line 64:
```python
allow_origin_regex=r"https?://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|.*\.local)(:\d+)?",
```

This only allows LAN origins. Should also allow:
```python
allow_origin_regex=r"https?://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|.*\.local|.*\.pronunco\.com|.*\.telpro-bro\.com|.*\.ihomenerd\.com|.*\.iscamhunter\.com|.*\.crypto-fakes\.com)(:\d+)?",
```

This lets apps with trusted certs work without the extension on same-network setups.

### P5: Streaming Responses (from Opus review)
**Goal:** Support token streaming through the bridge for LLM responses.

Current bridge is request→response only. Multiple apps need streaming for "typing indicator" UX.

Approach: series of `postMessage` frames with a shared `requestId` and a `done: true` flag on the last frame. Service worker uses `ReadableStream` from `fetch()` and relays chunks.

### P6: /discover Schema Standardization
**Goal:** Formal JSON schema for the discover endpoint response.

Current response from `discovery.py` is ad-hoc. Needs:
- `capabilities[]` — list of capability names (`["llm", "tts", "asr", "vision", "rules", "docstore"]`)
- `plugins[]` — registered plugins (`["pronunco", "scamhunter"]`)
- `endpoints[]` — available API routes
- Version this schema for forward compatibility

---

## Key Files Reference

### iHomeNerd repo (`github.com/llm-case-studies/iHomeNerd`, main branch)

| File | Purpose |
|------|---------|
| `browser-extension/ihomenerd-bridge/*` | The extension (8 files) |
| `backend/app/main.py` | FastAPI app + dual HTTP/HTTPS servers |
| `backend/app/certs.py` | Local CA + server cert generation |
| `backend/app/discovery.py` | Brain discovery endpoint + mDNS |
| `backend/app/templates/setup.html` | Trust + extension setup page |
| `backend/app/persistence.py` | App persistence service (SQLite) |
| `backend/app/plugins/pronunco_persistence.py` | PronunCo persistence plugin |
| `docs/RFC_BROWSER_EXTENSION_2026-04-21.md` | Full RFC |
| `docs/RFC_BROWSER_EXTENSION_Comments_*.md` | Review feedback (3 files) |

### PronunCo repo (`github.com/AEasterbrook/PronunCo`, staging branch)

| File | Purpose |
|------|---------|
| `browser-extension/pronunco-local-bridge/*` | Old per-app extension (to be retired) |
| `ui/src/features/local-companion/extension-bridge.ts` | Page-side bridge protocol |
| `ui/src/features/local-companion/client.ts` | Local companion client |
| `docs/development/IHOMENERD_SHARED_EXTENSION_*.md` | 5 detailed spec/checklist files |
| `docs/development/IHOMENERD_PERSISTENCE_CLIENT_GUIDE_2026-04-19.md` | Persistence API guide |

---

## MSI Server State

- **Running:** iHomeNerd on MSI (`192.168.0.206`)
  - HTTPS: port 17777
  - HTTP setup: port 17778
- **Start command:** `cd ~/Projects/iHomeNerd/backend && source .venv/bin/activate && IHN_LAN_MODE=1 python -m app.main`
- **Certs:** `~/.ihomenerd/certs/` (ca.crt, ca.key, server.crt, server.key)
- **Data:** `~/.ihomenerd/` (appstore.sqlite, certs/)
- **Ollama:** running, 11 models loaded (gemma4, whisper, kokoro)

---

## Design Decisions to Respect

These came from the PronunCo review and are firm:

1. **Origin allowlist stays extension-owned** — brains must NOT self-authorize public origins
2. **Pinned brain is primary** — discovery assists setup, doesn't replace explicit selection
3. **Extension is transport + trust + diagnostics** — apps own their own logic
4. **PronunCo legacy shim is required** — full protocol compat, not just source string aliasing
5. **Narrow and boring for store submission** — minimize permissions, avoid ambitious features in v0.1

---

*Last updated: 2026-04-21 by Claude Code (Opus). Rate limit resets Thursday 2026-04-23.*
