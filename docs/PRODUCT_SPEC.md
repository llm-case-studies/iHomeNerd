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

## 1.1 Early launch use cases

The first public version should not feel like a vague "local AI platform." It should feel like a handful of immediately understandable jobs.

| Use case | What the user gets | Why it matters at launch |
|---|---|---|
| **Tax copilot** | Ask questions about returns, receipts, IRS docs, and software output locally | Concrete, high-trust, easy-to-understand value |
| **TurboTax chooser** | Short interview that recommends the likely right TurboTax tier with explanation and caveats | Solves a recurring pre-filing confusion point without pretending to prepare taxes |
| **Translate + transcribe** | Local translation and transcript generation for files and snippets | Daily-use utility that proves the product is useful even without any app integration |
| **Camera digest** | "What actually happened today?" summaries instead of noisy motion alerts | Distinctive consumer story and strong privacy angle |
| **PronunCo companion** | Local lesson extraction, translation, drill generation, and score explanation | Gives iHomeNerd an immediate serious integration story |
| **Office/local knowledge brain** | Search internal documents and answer questions privately on local hardware | Natural bridge from iHomeNerd to iOfficeNerd |

### 1.2 Product truth

iHomeNerd should be presented as **one local AI brain, many skills, many apps**.

That message matters for trust. People are much more willing to install a local component if it is:
- useful on its own
- inspectable
- clearly theirs
- not just a mystery helper process for one app

PronunCo should be the **first polished integration demo**, not the only reason iHomeNerd exists.

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
| **Light** | Gemma 4 E2B / Gemma 4 E4B / TranslateGemma 4B | ~3-8 GB | Translation, light chat, lesson extraction, local roleplay, audio-capable Gemma experiments |
| **Medium** | Gemma 3 12B / Llama 3 8B class | ~5-10 GB | Better score explanation, chat persona, document RAG generation, smarter lesson extraction |
| **Heavy** | Gemma 4 26B / 31B or similar large multimodal | ~16 GB+ | Complex multi-doc synthesis, camera captioning, office-grade reasoning |
| **Detection** | YOLOv8-Nano | ~200 MB | Object detection on camera frames |
| **Transcription** | Whisper (medium/large) | ~2-5 GB | Audio/video transcription |

On an 8GB GPU (RTX 4070): `gemma4:e2b` is the safe interactive baseline, `gemma4:e4b` should be tested next, and 12B-class models are possible but slower.
On a 24GB+ GPU or Apple Silicon with 32GB+ unified: medium and heavy tiers become realistic defaults.
On an OrangePi 5 Plus (NPU): detection, routing, and light helper roles only.

### 3.4 Model backend

iHomeNerd does NOT reimplement model serving. It uses:

- **Ollama** (recommended default) — best starting point for text/image local serving, model management, quantization, and simple deployment
- **Transformers runtime** (targeted capability backend) — best current path for Gemma 4 audio experiments and other direct multimodal model access
- **llama.cpp server** (lightweight / parallel-serving alternative) — minimal footprint, OpenAI-style serving, worth testing for throughput and concurrency
- **vLLM** (alternative for power users or servers) — better throughput, more control, less consumer-friendly

The Nerd's capability router should sit above all runtimes and choose by capability, not by vendor name.
Examples:

- `extract_lesson_items` can start on Ollama
- `dialogue_session` can use Ollama first, then smarter backends later
- `transcribe_audio` should route to Whisper / faster-whisper rather than waiting for end-to-end audio LLMs
- Gemma 4 audio experiments should go through Transformers first, not be blocked on Ollama parity

### 3.5 Voice and call stack

For app-style roleplay and call experiences, audio should be treated as a pipeline:

`ASR -> dialogue brain -> TTS`

Do not block useful PronunCo or TelPro-Bro interactions on a single end-to-end native-audio model.

Near-term stack:

- **ASR:** Whisper / faster-whisper
- **Dialogue brain:** Gemma-family local model or cloud fallback
- **TTS baseline:** browser TTS
- **Better local TTS:** Kokoro
- **Stronger English roleplay voice:** Chatterbox

Gemma 4 audio-capable variants are still worth exploring, but they should be treated as an experiment track rather than the only path to voice interaction.

### 3.6 Deployment modes

iHomeNerd should support multiple trust and deployment paths:

- **Developer install:** GitHub / pip / Docker
- **Everyday local companion:** app/service on an existing machine
- **Live Companion Image:** bootable trial image with optional persistence and preloaded starter bundle
- **Dedicated node / appliance:** approved hardware with persistent install and managed updates

The live image path matters because many users are more willing to try a clean bootable environment than to install long-running services on their day-to-day machine.

## 4. Capability domains in detail

### 4.1 Documents (RAG)

**The killer standalone feature.** Ask questions about your taxes, bills, medical records, software exports, and household paperwork without uploading them anywhere.

**Near-term high-value flows:**
- **Tax copilot:** ingest prior returns, W-2s, 1099s, donation receipts, medical receipts, and official IRS docs; answer questions with source citations
- **TurboTax chooser / checker:** ask plain-English intake questions, explain likely TurboTax tier selection, and review TurboTax output for assumptions or missing questions
- **Bills and household search:** "How much did I spend on dental in 2025?" or "Did I already pay this invoice?"
- **Office knowledge:** search local procedures, policy docs, contracts, and notes privately

**Important product rule:** this is a **copilot/explainer/reviewer**, not a tax filing engine or legal authority. It should explain, compare, and flag uncertainty, not pretend to certify the best filing position by itself.

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
  "api_version": 1,
  "hostname": "msi-raider-linux",
  "capabilities": {
    "translate_text": { "available": true, "model": "translategemma-4b", "tier": "light", "core": true },
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
| **OrangePi 5 Plus** | ~$100 | NPU + 16GB RAM | Detection, routing, light helper roles | Budget camera monitoring, edge gateway |
| **Old laptop/mini-PC** | ~$0-200 | CPU only | Light tasks, slow but works | Translate, transcribe, simple RAG |
| **MSI Raider / gaming PC** | existing | RTX 4070 8GB | Strong light tier, usable medium tier, local voice experiments | Power home user (Alex's current setup) |
| **Mac Studio / Mac Mini** | $600-4000 | M-series 32-192GB unified | Strong all-around local node, larger models, quiet office fit | Pro home lab, office, construction monitoring |
| **Used workstation + A6000** | ~$1200 | 48GB VRAM | All models resident, multi-user | Small office, dedicated AI server |

The capability registry handles this automatically. An OrangePi should not pretend to be a full local AI workstation. A Mac Studio or workstation can advertise far more.

## 9. Revenue model

| Layer | Pricing | What it includes | Trust signal |
|---|---|---|---|
| **iHomeNerd core** (open source) | Free | Local chat, local translation, local transcription, basic document Q&A, localhost-only dashboard/API | Inspect the code, runs on your hardware |
| **Local Starter bundle** | Free | Local companion presets, starter model recommendations, browser TTS baseline, optional live image trial path | Serious local trial without cloud lock-in |
| **iHomeNerd Pro** | ~$5-10/month | Premium skills, easier packaging/update flow, advanced camera modes, richer document workflows, local/cloud hybrid routing, tested voice bundles | Useful on its own before any upsell |
| **iOfficeNerd / office tier** | Higher per seat / per box / support contract | Team onboarding, multi-user, LAN mesh helpers, office policy bundles, admin controls, support | Clear business boundary and support promise |
| **App integrations** | Each app prices independently | PronunCo Pro, TelPro-Bro Pro, other apps charge for their own premium pedagogy or workflow value | No double-dipping on core local infrastructure |

The key trust rule is: **basic local utility should remain genuinely useful for free.** Paid layers should add packaging, premium skills, office features, and support rather than turning the whole product into bait for a later upsell.

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
- One concrete document copilot demo, ideally **tax copilot / software-output explainer**
- **Ship this.** It must feel useful on its own before PronunCo integration.

### Phase 2: Runtime matrix + local voice
- Benchmark `gemma4:e2b`, `gemma4:e4b`, and 12B-class text models on real PronunCo payloads
- Add runtime abstraction so capabilities can route across Ollama, Transformers, and later `llama.cpp`
- Keep Whisper/faster-whisper as the first ASR path
- Add browser TTS baseline plus Kokoro and Chatterbox experiments

### Phase 3: Document RAG
- Folder ingestion pipeline (PyMuPDF + embedding + ChromaDB)
- `/v1/docs/*` endpoints
- Dashboard: Documents panel with ask/search/browse
- Collection config (YAML)
- Folder watching (inotify/fswatch)

### Phase 4: App integration
- Plugin model for app-specific capabilities
- PronunCo integration (lesson-extract, drill-generate, score-explain, translate) as the **first polished external integration**
- PronunCo dialogue path with bounded sessions and local/browser voice options
- TelPro-Bro integration (analyze-delivery, score-explain, store-recording)
- `/capabilities` reports app skills when plugins loaded
- LAN mode with pairing

### Phase 5: Vision
- RTSP stream connection
- YOLO detection + Gemma 4 multimodal captioning
- Daily digest (vacation mode)
- Dashboard: Cameras panel
- Email notifications

### Phase 6: Packaging, Pro, and Office
- Live Companion Image with optional persistent storage
- Approved hardware list and starter model bundles
- Construction monitoring mode
- Multi-camera tracking
- Multi-user support
- iOfficeNerd branding/onboarding variant
- Pro billing integration

## 12. Home journal (cross-domain knowledge accumulation)

Every domain — taxes, network, cameras, household — shares one SQLite journal. When iHomeNerd answers a question or solves a problem, it saves the problem, reasoning, solution, outcome, and an embedding vector.

### Why

Local inference is expensive (5-30s per call on consumer hardware). Re-deriving the same answer to "how much did I spend on dental in 2025?" every time is wasteful. The journal makes solved problems free.

### Three-tier lookup

| Similarity | Action | Cost |
|---|---|---|
| **> 0.90** | Serve past solution directly | Zero inference |
| **0.65 – 0.90** | Feed top-N past entries to LLM as context — "here are similar past issues, do any apply?" | Cheap (review, not derive) |
| **< 0.65** | Full LLM pass — novel problem | Full inference cost |

### Schema

```sql
CREATE TABLE journal (
    id INTEGER PRIMARY KEY,
    timestamp TEXT NOT NULL,
    domain TEXT NOT NULL,        -- 'taxes', 'medical', 'network', 'camera', 'household'
    collection TEXT,             -- 'taxes-2025', 'dental', 'printer-office'
    problem TEXT NOT NULL,       -- what was asked
    reasoning TEXT,              -- what the LLM figured out
    solution TEXT,               -- what worked
    outcome TEXT,                -- 'resolved', 'partial', 'failed', 'informational'
    sources TEXT,                -- JSON array of doc paths that were used
    embedding BLOB               -- vector for similarity search
);
```

### Pattern detection

The journal enables pattern detection across repeated issues that a single LLM call cannot see:

- "Camera keeps going offline at night" → third occurrence → "This has happened 3 times, always around 2 AM. Restarting the PoE switch fixes it temporarily. Consider replacing the switch."
- "DNS resolution fails after updates" → second occurrence → "Same issue as March — systemd-resolved config gets reset by apt upgrade."

### The real moat

iHomeNerd's journal is the product's real moat. Not the models (everyone has Gemma), not the API (trivial to replicate), but **the accumulated knowledge about THIS specific home or office.** That data gets more valuable every month and is irreplaceable.

## 13. Source packs (cloud-curated, locally consumed)

Public reference documents (IRS forms, state tax forms, Medicare guides, FAFSA instructions) are available as curated source packs — YAML files listing URLs, descriptions, and categories.

Cloud AI curates the packs (which documents matter, what they're for). iHomeNerd downloads and ingests them locally. Your questions and answers never leave home.

```yaml
# Example: irs-2025 source pack
name: IRS 2025 Tax Season
schedule: weekly
urls:
  - https://www.irs.gov/pub/irs-pdf/f1040.pdf
  - https://www.irs.gov/pub/irs-pdf/i1040.pdf
  - https://www.irs.gov/pub/irs-pdf/f1099int.pdf
destination: ~/Documents/taxes/irs-reference/
```

Community can contribute packs via pull requests to a public repo. Packs contain only public URLs and metadata — no private data, no privacy concern.

## 15. Non-goals for V1

- Replacing Ollama's model management (use Ollama)
- Running models inside the browser (the Nerd IS the escape from browser inference)
- Cloud hosting / SaaS version (the entire point is local)
- Mobile app (web dashboard works on mobile browsers)
- Smart home device control (not competing with Home Assistant — complementing it)

## 16. Tech stack

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
| Packaging | pip install, Docker, signed installers, Live Companion Image, approved appliance configs |

## 17. Change log

- **2026-04-10** — initial product spec. Consolidates Studio Companion design discussions, iHomeNerd-Core vision reboot (Dec 2025), Organi-Share infrastructure work, PronunCo provider abstraction spec, and BTP-core local companion spec into a unified product.
- **2026-04-12** — clarified runtime strategy (`Ollama` + `Transformers` + `llama.cpp`), local voice path (`browser TTS`, `Kokoro`, `Chatterbox`), Gemma 4 tiering for PronunCo, and the Live Companion Image deployment concept.
- **2026-04-10** — added home journal (Section 12), source packs (Section 13), `api_version` and `core` fields in capability response. Repo re-org: removed legacy sub-projects, scaffolded Phase 1 backend.
