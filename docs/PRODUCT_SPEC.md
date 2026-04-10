# iHomeNerd Product Spec

**Status:** draft
**Date:** 2026-04-10
**Owner:** Alex

---

## 1. What iHomeNerd is

A **local AI brain** that runs on your home or office network. It translates, transcribes, searches your documents, watches your cameras, and chats — all privately, on your own hardware, with no cloud dependency.

It is a **standalone product**, not a dependency of other apps. Apps like PronunCo and TelPro-Bro can optionally integrate with it, but iHomeNerd is useful on its own from day one.

### One-liner

> Search your tax returns, get smart camera alerts, translate anything — all locally, all private, all yours.

### What it replaces

| Before iHomeNerd | After iHomeNerd |
|---|---|
| Upload tax docs to ChatGPT | Ask your docs locally |
| "Motion detected" from Ring | "FedEx left a package at 2:30 PM" |
| Google Translate (cloud) | Translate locally, no tracking |
| Pay for transcription services | Whisper on your own machine |
| Install separate AI helpers per app | One brain, many skills |

## 2. Product family

| Product | Domain | Deployment | Target |
|---|---|---|---|
| **iHomeNerd** | ihomenerd.com | Always-on home server | Families, home labs, privacy-conscious consumers |
| **iOfficeNerd** | iofficenerd.com | Office server or per-desk | Small teams, SOHO, compliance-sensitive businesses |
| **RoadNerd** | (sub-brand) | USB bootable, portable | IT support, travelers, emergency diagnostics |

iHomeNerd and iOfficeNerd share the same codebase with different defaults, onboarding, and landing pages. RoadNerd is a separate deployment model (USB-resident, no network) and stays its own project.

## 3. Architecture

### 3.1 Core layers

```
┌─────────────────────────────────────────┐
│          Web Dashboard / CLI            │  ← standalone UI
├─────────────────────────────────────────┤
│          REST API                       │  ← apps + scripts connect here
├─────────────────────────────────────────┤
│     Capability Registry + Router        │  ← task → model routing
├─────────────────────────────────────────┤
│     Model Backend (Ollama / vLLM)       │  ← actual inference
│     Whisper · YOLO · Embedding index    │
├─────────────────────────────────────────┤
│     Storage (vector DB, recordings,     │
│     camera events, document index)      │
└─────────────────────────────────────────┘
```

### 3.2 Capability registry

The Nerd thinks in **capabilities**, not vendor names. Each capability maps to a model tier and an endpoint.

Initial capability set:

**Document domain:**
- `query_documents` — RAG over local document collections
- `ingest_folder` — watch folders, extract, embed
- `summarize_document` — single-doc summary

**Language domain:**
- `translate_text` — local translation (TranslateGemma)
- `transcribe_audio` — audio/video to text (Whisper)
- `chat` — general-purpose local chat (Gemma 4)

**Vision domain:**
- `analyze_video_frame` — caption/describe a frame (Gemma 4 multimodal)
- `detect_objects` — person/car/package/animal detection (YOLO)
- `summarize_camera_day` — daily digest from accumulated events

**App-integration domain (loaded as plugins):**
- `extract_lesson_items` — PronunCo lesson extraction
- `generate_drill` — PronunCo drill generation
- `explain_score` — PronunCo/TelPro-Bro score explanation
- `chat_persona` — PronunCo roleplay / TelPro-Bro script persona
- `analyze_delivery` — TelPro-Bro RFC-005 delivery rubric
- `store_recording` — TelPro-Bro multi-device recording sync

### 3.3 Model tiering

Different tasks need different models. The Nerd auto-selects.

| Tier | Model | VRAM | Tasks |
|---|---|---|---|
| **Tiny** | Embedding model (nomic-embed-text) | ~200 MB | Document indexing, semantic search |
| **Light** | Gemma 4 4B / TranslateGemma 4B | ~3 GB | Translation, drill gen, simple extraction, simple Q&A |
| **Medium** | Gemma 4 12B | ~8 GB | Score explanation, chat persona, document RAG generation, lesson extraction |
| **Heavy** | Gemma 4 27B / E4B multimodal | ~16 GB | Delivery rubric, grounded-vs-performed, complex multi-doc synthesis, camera captioning |
| **Detection** | YOLOv8-Nano | ~200 MB | Object detection on camera frames |
| **Transcription** | Whisper (medium/large) | ~2-5 GB | Audio/video transcription |

On an 8GB GPU (RTX 4070): light + medium loaded, heavy swapped on demand.
On a 24GB+ GPU or Apple Silicon with 32GB+ unified: all tiers resident.
On an OrangePi 5 Plus (NPU): detection + light only.

### 3.4 Model backend

iHomeNerd does NOT reimplement model serving. It uses:

- **Ollama** (recommended default) — model management, quantization, multi-model, mature
- **vLLM** (alternative for power users) — better throughput, more control
- **llama.cpp server** (lightweight alternative) — minimal footprint

The Nerd's capability router sits on top. Ollama handles the hard part (VRAM, quantization, model loading). The Nerd handles the useful part (which model for which task, structured I/O, app integration).

## 4. Capability domains in detail

### 4.1 Documents (RAG)

**The killer standalone feature.** Ask questions about your taxes, bills, and medical records without uploading them anywhere.

**Ingestion pipeline:**
1. User points the Nerd at folders (`~/Documents/taxes/`, `~/Documents/medical/`, etc.)
2. Nerd watches folders (inotify/fswatch) for new files
3. New files: PDF → text extraction (PyMuPDF). Scans/images → OCR via Gemma 4 multimodal.
4. Text → chunked → embedded (local embedding model) → stored in vector DB (ChromaDB or SQLite-vec)
5. Structured extraction: dates, amounts, vendors, categories stored as metadata

**Query flow:**
1. User asks: "How much did I spend on dental in 2025?"
2. Nerd retrieves top-k relevant chunks from vector DB
3. Chunks + question → Gemma 4 → answer with source citations
4. Dashboard shows answer + links to source documents

**Collection config:**
```yaml
# ~/.ihomenerd/collections.yaml
collections:
  taxes:
    path: ~/Documents/taxes/
    watch: true
    auto_categorize: true
  bills:
    path: ~/Documents/bills/
    watch: true
  medical:
    path: ~/Documents/medical/
    watch: true
  receipts:
    path: ~/Photos/receipts/
    watch: true
    ocr: true    # scanned/photo documents
```

### 4.2 Vision (cameras)

Absorbs iHomeNerd-Core's "AI Guard Dog" vision from the Dec 2025 reboot.

**Vacation Mode (entry tier):**
- Connects to RTSP camera streams
- Motion gate → YOLO detection → Gemma 4 multimodal captioning
- Daily digest email: "Quiet day. FedEx delivered package at 2:30 PM. Sprinklers ran at 6 AM."
- "Nothing happened" is the most valuable notification

**Construction Mode (pro tier):**
- 24/7 stream analysis on heavier hardware
- Progress tracking: "Drywall installed in living room. Crew arrived 7 AM, left 3:30 PM."
- Material monitoring: "Lumber pile smaller than yesterday, no construction detected."
- Safety compliance: "Worker on roof without harness."

**PTZ Control (future):**
- Active vision: detect → zoom → re-analyze → resume wide scan
- Multi-camera tracking across views

### 4.3 Language (translation, transcription, chat)

**Translate:** TranslateGemma locally. Any language pair. No API key, no tracking, no quota.

**Transcribe:** Whisper locally. Drag audio/video file → get transcript with timestamps. Supports SRT/VTT output.

**Chat:** Gemma 4 general-purpose chat. Private, no account, no history leaving the machine.

### 4.4 App integrations (plugin model)

Apps discover the Nerd via `/health` and check `/capabilities` for available skills. Each app only uses what it needs.

**Discovery flow:**
1. User goes to app Settings → "Connect to iHomeNerd"
2. Enter URL manually (e.g., `http://msi-raider-linux.local:17777`) or scan LAN
3. App calls `GET /health` → confirms Nerd is running
4. App calls `GET /capabilities` → checks which skills are available
5. App enables local mode for supported capabilities

**Capability response example:**
```json
{
  "product": "iHomeNerd",
  "version": "0.1.0",
  "hostname": "msi-raider-linux",
  "capabilities": {
    "translate_text": { "available": true, "model": "translategemma-4b", "tier": "light" },
    "transcribe_audio": { "available": true, "model": "whisper-medium", "tier": "medium" },
    "query_documents": { "available": true, "collections": ["taxes", "bills", "medical"] },
    "detect_objects": { "available": true, "model": "yolov8-nano", "tier": "detection" },
    "chat": { "available": true, "model": "gemma-4-12b-it", "tier": "medium" },
    "extract_lesson_items": { "available": true, "tier": "medium" },
    "generate_drill": { "available": true, "tier": "light" },
    "explain_score": { "available": true, "tier": "medium" },
    "analyze_delivery": { "available": true, "tier": "heavy" },
    "store_recording": { "available": true, "storage_path": "/data/recordings/" }
  }
}
```

Apps that don't see their capabilities simply fall back to cloud. No error, no degradation — just the cloud path they already have.

## 5. API

### 5.1 Base URL

Default: `http://127.0.0.1:17777`
LAN mode: `http://<hostname>.local:17777`

### 5.2 Core endpoints

```
GET  /health              — status, version, hostname
GET  /capabilities        — full capability registry with model info
```

### 5.3 Document endpoints

```
POST /v1/docs/ingest      — add a folder or file to a collection
GET  /v1/docs/collections — list collections and stats
POST /v1/docs/ask         — RAG query ("How much was my electricity in 2025?")
GET  /v1/docs/search      — semantic search without generation
```

### 5.4 Language endpoints

```
POST /v1/translate        — text translation
POST /v1/transcribe       — audio/video file transcription
POST /v1/chat             — general-purpose chat
POST /v1/summarize        — document or text summarization
```

### 5.5 Vision endpoints

```
POST /v1/vision/analyze   — analyze a single frame or image
POST /v1/vision/detect    — object detection on frame
GET  /v1/vision/cameras   — list connected camera streams
GET  /v1/vision/digest    — get daily digest for a camera
POST /v1/vision/configure — add/remove RTSP streams
```

### 5.6 App-integration endpoints (loaded per plugin)

```
POST /v1/lesson-extract   — PronunCo lesson extraction
POST /v1/drill-generate   — PronunCo drill generation
POST /v1/score-explain    — score explanation (PronunCo + TelPro-Bro)
POST /v1/chat-persona     — roleplay persona (PronunCo + TelPro-Bro)
POST /v1/analyze-delivery — TelPro-Bro delivery rubric (RFC-005)
POST /v1/recordings       — TelPro-Bro recording storage
GET  /v1/recordings       — list recordings
GET  /v1/recordings/:id   — get specific recording
```

## 6. Web dashboard

Built-in web UI at the base URL. No app required.

### Panels

| Panel | Description |
|---|---|
| **Documents** | Collections list, ask questions, browse sources, re-scan |
| **Cameras** | Live view, daily digests, event log, camera config |
| **Translate** | Paste text, pick languages, get translation |
| **Transcribe** | Drag audio/video file, get transcript |
| **Chat** | General-purpose local chat |
| **System** | Loaded models, VRAM usage, active requests, connected apps, uptime |

### CLI

```bash
ihomenerd ask "How much did I spend on dental in 2025?"
ihomenerd translate "Hello" --to ko
ihomenerd transcribe meeting.mp4 --format srt
ihomenerd chat "Explain this error..."
ihomenerd status
```

## 7. Networking and trust

### 7.1 Modes

| Mode | Binding | Auth | Default |
|---|---|---|---|
| **Local only** | `127.0.0.1:17777` | None (implicit trust) | Yes |
| **LAN** | `0.0.0.0:17777` | Pairing token | Opt-in (`ihomenerd --lan`) |

### 7.2 Pairing

First LAN connection: Nerd shows a 6-digit code in its terminal/dashboard. User enters it in the connecting app/browser. After pairing, a long-lived token is issued and stored client-side. Same pattern as Bluetooth.

### 7.3 Discovery

- **Phase 1:** Manual URL entry in app settings. Simple, explicit.
- **Phase 2:** mDNS/Bonjour advertisement (`_ihomenerd._tcp`). Zero-config, like printers/AirPlay. Machines already use mDNS (`iMac-macOS.local`, `msi-raider-linux.local`).

### 7.4 Multi-Nerd routing

Multiple Nerds on the network? Each advertises its capabilities. The app (or a coordinator Nerd) routes:
- Prefer local (lowest latency)
- Escalate to network Nerd when local can't handle the task
- User controls routing in Settings

### 7.5 Security

- Localhost-only by default
- LAN mode requires explicit opt-in
- Pairing tokens for LAN connections
- Per-app namespaces (PronunCo data ≠ TelPro-Bro data)
- No long-term content storage unless explicitly configured
- Model downloads via Ollama's existing verified channels
- Open source — inspect the code

## 8. Hardware tiers

| Hardware | Cost | VRAM/Memory | Capabilities | Use case |
|---|---|---|---|---|
| **OrangePi 5 Plus** | ~$100 | NPU + 16GB RAM | Detection + light model | Budget camera monitoring |
| **Old laptop/mini-PC** | ~$0-200 | CPU only | Light tasks, slow but works | Translate, transcribe, simple RAG |
| **MSI Raider / gaming PC** | existing | RTX 4070 8GB | Full capabilities, medium models | Power home user (Alex's current setup) |
| **Mac Studio / Mac Mini** | $600-4000 | M-series 32-192GB unified | Everything including 27B+ models, 24/7 streams | Pro home lab, construction monitoring |
| **Used workstation + A6000** | ~$1200 | 48GB VRAM | All models resident, multi-user | Small office, dedicated AI server |

The capability registry handles this automatically. An OrangePi advertises `detect_objects: true, query_documents: false`. A Mac Studio advertises everything.

## 9. Revenue model

| Layer | Pricing | Trust signal |
|---|---|---|
| **iHomeNerd core** (open source) | Free | Inspect the code, runs on your hardware |
| **iHomeNerd Pro** (premium skills) | $5-10/month | Advanced camera modes, construction monitoring, multi-cam, priority model updates |
| **App integrations** | Each app prices independently | PronunCo Pro, TelPro-Bro Pro charge for their own premium features |

The Nerd is free infrastructure. Premium skills on the Nerd are paid. Apps that integrate pay for their own premium features. No double-dipping.

## 10. Relationship to existing sub-projects

| Sub-project | Disposition |
|---|---|
| **iHomeNerd-Core** | Vision capabilities (camera analysis, YOLO, digests) merge into the main Nerd as the Vision domain |
| **Organi-Share** | Infrastructure docs (DNS, certs, Nginx, Vaultwarden) become the Nerd's deployment/networking guide |
| **RoadNerd** | Stays separate — different deployment model (USB bootable, offline, no network). May share model assets but not runtime. |

## 11. Implementation phases

### Phase 1: Standalone MVP
- FastAPI service with `/health`, `/capabilities`
- Ollama backend integration
- Web dashboard: Translate + Transcribe + Chat panels
- CLI: `ihomenerd translate/transcribe/chat/status`
- Localhost only
- **Ship this.** It's useful on its own.

### Phase 2: Document RAG
- Folder ingestion pipeline (PyMuPDF + embedding + ChromaDB)
- `/v1/docs/*` endpoints
- Dashboard: Documents panel with ask/search/browse
- Collection config (YAML)
- Folder watching (inotify/fswatch)

### Phase 3: App integration
- Plugin model for app-specific capabilities
- PronunCo integration (lesson-extract, drill-generate, score-explain, translate)
- TelPro-Bro integration (analyze-delivery, score-explain, store-recording)
- `/capabilities` reports app skills when plugins loaded
- LAN mode with pairing

### Phase 4: Vision
- RTSP stream connection
- YOLO detection + Gemma 4 multimodal captioning
- Daily digest (vacation mode)
- Dashboard: Cameras panel
- Email notifications

### Phase 5: Pro and Office
- Construction monitoring mode
- Multi-camera tracking
- Multi-user support
- iOfficeNerd branding/onboarding variant
- Pro billing integration

## 12. Non-goals for V1

- Replacing Ollama's model management (use Ollama)
- Running models inside the browser (the Nerd IS the escape from browser inference)
- Cloud hosting / SaaS version (the entire point is local)
- Mobile app (web dashboard works on mobile browsers)
- Smart home device control (not competing with Home Assistant — complementing it)

## 13. Tech stack

| Component | Technology |
|---|---|
| API server | Python FastAPI |
| Model backend | Ollama (default) / vLLM (power users) |
| Vector DB | ChromaDB or SQLite-vec |
| Embedding | nomic-embed-text or similar small model |
| Transcription | Whisper (via Ollama or standalone) |
| Object detection | YOLOv8 (ultralytics) |
| Web dashboard | Lightweight — Svelte or plain HTML + htmx |
| CLI | Python (Click or Typer) |
| Packaging | pip install, Docker, OrangePi image |

## 14. Change log

- **2026-04-10** — initial product spec. Consolidates Studio Companion design discussions, iHomeNerd-Core vision reboot (Dec 2025), Organi-Share infrastructure work, PronunCo provider abstraction spec, and BTP-core local companion spec into a unified product.
