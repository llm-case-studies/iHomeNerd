# iHomeNerd Dashboard: Frontend ↔ Backend API Contract

**Date:** 2026-04-13
**Status:** Build spec for Google AI Studio (GAIS) / Codex
**Companion:** `WHITEPAPER_ROADMAP_2026-04-13.md` (capability domains & roadmap)

---

## 1. Overview

The iHomeNerd dashboard is a single-page web app served by the existing FastAPI backend. The frontend calls REST endpoints defined in this contract. Both sides must agree on URL paths, request/response shapes, error conventions, and streaming behavior.

**Stack:** Plain HTML + CSS + vanilla JS (or htmx + Alpine.js). No build step. Files live in `backend/app/static/` and `backend/app/templates/`.

**Base URL:** `http://localhost:17777` (or LAN hostname)

---

## 2. Conventions

### 2.1 URL structure

```
GET  /health                    — system health
GET  /capabilities              — capability registry
GET  /sessions                  — active sessions

/v1/chat                        — Chat domain
/v1/translate                   — Translate domain
/v1/transcribe-audio            — Talk domain (ASR)
/v1/synthesize-speech           — Talk domain (TTS)
/v1/voices                      — Talk domain (voice list)
/v1/dialogue-session            — Agents domain (create)
/v1/dialogue-turn               — Agents domain (advance)
/v1/docs/*                      — Docs domain (Phase 2)
/v1/investigate/*               — Investigate domain (Phase 3)
/v1/agents/*                    — Agents domain (Phase 4)
```

### 2.2 Request format

- All POST bodies are JSON (`Content-Type: application/json`) unless the endpoint accepts file uploads (multipart/form-data).
- All request fields use **camelCase** (matching the JavaScript convention the UI uses).

### 2.3 Response format

- All responses are JSON with `Content-Type: application/json`, except binary responses (audio WAV from `/v1/synthesize-speech`).
- All response fields use **camelCase**.
- Successful responses return HTTP 200 with the result object directly (no wrapper).

### 2.4 Error format

All errors return a JSON body with this shape:

```json
{
  "detail": "Human-readable error message",
  "code": "OPTIONAL_ERROR_CODE"
}
```

Standard HTTP status codes:

| Code | Meaning |
|---|---|
| 400 | Bad request (validation error, missing field) |
| 404 | Resource not found (session expired, collection missing) |
| 410 | Gone (session closed) |
| 501 | Not implemented (capability stub) |
| 502 | Bad gateway (model returned invalid output) |
| 503 | Service unavailable (model not loaded, engine not ready) |

### 2.5 Streaming (Phase 1+)

Chat and agent responses may optionally stream via **Server-Sent Events (SSE)**. When the frontend sends `Accept: text/event-stream`, the backend streams token-by-token:

```
data: {"token": "Hello"}
data: {"token": " world"}
data: {"done": true, "fullText": "Hello world"}
```

If the frontend sends `Accept: application/json`, the backend returns the complete response as a single JSON object (blocking until generation finishes). **Phase 1 starts with blocking JSON; SSE added as enhancement.**

---

## 3. Endpoint Contracts

### 3.1 System

#### `GET /health`

Returns overall system status. Used by the header status pill and by external apps for discovery.

**Response:**
```json
{
  "ok": true,
  "status": "ok",
  "product": "iHomeNerd",
  "version": "0.1.0",
  "hostname": "msi-raider-linux",
  "ollama": true,
  "tts": true,
  "asr": true,
  "providers": ["gemma_local"],
  "models": {
    "chat": "gemma4:e2b",
    "translate_text": "gemma4:e2b",
    "transcribe_audio": "whisper-small-int8",
    "synthesize_speech": "kokoro-82m-onnx"
  },
  "binding": "0.0.0.0",
  "port": 17777,
  "uptime": 3600
}
```

**UI usage:** Header status pill color (green/amber/red). System panel cards.

---

#### `GET /capabilities`

Flat boolean capability map (matching PronunCo's `LocalCompanionCapabilities` interface) plus full detail.

**Response:**
```json
{
  "chat": true,
  "translate_text": true,
  "transcribe_audio": true,
  "synthesize_speech": true,
  "investigate_network": false,
  "dialogue_agent": true,
  "query_documents": false,
  "_detail": {
    "product": "iHomeNerd",
    "version": "0.1.0",
    "capabilities": {
      "chat": { "available": true, "model": "gemma4:e2b", "tier": "medium", "core": true },
      "translate_text": { "available": true, "model": "gemma4:e2b", "tier": "light", "core": true },
      "transcribe_audio": { "available": true, "model": "whisper-small-int8", "tier": "transcription" },
      "synthesize_speech": { "available": true, "model": "kokoro-82m-onnx", "tier": "tts", "voices": 54 },
      "investigate_network": { "available": false, "tier": "system", "core": true },
      "query_documents": { "available": false, "tier": "medium", "core": true }
    }
  }
}
```

**UI usage:** System panel capabilities table. Feature gating per panel.

---

#### `GET /sessions`

List active sessions (dialogue, agent, investigation).

**Query params:** `?app=pronunco` (optional filter)

**Response:**
```json
{
  "sessions": [
    {
      "id": "abc123",
      "app": "pronunco",
      "purpose": "dialogue",
      "turnCount": 5,
      "createdAt": "2026-04-13T10:30:00Z",
      "expiresAt": "2026-04-13T11:30:00Z",
      "closed": false
    }
  ]
}
```

**UI usage:** System panel active sessions list.

---

### 3.2 Chat

#### `POST /v1/chat`

General-purpose chat. Frontend maintains conversation history and sends full message array each turn.

**Request:**
```json
{
  "messages": [
    { "role": "user", "content": "What is the capital of France?" }
  ],
  "model": null
}
```

- `messages`: Array of `{ role: "user" | "assistant", content: string }`. Full history.
- `model`: Optional model override. Null = use default for `chat` capability.

**Response:**
```json
{
  "role": "assistant",
  "content": "The capital of France is Paris.",
  "model": "gemma4:e2b"
}
```

**UI usage:** Chat panel. Send full history, append response, scroll to bottom.

---

### 3.3 Translate

#### `POST /v1/translate`

Text translation.

**Request:**
```json
{
  "text": "Hello, how are you?",
  "source": "auto",
  "target": "es"
}
```

- `source`: BCP-47 code or `"auto"` for auto-detection.
- `target`: BCP-47 code (required).

**Response:**
```json
{
  "translatedText": "Hola, ¿cómo estás?",
  "detectedSource": "en",
  "target": "es",
  "model": "gemma4:e2b"
}
```

**UI usage:** Translate panel. Two-pane layout: source textarea → target readonly textarea.

**Supported languages (Phase 1):** `en`, `zh`, `ja`, `ko`, `es`, `fr`, `de`, `it`, `pt`, `ru`, `tr`, `uk`, `hi`, `ar`

---

### 3.4 Talk (Voice Pipeline)

#### `POST /v1/transcribe-audio`

Speech-to-text. Accepts audio file upload.

**Request:** `multipart/form-data`
- `file`: Audio file (WAV, MP3, OGG, WebM — any format ffmpeg/PyAV supports)
- `language`: Optional BCP-47 code (e.g., `en-US`). Omit for auto-detect.
- `task`: `"transcribe"` (default) or `"translate"` (translate to English)

**Response:**
```json
{
  "text": "Hello, how are you today?",
  "language": "en",
  "languageProbability": 0.98,
  "duration": 3.45,
  "segments": [
    { "start": 0.0, "end": 1.2, "text": "Hello," },
    { "start": 1.3, "end": 3.45, "text": "how are you today?" }
  ],
  "processingTime": 1.23,
  "model": "small"
}
```

**UI usage:** Talk panel. MediaRecorder blob → POST → display transcript.

---

#### `POST /v1/synthesize-speech`

Text-to-speech. Returns binary WAV audio.

**Request:**
```json
{
  "text": "Hello, how are you?",
  "targetLang": "en-US",
  "voice": "af_heart",
  "speed": 1.0
}
```

- `voice`: Kokoro voice name. Null = auto-select by language.
- `speed`: Playback speed multiplier (0.5–2.0).

**Response:** Binary `audio/wav` with headers:
- `X-Voice`: voice name used
- `X-Lang`: language code used
- `X-Sample-Rate`: sample rate (e.g., `24000`)

**UI usage:** Talk panel. Fetch → create Blob → `<audio>` element or AudioContext.

---

#### `GET /v1/voices`

List available TTS voices.

**Response:**
```json
{
  "available": true,
  "voices": ["af_heart", "af_nova", "am_adam", "bf_emma", "zf_xiaobei", "..."]
}
```

**UI usage:** Talk panel voice selector dropdown. Group by language prefix.

---

### 3.5 Docs (Phase 2)

These endpoints are NOT yet built. The UI should show a "coming soon" state for the Docs panel, but the contract is defined here so both sides are ready.

#### `GET /v1/docs/collections`

**Response:**
```json
{
  "collections": [
    {
      "id": "taxes",
      "name": "Taxes",
      "path": "~/Documents/taxes/",
      "documentCount": 23,
      "chunkCount": 456,
      "lastIngested": "2026-04-10T14:30:00Z",
      "watching": true
    }
  ]
}
```

---

#### `POST /v1/docs/ask`

**Request:**
```json
{
  "question": "How much did I spend on dental in 2025?",
  "collections": ["taxes", "medical"],
  "maxSources": 5
}
```

**Response:**
```json
{
  "answer": "Based on your records, you spent $2,340 on dental care in 2025...",
  "sources": [
    {
      "collection": "medical",
      "document": "dental_receipt_2025-03.pdf",
      "page": 1,
      "excerpt": "Patient: Alex. Total: $890.00. Date: 2025-03-15.",
      "relevance": 0.94
    }
  ],
  "model": "gemma4:e2b"
}
```

---

#### `POST /v1/docs/ingest`

**Request:**
```json
{
  "path": "~/Documents/taxes/",
  "collectionId": "taxes",
  "watch": true,
  "ocr": false
}
```

**Response:**
```json
{
  "collectionId": "taxes",
  "filesFound": 23,
  "filesIngested": 23,
  "chunksCreated": 456,
  "status": "complete"
}
```

---

### 3.6 Investigate (Phase 3)

Not yet built. Contract defined for future implementation.

#### `POST /v1/investigate/network`

Trigger a LAN scan.

**Request:**
```json
{
  "subnet": "auto",
  "deep": false
}
```

- `subnet`: CIDR notation or `"auto"` to detect from default interface.
- `deep`: If true, probe open ports, firmware versions, storage. If false, quick ARP/mDNS only.

**Response:**
```json
{
  "scanId": "scan_20260413_1430",
  "devices": [
    {
      "ip": "192.168.1.42",
      "mac": "AA:BB:CC:DD:EE:FF",
      "hostname": "msi-raider-linux.local",
      "vendor": "Intel Corporate",
      "os": "Linux 5.15",
      "services": ["ssh:22", "http:17777"],
      "alerts": []
    },
    {
      "ip": "192.168.1.1",
      "mac": "11:22:33:44:55:66",
      "hostname": "router.local",
      "vendor": "TP-Link",
      "os": null,
      "services": ["http:80", "https:443"],
      "alerts": ["Default admin credentials detected", "Firmware update available: v2.1.3 → v2.2.0"]
    }
  ],
  "summary": "12 devices found. 1 device has default credentials. 2 devices need firmware updates.",
  "scannedAt": "2026-04-13T14:30:00Z"
}
```

---

#### `POST /v1/investigate/site`

Probe a URL for security indicators.

**Request:**
```json
{
  "url": "https://suspicious-bank-login.com",
  "checks": ["ssl", "whois", "headers", "dns"]
}
```

**Response:**
```json
{
  "url": "https://suspicious-bank-login.com",
  "ssl": {
    "valid": true,
    "issuer": "Let's Encrypt",
    "issuedAt": "2026-04-01T00:00:00Z",
    "expiresAt": "2026-06-30T00:00:00Z",
    "daysOld": 12,
    "alerts": ["Certificate only 12 days old", "Free CA — not EV validated"]
  },
  "whois": {
    "registrar": "Namecheap",
    "createdAt": "2026-03-25",
    "domainAgeDays": 19,
    "registrant": "REDACTED FOR PRIVACY",
    "alerts": ["Domain registered 19 days ago"]
  },
  "headers": {
    "csp": null,
    "hsts": null,
    "xFrameOptions": null,
    "alerts": ["No Content-Security-Policy", "No HSTS", "No X-Frame-Options"]
  },
  "dns": {
    "a": ["104.21.45.67"],
    "mx": [],
    "spf": null,
    "dmarc": null,
    "alerts": ["No MX records", "No SPF record", "No DMARC record"]
  },
  "riskScore": 0.87,
  "summary": "High risk. Domain is 19 days old, using free SSL, missing all security headers, no email infrastructure. Inconsistent with a legitimate bank.",
  "probedAt": "2026-04-13T14:35:00Z"
}
```

---

#### `GET /v1/investigate/history`

Retrieve past investigation results.

**Query params:** `?type=network|site&limit=20&offset=0`

**Response:**
```json
{
  "investigations": [
    {
      "id": "scan_20260413_1430",
      "type": "network",
      "summary": "12 devices found. 1 alert.",
      "alertCount": 1,
      "completedAt": "2026-04-13T14:30:00Z"
    }
  ],
  "total": 15
}
```

---

### 3.7 Agents (Phase 4)

Not yet built. Extends the existing dialogue-session/dialogue-turn pattern.

#### `POST /v1/agents/start`

Create an autonomous agent session.

**Request:**
```json
{
  "type": "scam_bot_engager",
  "goal": "Document the bot's sales script and extract any contact information it offers",
  "targetUrl": "https://suspicious-bank-login.com/chat",
  "persona": {
    "name": "Margaret",
    "age": 68,
    "context": "Retired teacher, not tech-savvy"
  },
  "turnBudget": 30,
  "autoRun": true
}
```

- `type`: Agent type (`scam_bot_engager`, `phone_screener`, `practice_partner`, `device_manager`, `research_agent`)
- `goal`: Natural-language objective for the agent
- `autoRun`: If true, agent runs autonomously. If false, user approves each turn.
- `turnBudget`: Max turns before auto-stop.

**Response:**
```json
{
  "sessionId": "agent_abc123",
  "type": "scam_bot_engager",
  "status": "running",
  "persona": "Margaret, 68, retired teacher",
  "turnBudget": 30,
  "createdAt": "2026-04-13T15:00:00Z"
}
```

---

#### `GET /v1/agents/{sessionId}`

Get agent session status and transcript.

**Response:**
```json
{
  "sessionId": "agent_abc123",
  "type": "scam_bot_engager",
  "status": "running",
  "turnsUsed": 12,
  "turnBudget": 30,
  "transcript": [
    { "role": "agent", "content": "Hello, I saw your advertisement about investment opportunities...", "timestamp": "2026-04-13T15:00:05Z" },
    { "role": "external", "content": "Welcome! Yes, we offer guaranteed 50% returns...", "timestamp": "2026-04-13T15:00:08Z" }
  ],
  "findings": [
    "Bot claims 50% guaranteed returns (red flag)",
    "Requests wire transfer to offshore account",
    "Provides WhatsApp number: +1-555-XXX-XXXX"
  ],
  "createdAt": "2026-04-13T15:00:00Z"
}
```

---

#### `POST /v1/agents/{sessionId}/stop`

Stop a running agent.

**Response:**
```json
{
  "sessionId": "agent_abc123",
  "status": "stopped",
  "turnsUsed": 12,
  "summary": "Documented sales script. Extracted WhatsApp contact. Bot claims guaranteed returns and requests wire transfer.",
  "stoppedAt": "2026-04-13T15:05:00Z"
}
```

---

## 4. Dashboard Layout

```
┌──────────────────────────────────────────────────────────┐
│  🏠 iHomeNerd                    [status pill]   [⚙ gear] │
├────────┬────────┬──────┬──────┬─────────────┬────────────┤
│  Chat  │  Talk  │ Docs │Trans │ Investigate │  Agents  │ System │
├────────┴────────┴──────┴──────┴─────────────┴────────────┤
│                                                            │
│                   Active panel content                     │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### Panel → endpoint mapping

| Panel | Primary endpoints | Phase |
|---|---|---|
| **Chat** | `POST /v1/chat` | 1 |
| **Talk** | `POST /v1/transcribe-audio`, `POST /v1/synthesize-speech`, `GET /v1/voices` | 1 |
| **Translate** | `POST /v1/translate` | 1 |
| **Docs** | `GET /v1/docs/collections`, `POST /v1/docs/ask`, `POST /v1/docs/ingest` | 2 |
| **Investigate** | `POST /v1/investigate/network`, `POST /v1/investigate/site`, `GET /v1/investigate/history` | 3 |
| **Agents** | `POST /v1/agents/start`, `GET /v1/agents/{id}`, `POST /v1/agents/{id}/stop` | 4 |
| **System** | `GET /health`, `GET /capabilities`, `GET /sessions` | 1 |

### Panel availability gating

The UI should check `/capabilities` on load and visually indicate which panels are fully functional vs "coming soon":

```javascript
// On page load
const caps = await fetch('/capabilities').then(r => r.json());

// Phase 1: always available if Ollama is up
panelEnabled.chat = caps.chat;
panelEnabled.translate = caps.translate_text;
panelEnabled.talk = caps.transcribe_audio || caps.synthesize_speech;
panelEnabled.system = true; // always

// Phase 2+: show "coming soon" badge if not available
panelEnabled.docs = caps.query_documents;
panelEnabled.investigate = caps.investigate_network || caps.investigate_site;
panelEnabled.agents = caps.dialogue_agent || caps.phone_screener;
```

---

## 5. Design Tokens (Dark Theme)

```css
:root {
  --bg-primary: #0f1117;
  --bg-surface: #1a1d27;
  --bg-input: #252830;
  --border: #2e3140;
  --text-primary: #e4e6eb;
  --text-secondary: #8b8fa3;
  --accent: #4f8cff;
  --accent-hover: #6ba0ff;
  --success: #34d399;
  --warning: #fbbf24;
  --error: #f87171;
  --user-bubble: #1e3a5f;
  --agent-bubble: #1a2332;

  --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-mono: "JetBrains Mono", "Fira Code", Consolas, monospace;
  --font-size-base: 15px;
  --font-size-chat: 14px;
  --font-size-tab: 13px;
  --radius-card: 8px;
  --radius-button: 6px;
  --radius-input: 6px;
}
```

---

## 6. File Structure

```
backend/app/
  static/
    style.css              — all styles (design tokens above)
    app.js                 — panel switching, API calls, audio handling
    icons/                 — small SVG icons (mic, speaker, send, copy, gear, search, shield)
  templates/
    index.html             — single page, all panels
```

No npm. No build step. No framework. Edit → refresh → done.

---

## 7. Implementation Notes for GAIS

1. **Start with System + Chat + Translate** — these three panels prove the Nerd is alive and useful. All backends exist.
2. **Talk panel next** — mic + audio playback + transcript. All backends exist (ASR, TTS, voices).
3. **Docs panel** — "coming soon" card initially. Wire up when backend endpoints land.
4. **Investigate panel** — "coming soon" card. Wire up in Phase 3.
5. **Agents panel** — "coming soon" card. The dialogue-session/dialogue-turn endpoints already work for practice partners. Full agent framework in Phase 4.
6. **The `GET /` route** in `main.py` already renders `index.html`. Static files already served at `/static/*`.
7. **Test by opening `http://localhost:17777/`** in a browser.
