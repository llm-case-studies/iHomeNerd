# iHomeNerd Ecosystem Integration

> One brain, seven skills, many apps — all local, all private, all yours.

**Date:** 2026-04-18
**Status:** Architecture Specification
**Audience:** All integration teams (PronunCo, iMedisys, iScamHunter, WhoWhe2Wha, Crypto-Fakes)

---

## 1. Vision

iHomeNerd is the **local AI brain** that powers a family of specialized applications. Each app brings domain expertise; iHomeNerd provides the shared intelligence layer — LLM reasoning, document search, vision, voice, network scanning, and a deterministic rules engine. Everything runs locally. No cloud dependency. No subscription. No data leaves the machine.

The ecosystem forms a **city of wisdom, care, and beauty**:

```
┌─────────────────────────────────────────────────────────────┐
│                      iHomeNerd (Brain)                       │
│                                                              │
│   Shared Services                                            │
│   ┌───────────┐  ┌───────────┐  ┌───────────┐              │
│   │ ollama.py │  │ vision.py │  │ rules.py  │              │
│   │ (LLM)     │  │ (OCR/img) │  │ (logic)   │              │
│   └───────────┘  └───────────┘  └───────────┘              │
│   ┌───────────┐  ┌───────────┐  ┌───────────┐              │
│   │docstore.py│  │  asr.py   │  │  tts.py   │              │
│   │ (RAG)     │  │ (Whisper) │  │ (Kokoro)  │              │
│   └───────────┘  └───────────┘  └───────────┘              │
│                                                              │
│   Plugins (domain-specific logic)                            │
│   ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐     │
│   │ PronunCo │ │ iMedisys │ │  Kitchen │ │ScamHunter│     │
│   │ (lang)   │ │ (health) │ │ (restau.)│ │ (invest.)│     │
│   └──────────┘ └──────────┘ └──────────┘ └──────────┘     │
│   ┌──────────┐                                              │
│   │   Tax    │                                              │
│   │(complian)│                                              │
│   └──────────┘                                              │
│                                                              │
│   Horizontal Domains (available to all apps, no plugin)      │
│   ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐     │
│   │ Language │ │   Docs   │ │Investigate│ │  Agents  │     │
│   │chat/summ.│ │  RAG     │ │ network  │ │ ReAct    │     │
│   └──────────┘ └──────────┘ └──────────┘ └──────────┘     │
│                                                              │
│   Deadline Broker → calendar events → WhoWhe2Wha             │
└─────────────────────────────────────────────────────────────┘
         │              │              │              │
    ┌────▼────┐   ┌────▼────┐   ┌────▼────┐   ┌────▼────┐
    │PronunCo │   │iMedisys │   │iScamHunt│   │WhoWhe2Wa│
    │pronounce│   │medical  │   │defense  │   │life     │
    │& drill  │   │billing  │   │& expose │   │timeline │
    └─────────┘   └─────────┘   └─────────┘   └─────────┘
                                     │
                                ┌────▼────┐
                                │ Crypto- │
                                │ Fakes   │
                                │(cases)  │
                                └─────────┘
```

---

## 2. Out-of-the-Box vs Plugin

### 2.1 Out-of-the-Box (any app, no plugin needed)

These horizontal domains are available to every app via standard REST endpoints:

| Domain | Endpoint | What It Provides |
|--------|----------|------------------|
| **Language** | `POST /v1/chat`, `/v1/translate`, `/v1/summarize` | Chat, translate, summarize with local Gemma |
| **Docs** | `POST /v1/docs/ingest`, `/v1/docs/ask` | Ingest folders → PDF/text extraction → embedding → semantic search with cited answers |
| **Investigate** | `GET /v1/investigate/environment`, `POST /v1/investigate/scan` | Network discovery, device scanning, security audit |
| **Agents** | `POST /v1/agents/task` | Stateful ReAct agents with tools (search_docs, summarize, network_scan, run_command) |
| **Voice** | `POST /v1/transcribe-audio`, `/v1/synthesize-speech` | Whisper ASR + Kokoro TTS |

**Use case:** Any app that needs "ask questions about my documents" or "scan my network" or "translate this text" — just call the API. No registration, no plugin code.

### 2.2 Plugin Required (domain-specific logic)

A plugin is needed when the app requires **domain rules, specialized prompts, or custom data models** beyond what the horizontal domains provide:

| App | Plugin | Why It Needs a Plugin |
|-----|--------|----------------------|
| **PronunCo** | `plugins/pronunco.py` (exists) | Lesson extraction, dialogue turns, pronunciation scoring, language-specific phonetics |
| **iMedisys** | `plugins/imedisys.py` (new) | ICD-10/CPT coding rules, payer denial logic, documentation gap detection, HIPAA privacy, Patient vs Provider modes, Medicare/Medigap decision support |
| **Tax** | `plugins/tax.py` (new) | IRS rules engine, tax bracket computation, W-2/1099 field extraction, four-layer explainability (Story/Rule/Math/Authority) |
| **Kitchen** | `plugins/kitchen.py` (new) | Dish recognition prompts, COGS calculation, inventory categorization, vendor invoice templates |
| **ScamHunter** | `plugins/scamhunter.py` (new) | Investigation workflow (evidence chain → timeline → report), scam pattern matching, wallet/domain reputation, case study publishing |

See `PLUGIN_GUIDE_2026-04-18.md` for how to build a plugin.

---

## 3. Shared Services

### 3.1 Rules Engine (`rules.py`) — NEW

A deterministic, JSON-driven rules engine for high-stakes decisions where LLM hallucination is unacceptable.

**Key properties:**
- Rules defined in `.rules.json` files — editable without rebuild
- Hot-reloaded on change (mtime-based cache)
- Smart validation: schema checks, conflict detection, coverage gaps, staleness warnings
- LLM narrates outcomes but never decides them
- Open-source rule packs on GitHub (`iHomeNerd-rules` repo, CC BY-SA 4.0)

**Used by:** iMedisys (payer rules, Medicare enrollment), Tax (brackets, deductions), Travel Insurance (pre-existing waiver windows), Medical Coding (denial rules)

See `RULES_ENGINE_SPEC_2026-04-18.md` for full specification.

### 3.2 Vision Service (`vision.py`) — NEW

Gemma 4 multimodal via Ollama for image understanding. One service, many use cases:

| Use Case | Input | Output |
|----------|-------|--------|
| Receipt OCR | Photo of receipt | Structured JSON (vendor, items, totals, tax) |
| Invoice parsing | Photo of invoice | PO numbers, payment terms, line items |
| Dish recognition | Photo of plated food | Dish name, likely ingredients, estimated cost |
| Bill/EOB OCR | Photo of medical bill | CPT codes, charges, provider, patient responsibility |
| W-2/1099 OCR | Photo of tax form | All box values as structured data |
| Evidence capture | Screenshot of scam | Text extraction, URL detection, timestamp |

**Integration with Docs domain:** If `ocr=true` on ingest, images route through `vision.py` before entering the chunking → embedding pipeline.

### 3.3 Deadline Broker (`/v1/calendar/sync`) — NEW

Converts rules engine outcomes with deadlines into calendar events consumable by WhoWhe2Wha:

```
Plugin evaluates rules → outcomes with deadlines
    → Deadline Broker formats as WhoWhe2Wha EventNodes
    → Export as .ics (immediate) or API poll (long-term)
    → WhoWhe2Wha displays on life timeline with runway bars
```

See WhoWhe2Wha's `IHOMENERD_DEADLINE_INTEGRATION.md` for the receiving side.

### 3.4 Existing Services

| Service | File | Status |
|---------|------|--------|
| `ollama.py` | LLM client with tier-based model resolution | Production |
| `docstore.py` | SQLite RAG store with vector search | Production |
| `asr.py` | Whisper transcription (faster-whisper, CPU) | Production |
| `tts.py` | Kokoro TTS (ONNX, 54 voices × 9 languages) | Production |
| `capabilities.py` | Capability registry and probing | Production |
| `discovery.py` | mDNS advertisement for LAN discovery | Production |

---

## 4. App Integration Map

### 4.1 PronunCo → iHomeNerd

**Status:** Plugin exists (`plugins/pronunco.py`)
**Uses:** Language (lesson extraction, dialogue), Voice (ASR for pronunciation, TTS for model audio)
**Planned:** Vision (articulation diagram analysis), Docs (phonetics reference materials)

### 4.2 iMedisys → iHomeNerd

**Status:** Cloud Gemini MVP, migration planned
**Migration:** Replace Gemini API calls with local Gemma via `plugins/imedisys.py`
**Uses:** Language (clinical text analysis), Rules (ICD-10/CPT coding, payer denials, Medicare/Medigap), Vision (bill/EOB OCR), Docs (ingest plan documents for RAG)
**Keeps:** Client-side privacy scrubber (good architecture, stays in browser)
**See:** iMedisys `docs/IHOMENERD_MIGRATION_PLAN.md`

### 4.3 iScamHunter → iHomeNerd

**Status:** Next.js staging deployed, integration planned
**Uses:** Vision (screenshot evidence capture), Docs (case evidence RAG), Agents (investigation workflow), Language (report/blog generation)
**Publishes to:** Crypto-Fakes (case studies as Markdown → static site)
**See:** iScamHunter `docs/IHOMENERD_INTEGRATION.md`

### 4.4 Crypto-Fakes → iHomeNerd

**Status:** Static explainer page, case study system planned
**Consumes:** Case studies published by iScamHunter's investigation agent
**Architecture:** Markdown files in GitHub repo → static site generator → auto-deploy on push
**iHomeNerd role:** Agent writes case study Markdown, pushes to repo

### 4.5 WhoWhe2Wha ← iHomeNerd

**Status:** Client-side SPA, no backend
**Receives:** Deadline events from iHomeNerd's Deadline Broker
**Integration:** Phase 1 via .ics import (works today), Phase 2 via localStorage bridge, Phase 3 via API polling
**See:** WhoWhe2Wha `Docs/IHOMENERD_DEADLINE_INTEGRATION.md`

### 4.6 Restaurant / Kitchen → iHomeNerd

**Status:** Concept validated (diner conversation, 2026-04-17)
**Uses:** Vision (receipt OCR, invoice parsing, dish recognition), Docs (searchable receipt/invoice archive), Rules (health code compliance dates)
**Differentiator:** 100% offline — no internet required, runs on mini-PC under the counter

### 4.7 Tax / Compliance → iHomeNerd

**Status:** Research doc complete (`docs/Ideas/Local AI for Tax and Medical Explainability.md`)
**Uses:** Vision (W-2/1099 OCR), Rules (IRS brackets, state tax, deductions), Docs (ingest IRS publications for RAG), Language (four-layer explainability: Story/Rule/Math/Authority)
**Architecture:** Rules-as-Code for deterministic computation, LLM for narration only

---

## 5. Open-Source Strategy

### 5.1 What Is Open-Source

| Repository | Contents | License |
|------------|----------|---------|
| `iHomeNerd-rules` | `.rules.json` files for all domains (Medicare, tax, medical coding, travel insurance) | CC BY-SA 4.0 |

Rules are public knowledge (IRS publications, CMS guidelines, state regulations). Open-sourcing creates a community flywheel: contributors catch errors, add state-specific rules, update annually.

### 5.2 What Stays Private

| Component | Why Private |
|-----------|------------|
| `rules.py` (engine) | Competitive advantage — evaluation, smart-checks, LLM narration |
| Plugin code | App-specific integration logic |
| User data | Personal documents, health records, financial data |

### 5.3 Community Model

Like uBlock filter lists or Home Assistant integrations:
- Community maintains the rules data
- iHomeNerd provides the intelligence (engine + validation + narration)
- PRs reviewed for accuracy by domain experts
- Annual update cycle for tax/Medicare (aligned with IRS/CMS publication schedule)

---

## 6. Phased Implementation

### Phase 1: Foundation (current)
- Language, Docs, Investigate, Agents domains — **done**
- PronunCo plugin — **done**
- Voice pipeline (ASR + TTS) — **done**

### Phase 2: Shared Services
- `vision.py` — Gemma 4 multimodal via Ollama
- `rules.py` — deterministic rules engine with smart checks
- Docs domain OCR branch (image → vision → chunking pipeline)
- Open-source `iHomeNerd-rules` repo with first Medicare + tax rule packs

### Phase 3: Plugin Wave
- `plugins/imedisys.py` — migrate from cloud Gemini
- `plugins/tax.py` — tax/compliance copilot
- `plugins/scamhunter.py` — investigation pipeline
- `plugins/kitchen.py` — restaurant receipt/dish/invoice

### Phase 4: Deadline Broker + WhoWhe2Wha
- `/v1/calendar/sync` endpoint
- .ics export for immediate compatibility
- WhoWhe2Wha API integration for live deadline sync

### Phase 5: Community + Scale
- `iHomeNerd-rules` public repo launch
- CONTRIBUTING.md with rule authoring guide
- Annual rule pack update workflow
- Multi-Nerd routing (household with multiple devices)

---

## 7. Hardware Targets

All of this runs on consumer hardware. No cloud. No GPU cluster.

| Hardware | Capability |
|----------|------------|
| OrangePi 5 (8GB) | Rules engine + lightweight RAG (no vision) |
| Laptop (16GB, no GPU) | Full stack with gemma4:e2b (CPU, slower) |
| RTX 4070 8GB (MSI Raider) | Full stack with gemma4:e2b at 109 tok/s |
| RTX 4070 12GB+ | gemma4:e4b for higher quality |
| Mac Studio M2 Ultra | All models, multiple concurrent users |

---

## 8. Related Documents

| Document | Location | Purpose |
|----------|----------|---------|
| Rules Engine Spec | `docs/RULES_ENGINE_SPEC_2026-04-18.md` | Full rules engine design |
| Plugin Guide | `docs/PLUGIN_GUIDE_2026-04-18.md` | How to build a plugin |
| WhoWhe2Wha Integration | WhoWhe2Wha `Docs/IHOMENERD_DEADLINE_INTEGRATION.md` | Deadline pipeline |
| iMedisys Migration | iMedisys `docs/IHOMENERD_MIGRATION_PLAN.md` | Cloud → local migration |
| iScamHunter Integration | iScamHunter `docs/IHOMENERD_INTEGRATION.md` | Investigation plugin |
| Whitepaper & Roadmap | `docs/WHITEPAPER_ROADMAP_2026-04-13.md` | Core vision and phases |
| Product Spec | `docs/PRODUCT_SPEC.md` | Detailed product architecture |
| API Contract | `docs/UI_CONTRACT_2026-04-13.md` | REST API specification |
| Tax/Medical Research | `docs/Ideas/Local AI for Tax and Medical Explainability.md` | Use case research |
