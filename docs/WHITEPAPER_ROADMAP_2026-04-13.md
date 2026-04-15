# iHomeNerd: Whitepaper & Roadmap

**Date:** 2026-04-13
**Status:** Living document — evolves with each sprint
**Companion:** `UI_CONTRACT_2026-04-13.md` (frontend ↔ backend API contract)

---

## 1. Executive Summary

iHomeNerd is a **local AI brain** that runs on your home or office network. Unlike cloud AI services, everything stays on your hardware — documents, conversations, recordings, and investigation results never leave your machine.

The product exposes seven capability domains through a single dashboard and REST API. Third-party apps (PronunCo, TelPro-Bro, iScamHunter, iMedisys, WhoWhe2Wha, On-My-Watch, and others) integrate as plugins, but iHomeNerd is valuable on its own from day one.

### One-liner

> **One brain, seven skills, many apps — all local, all private, all yours.**

---

## 2. The Seven Capability Domains

### 2.1 Chat (Reactive Q&A)

**What:** General-purpose local AI chat. You ask, it answers.

**How it works:**
- Stateful multi-turn conversations maintained in-session
- Markdown rendering (bold, lists, code blocks)
- Model tier: Medium (Gemma 4 E2B default)

**Standalone value:**
- Private alternative to ChatGPT — no account, no history leaving the machine
- Explain code, draft emails, brainstorm ideas, debug errors

**App integrations:**

| App | Use case |
|---|---|
| **PronunCo** | Language practice persona (`chat_persona`) |
| **TelPro-Bro** | Script improvement, clarity rewrites (`chat_persona`) |
| **iMedisys** | "Ask Your Doctor" script generation from bill analysis |
| **WhoWhe2Wha** | Natural-language graph queries (offline fallback for Gemini) |
| **ActCLI-HIC** | "Why is my fan running loud?" diagnostic Q&A |
| **iEmbro-S** | Design consultation, material recommendations |
| **Onboard-Studio** | "What does this config setting do?" migration guidance |
| **On-My-Watch** | "The Watcher" AI chat — property Q&A, alert triage, camera reasoning (replaces browser WebLLM, 15× faster via GPU) |

---

### 2.2 Translate

**What:** Local text translation. No API key, no tracking, no quota.

**How it works:**
- Source language auto-detection or manual selection
- Any language pair supported by the model
- Model tier: Light (TranslateGemma / Gemma 4 E2B)

**Standalone value:**
- Translate snippets, documents, clipboard contents
- No per-character billing, no data leaving the machine

**App integrations:**

| App | Use case |
|---|---|
| **PronunCo** | Lesson content translation, drill localization |
| **TelPro-Bro** | Report card localization (RFC-005) |
| **WhoWhe2Wha** | Multi-language event descriptions |
| **iScamHunter** | Translate scam site content for cross-language pattern matching |
| **iMedisys** | Medical code translation to layman terms (CPT/ICD-10 → plain language) |
| **iEmbro-S** | Pattern instructions in multiple languages |
| **On-My-Watch** | Translate property inspection reports, auction listings for multilingual investors |

---

### 2.3 Talk (Voice Pipeline)

**What:** Full voice conversation — ASR → brain → TTS in a loop.

**How it works:**
- **ASR:** Whisper (faster-whisper, CPU int8, small model)
- **Brain:** Gemma 4 via Ollama (GPU)
- **TTS:** Kokoro 82M ONNX (CPU), 54 voices × 9 languages
- Browser captures audio via MediaRecorder (WebM/opus)
- Returned WAV played via `<audio>` element

**Standalone value:**
- Voice-driven local AI — talk to your Nerd hands-free
- Transcribe meetings, recordings, voice memos
- Generate speech in multiple languages and voices

**App integrations:**

| App | Use case |
|---|---|
| **PronunCo** | Language practice dialogue (scenario mode), pronunciation drill audio |
| **TelPro-Bro** | Practice recording → transcript → delivery analysis |
| **WhoWhe2Wha** | Voice dictation for event entry (currently uses browser Speech API) |
| **On-My-Watch** | Voice commands for camera control ("show me the driveway", "what happened last night?"), spoken alert summaries |

---

### 2.4 Docs (Document Copilot)

**What:** RAG over local document collections. Ask questions about your own files.

**How it works:**
- User points Nerd at folders (taxes, bills, medical, receipts)
- Folder watcher → PDF extraction (PyMuPDF) → OCR (Gemma 4 multimodal) → chunking → embedding (nomic-embed-text) → vector DB (ChromaDB / SQLite-vec)
- Query: user asks question → retrieve top-k chunks → Gemma 4 generates answer with source citations

**Standalone value — the killer feature:**
- **Tax copilot:** Ask questions about returns, W-2s, 1099s, donation receipts
- **TurboTax chooser:** Short interview recommends the right filing tier
- **Bill search:** "How much did I spend on dental in 2025?"
- **Office knowledge brain:** Search contracts, procedures, policy docs

**App integrations:**

| App | Use case |
|---|---|
| **iMedisys** | Parse clinical summaries, explain bills, flag denial risks |
| **iScamHunter** | Analyze suspicious invoices, contracts, emails for fraud indicators |
| **WhoWhe2Wha** | Auto-extract appointments from email PDFs into 4W nodes |
| **Onboard-Studio** | Understand config files and docs during machine migration |
| **TelPro-Bro** | Search internal scripts, presentation notes |
| **On-My-Watch** | RAG over property records — inspection reports, title docs, HOA rules, insurance policies. "Does the roof warranty cover hail?" |

---

### 2.5 Investigate (Active Intelligence Gathering)

**What:** iHomeNerd goes out and **discovers things** — scans, probes, catalogs, flags anomalies.

This is fundamentally different from passive Q&A. The Nerd acts as an autonomous investigator that collects evidence and presents findings in plain language.

**How it works:**
- **Network scanner:** ARP/mDNS scan → device inventory with OS fingerprinting
- **Device auditor:** Query firmware versions, storage usage, update availability, open ports
- **Site prober:** HTTP headers, SSL cert chain validation, WHOIS domain age, DNS records, security header analysis (CSP, HSTS, X-Frame-Options)
- **Continuous monitor:** Watch for state changes (new device on network, cert expiry approaching, storage filling up)
- All results cataloged in local DB with timestamps and diff history

**Standalone value:**

| Investigation type | Example output |
|---|---|
| **Home network inventory** | "12 devices found. NAS firmware is 2 versions behind. Printer has default admin password." |
| **Storage audit** | "iMac: 847 GB free. MSI: 4.8 GB free on /home — critical. NAS: 78% full, 3 months at current growth." |
| **Site security probe** | "Domain registered 18 days ago. SSL cert issued by Let's Encrypt 3 days ago. No CSP header. No HSTS. Missing DMARC record." |
| **Update tracker** | "3 devices need firmware updates. Router CVE-2026-1234 patch available since March." |

**App integrations:**

| App | Use case |
|---|---|
| **iScamHunter** | Probe suspected scam sites — domain age, cert validity, missing security controls. Auto-populate scammer DB candidates. "Site pretends to be a bank but was registered last month with a free cert — flagged." |
| **ActCLI-HIC** | Hardware health monitoring — SMART disk status, thermal readings, driver versions. Translates raw `lspci`/`sensors` into plain English. |
| **Onboard-Studio** | Pre-migration device audit — what's connected, what needs backup, what's running |
| **iMedisys** | Cross-reference billing code patterns against known denial databases |
| **On-My-Watch** | Camera/NVR discovery on network (Frigate, ONVIF devices), firmware health checks, storage monitoring for DVR/NAS recording targets |

**Technical implementation:**
- Network: `python-nmap`, `scapy`, or native `arp`/`ping` + mDNS browse
- SSL/site: `ssl` stdlib + `whois` + `httpx` header inspection
- Device health: SNMP, SSH probes, or platform-specific APIs
- Results stored in SQLite with change history for diffing

---

### 2.6 Agents (Autonomous Dialogue & Interaction)

**What:** iHomeNerd **talks to things on your behalf** — runs multi-turn conversations with a strategy and a goal, not driven turn-by-turn by the user.

This is the proactive counterpart to Chat and Talk. Where Chat waits for your questions and Talk follows your lead, Agents pursue objectives autonomously.

**How it works:**
- Agent = system prompt (persona + goal + constraints) + conversation loop + exit criteria
- Each agent session has: purpose, turn budget, success criteria, escalation rules
- Pipeline: ASR (if voice) → agent brain (Gemma 4) → TTS (if voice) → action
- Agent can escalate to human when uncertain or when goal criteria are met

**Agent types and standalone value:**

#### A. Phone Screener
- Answer incoming VoIP/SIP calls
- Identify caller intent: delivery notification, appointment reminder, sales, scam
- Take messages for legitimate callers
- Waste time for robocallers/scammers (tarpit mode)
- Escalate important calls to user's phone/notification

#### B. Scam Bot Engager (iScamHunter)
- Chat with bots on suspected scam sites
- Document their scripts and social engineering patterns
- Ask probing questions to extract operational details
- Record full transcript as evidence for the scam DB
- Never reveal real user information — uses generated personas

#### C. Practice Partner
- Already implemented for PronunCo (dialogue-session/dialogue-turn)
- Same engine serves TelPro-Bro practice coaching
- Bounded scenarios with turn budgets, difficulty levels, repair hints

#### D. Device Manager
- Voice-driven home automation via conversation
- "Update the NAS firmware" → SSH to device → run update → report result
- "Block that new device on the network" → firewall rule → confirm

#### E. Research Agent
- Autonomous web research with a brief
- Collect, compare, summarize findings
- Cite sources, flag uncertainty
- Output: structured report in Docs collection

**App integrations:**

| App | Use case |
|---|---|
| **iScamHunter** | Scam bot engagement — document scripts, confuse bots, extract intel |
| **PronunCo** | Language practice partner (dialogue scenarios with coaching) |
| **TelPro-Bro** | Delivery practice partner, mock interview agent |
| **iMedisys** | Patient advocacy agent — guide user through insurance appeal script |
| **WhoWhe2Wha** | Scheduling assistant — negotiate appointments via email/chat |
| **On-My-Watch** | Property monitoring agent — autonomous camera patrol, anomaly escalation, daily digest generation |

---

### 2.7 System (Dashboard & Ops)

**What:** Status dashboard showing what the Nerd is running, which apps are connected, and system health.

**Panels:**
- **Ollama status:** green/red, loaded models, VRAM usage
- **TTS status:** Kokoro loaded, voice count, languages
- **ASR status:** Whisper model size, availability
- **Capabilities table:** rows from `/capabilities` — name, available, model, tier
- **Active sessions:** session ID, app, purpose, turn count, age
- **Connected apps:** which apps have recently called `/health`
- **Investigation results:** latest scan findings, alerts, change log
- **Agent activity:** running agents, turn counts, last action

---

## 3. Ecosystem Integration Map

```
                         ┌──────────────────┐
                         │    iHomeNerd     │
                         │   Local Brain    │
                         └────────┬─────────┘
                                  │ REST API (:17777)
     ┌──────────┬──────────┬──────┼──────┬──────────┬──────────┬──────────┐
     │          │          │      │      │          │          │          │
┌────▼───┐ ┌───▼────┐ ┌───▼──┐ ┌─▼─────┐ ┌▼───────┐ ┌▼────────┐ ┌▼────────┐
│PronunCo│ │TelPro- │ │iScam │ │iMedi- │ │WhoWhe  │ │On-My-  │ │ActCLI  │
│        │ │Bro     │ │Hunter│ │sys    │ │2Wha    │ │Watch   │ │Onboard │
└────────┘ └────────┘ └──────┘ └───────┘ └────────┘ └────────┘ └────────┘
Language    Delivery   Scam     Medical    Context    Asset      Hardware
learning    coaching   defense  billing    engine     intel      insight

Plugin:     Plugin:    Plugin:  Plugin:    Plugin:    Plugin:    Plugin:
pronunco    telpro     scam     medisys    w2w        omw        hic
```

### Discovery protocol (all apps)

1. App Settings → "Connect to iHomeNerd" → enter URL or auto-discover via mDNS
2. `GET /health` → confirm Nerd is running, get version
3. `GET /capabilities` → flat boolean map of available skills
4. App enables local mode for matching capabilities
5. Fallback: cloud API / BYOK / browser models

---

## 4. Phased Roadmap

### Phase 1: Foundation (Current → Sprint +2)
**Goal:** Ship the dashboard with immediately useful standalone features.

| Deliverable | Domain | Status |
|---|---|---|
| Chat panel (general Q&A) | Chat | Backend ✅, UI needed |
| Translate panel | Translate | Backend ✅, UI needed |
| System panel (status dashboard) | System | Backend ✅, UI needed |
| Talk panel (voice pipeline) | Talk | ASR ✅, TTS ✅, Brain ✅, UI needed |
| Dashboard shell (tab navigation, dark theme) | All | UI needed |
| Frontend ↔ backend API contract | All | This document |

**Phase 1 integration milestone:** PronunCo companion works end-to-end through the dashboard (lesson extract, dialogue, TTS). On-My-Watch can call `/v1/chat` for "The Watcher" AI, replacing browser WebLLM with GPU inference (15× speedup).

### Phase 2: Documents (Sprint +3 → +5)
**Goal:** Ship the killer standalone feature — document copilot.

| Deliverable | Domain | Status |
|---|---|---|
| Document ingestion pipeline (PDF → chunks → embeddings) | Docs | Architecture in PRODUCT_SPEC |
| Collection management (folders, watch, re-scan) | Docs | Schema designed |
| RAG query endpoint (`/v1/docs/ask`) | Docs | Not started |
| Docs panel in dashboard | Docs | UI spec needed |
| Tax copilot demo flow | Docs | Use case documented |
| OCR via Gemma 4 multimodal for scanned docs | Docs | Model available |

**Phase 2 integration milestone:** iMedisys bill explainer works against local medical docs.

### Phase 3: Investigate (Sprint +6 → +8)
**Goal:** Make the Nerd proactive — it goes out and discovers things.

| Deliverable | Domain | Status |
|---|---|---|
| Network scanner (device inventory) | Investigate | Not started |
| Device health auditor (storage, firmware, updates) | Investigate | Not started |
| Site security prober (SSL, WHOIS, headers) | Investigate | Not started |
| Investigation results DB + change tracking | Investigate | Not started |
| Investigate panel in dashboard | Investigate | Not started |
| Continuous monitoring (watch mode) | Investigate | Not started |

**Phase 3 integration milestone:** iScamHunter can submit URLs for automated security probes. ActCLI-HIC feeds device data into Nerd inventory. On-My-Watch discovers cameras/NVRs on the network and monitors recording storage health.

### Phase 4: Agents (Sprint +9 → +12)
**Goal:** Autonomous dialogue — the Nerd talks to things on your behalf.

| Deliverable | Domain | Status |
|---|---|---|
| Agent framework (session, goal, turn budget, escalation) | Agents | Dialogue session exists (PronunCo) |
| Phone screener (VoIP/SIP integration) | Agents | Not started |
| Scam bot engager | Agents | Not started |
| Practice partner (generalized from PronunCo dialogue) | Agents | Partially built |
| Device manager agent (SSH-based actions) | Agents | Not started |
| Camera patrol agent (OMW autonomous monitoring) | Agents | Not started |
| Agents panel in dashboard | Agents | Not started |

**Phase 4 integration milestone:** iScamHunter can launch bot engagement sessions. TelPro-Bro practice coaching runs as an agent. On-My-Watch camera patrol agent runs autonomous monitoring with escalation.

### Phase 5: Scale & Polish (Sprint +13+)
**Goal:** Multi-Nerd networking, appliance image, marketplace.

| Deliverable | Domain | Status |
|---|---|---|
| Multi-Nerd routing (capability-based) | System | Architecture in PRODUCT_SPEC |
| mDNS/Bonjour auto-discovery | System | Designed |
| Live Companion Image (bootable USB/ISO, bundles PronunCo + TelPro-Bro + WhoWhe2Wha + On-My-Watch) | Deploy | Concept documented |
| Plugin marketplace / registry | System | Not started |
| iOfficeNerd branding + defaults | Product | Planned |

---

## 5. Hardware Targets

| Target | GPU/NPU | Best for | Tiers supported |
|---|---|---|---|
| **RTX 4070 8GB** (current: MSI Raider) | 8 GB VRAM | Development, full stack | Tiny through Medium, Detection, Transcription, TTS |
| **RTX 3090/4090 24GB** | 24 GB VRAM | Heavy tier, multi-model | All tiers including Heavy |
| **Apple Silicon 32GB+** | Unified memory | Consumer power users | All tiers via MLX/llama.cpp |
| **OrangePi 5 Plus** | RK3588 NPU | Edge appliance, detection only | Detection, Light routing, TTS |
| **Any CPU-only machine** | None | Translate + Transcribe + TTS only | Light, Transcription, TTS (no GPU chat) |

---

## 6. Privacy & Trust Model

| Principle | Implementation |
|---|---|
| **Nothing leaves the machine** | All inference local. No telemetry. No cloud calls (unless user opts into BYOK). |
| **Localhost by default** | Binds to `127.0.0.1`. LAN mode requires explicit opt-in. |
| **Pairing for LAN** | 6-digit code displayed on Nerd → enter in connecting app. Long-lived token after pairing. |
| **Inspectable** | Open source. User can read every prompt, every model config. |
| **User owns the data** | All storage in `~/.ihomenerd/`. Delete the folder, delete everything. |
| **Investigation data stays local** | Network scans, site probes, agent transcripts — all in local DB only. |

---

## 7. Competitive Position

| Competitor | What they offer | What iHomeNerd does differently |
|---|---|---|
| ChatGPT / Gemini / Claude | Cloud chat + docs | **Everything local. No account. No data leaving.** |
| Home Assistant | Home automation | **AI-native: understands context, not just rules** |
| Yoodli / Speak AI | Cloud delivery coaching | **$0 — your GPU. Full offline.** (via TelPro-Bro plugin) |
| Pi-hole | DNS-level ad blocking | **iHomeNerd Investigate does DNS + active site probing + intelligence** |
| Ollama alone | Model serving | **iHomeNerd is the product layer: UI, plugins, agents, document pipeline** |
| Frigate NVR alone | Object detection | **iHomeNerd adds reasoning: "person with package" vs "person loitering" — intent, not just detection** |

---

## Appendix A: Capability Registry (Full)

```
# Passive / Reactive
chat                    — general Q&A
translate_text          — text translation
summarize_document      — single-doc summary
transcribe_audio        — audio/video to text
synthesize_speech       — text to voice (Kokoro)
query_documents         — RAG over local collections

# Active / Investigative
investigate_network     — scan LAN, catalog devices, flag issues
investigate_site        — probe URL security, WHOIS, cert chain, headers
investigate_device      — storage, firmware, health for a specific device
monitor_continuous      — ongoing watch with change alerts

# Autonomous / Agent
dialogue_agent          — multi-turn conversation with a goal
phone_screener          — answer/screen incoming calls
bot_engager             — autonomous chat with external bots
device_manager          — execute actions on devices via conversation
research_agent          — autonomous web research with structured output

# Vision (On-My-Watch primary consumer)
analyze_video_frame     — caption/describe a frame (replaces WebLLM + Florence-2)
detect_objects          — person/car/package/animal detection (edge stays MediaPipe)
summarize_camera_day    — daily digest from accumulated events
classify_intent         — "delivery" vs "loitering" vs "maintenance" from frame + context

# App-specific (loaded per plugin)
extract_lesson_items    — PronunCo lesson extraction
generate_drill          — PronunCo drill generation
explain_score           — score explanation (PronunCo + TelPro-Bro)
chat_persona            — roleplay persona
analyze_delivery        — TelPro-Bro delivery rubric
store_recording         — multi-device recording sync
camera_patrol           — On-My-Watch autonomous camera monitoring agent
property_report         — On-My-Watch due diligence report generation
```

---

## Appendix B: On-My-Watch Integration — Replacing the Three-Tier AI

On-My-Watch (OMW) is an asset intelligence and video surveillance platform. It currently runs a three-tier AI stack that is a textbook case for iHomeNerd integration.

### Current OMW Architecture (without iHomeNerd)

```
┌─────────────────────────────────────────────────────────┐
│ TIER 1: EDGE — MediaPipe + Coral TPU (30+ FPS)         │
│ "Person detected at front door"                         │
│ ✅ Fast, ✅ Private, ✅ Stays                             │
└───────────────────┬─────────────────────────────────────┘
                    │ Detection event
┌───────────────────▼─────────────────────────────────────┐
│ TIER 2: LOCAL — WebLLM in browser (1–30 seconds/frame)  │
│ "Person carrying package, likely delivery"              │
│ ✅ Private, ❌ Slow (WebGPU bottleneck), ❌ Large models │
│ Models: Phi-3.5-vision, Llama 3.2, Gemma 2, SmolVLM    │
└───────────────────┬─────────────────────────────────────┘
                    │ Low confidence / needs verification
┌───────────────────▼─────────────────────────────────────┐
│ TIER 3: CLOUD — Gemini 2.0 Flash (2–5 seconds)         │
│ "Delivery driver, UPS uniform, setting package down"    │
│ ❌ Data leaves machine, ❌ Requires API key, ❌ Costs $   │
└─────────────────────────────────────────────────────────┘
```

### Target Architecture (with iHomeNerd)

```
┌─────────────────────────────────────────────────────────┐
│ TIER 1: EDGE — MediaPipe + Coral TPU (unchanged)        │
│ Still the fastest path for basic detection               │
└───────────────────┬─────────────────────────────────────┘
                    │ Detection event
┌───────────────────▼─────────────────────────────────────┐
│ TIER 2: iHomeNerd GPU — Gemma 4 E2B (1–2 sec/frame)    │
│ Replaces WebLLM: 15× faster, larger models, multimodal  │
│ ✅ Private, ✅ Fast, ✅ Vision (Gemma 4 multimodal)       │
│ Endpoint: POST /v1/chat (with image attachment)          │
└───────────────────┬─────────────────────────────────────┘
                    │ Optional: high-stakes verification
┌───────────────────▼─────────────────────────────────────┐
│ TIER 3: CLOUD — Gemini (opt-in only, user's BYOK key)   │
│ Only for edge cases where local model is uncertain       │
│ iHomeNerd can proxy this via /v1/chat?tier=cloud         │
└─────────────────────────────────────────────────────────┘
```

### Key Integration Points

| OMW Current Service | File | iHomeNerd Replacement | Endpoint |
|---|---|---|---|
| `localLlmService.ts` (WebLLM text) | `services/localLlmService.ts` | GPU chat via Gemma 4 | `POST /v1/chat` |
| `localLlmService.ts` (WebLLM vision) | `services/localLlmService.ts` | GPU multimodal via Gemma 4 | `POST /v1/chat` (image attachment) |
| `smolVlmService.ts` (Florence-2) | `services/smolVlmService.ts` | GPU vision via Gemma 4 multimodal | `POST /v1/chat` (image attachment) |
| `geminiService.ts` (cloud chat) | `services/geminiService.ts` | Local fallback, cloud opt-in | `POST /v1/chat` (default local) |
| `geminiService.ts` (image risk) | `services/geminiService.ts` | Local multimodal analysis | `POST /v1/chat` (image + risk prompt) |
| `hardwareService.ts` (device tier) | `services/hardwareService.ts` | Capability discovery | `GET /capabilities` |
| `frigateService.ts` (NVR events) | `services/frigateService.ts` | Stays as-is (Frigate is edge) | N/A — Frigate direct |
| `visionService.ts` (MediaPipe) | `services/visionService.ts` | Stays as-is (edge detection) | N/A — browser local |

### Integration Roadmap for OMW

#### Step 1: Add iHomeNerd service adapter (Phase 1)
Create `services/iHomeNerdService.ts` in OMW repo:
- Discover iHomeNerd via mDNS or user-configured URL
- `GET /health` → connection status
- `GET /capabilities` → available features (replaces `hardwareService` tier classification)
- `POST /v1/chat` → text and vision inference (replaces `localLlmService` + `smolVlmService`)

#### Step 2: Wire "The Watcher" chat to iHomeNerd (Phase 1)
- OMW's `chatWithWatcher()` currently calls Gemini
- Add iHomeNerd as preferred backend: `POST /v1/chat` with system prompt from `AGENTS.md`
- Gemini becomes fallback only when iHomeNerd is unavailable

#### Step 3: Replace frame analysis pipeline (Phase 1–2)
- `analyzeLiveFrame()` sends base64 frame + prompt to `POST /v1/chat` with image
- `analyzeSecurityFrame()` routes through iHomeNerd instead of Florence-2
- `generatePropertyReport()` uses local RAG (`POST /v1/docs/ask`) over ingested property docs

#### Step 4: Camera/NVR discovery via Investigate (Phase 3)
- iHomeNerd's network scanner discovers Frigate instances, ONVIF cameras on LAN
- Auto-populates OMW's camera list without manual configuration
- Monitors NVR storage health, alerts when recording disk is filling up

#### Step 5: Camera patrol agent (Phase 4)
- Autonomous agent that watches camera feeds on a schedule
- Generates daily digest: "Quiet night. 3 deliveries. 1 unknown vehicle parked 2 hours."
- Escalates anomalies: "Unknown person tried front door at 3 AM, lingered 4 minutes"
- Voice summary via TTS: morning briefing of overnight activity

### Performance Comparison

| Task | WebLLM (current) | iHomeNerd GPU | Speedup |
|---|---|---|---|
| Text reasoning (Llama 3.2 1B) | ~5 sec | ~0.5 sec | 10× |
| Text reasoning (Llama 3.2 8B) | ~30 sec | ~2 sec | 15× |
| Vision analysis (Florence-2 460MB) | ~8 sec | ~1.5 sec (Gemma 4) | 5× |
| Vision analysis (Phi-3.5-vision) | ~25 sec | ~2 sec (Gemma 4) | 12× |
| Gemini cloud (baseline) | 2–5 sec | N/A (local alternative) | Privacy win |

### Privacy Upgrade

| Scenario | Without iHomeNerd | With iHomeNerd |
|---|---|---|
| "Who's at my door?" | Frame sent to Google Cloud | Frame analyzed on local GPU — never leaves machine |
| Property due diligence | Documents + images sent to Gemini | Local RAG over documents, local vision |
| Pet re-identification | Photos sent to Google for signature | Local embedding comparison |
| Neighborhood intelligence | Google Maps grounding (data to Google) | Local knowledge base (if ingested) or opt-in cloud |
