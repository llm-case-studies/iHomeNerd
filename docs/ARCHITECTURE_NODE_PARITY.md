# iHomeNerd — Node Architecture & Cross-Platform Parity

**Status:** Living document — update when parity expectations change.
**Owners:** Claude (principal). Implementations live across `frontend/`, `mobile/ios/`, `mobile/android/`, `backend/`.
**First written:** 2026-05-02.

---

## 1. The principle

iHomeNerd ships as a **fleet of nodes**: iPhones, Androids, Mac minis, SBCs (Orange Pi, etc.), x86 Linux hosts. The fleet's job is to serve **household devices** — TVs, tablets, an unbranded laptop in a hotel, a phone tethered over a flight Wi-Fi — with local brain capabilities.

The browser experience is the **product surface**, not a debug page. A user opens `https://<any-ihn-node>:17777/` from any household device and gets the same interactive Command Center. Different nodes may deliver that experience using different runtimes (MLX-Swift on iOS, LiteRT-LM on Android, Ollama or MLX-Python on backend) but **the browser-visible surface is uniform**.

Rule: **everything above the HTTP line is the same; everything below is platform-allowed.**

---

## 2. The node contract — what every iHN node MUST serve

Any new platform earns the "iHN node" label by implementing this contract.

### 2.1 The static SPA bundle (above the line)

Single canonical source: `frontend/` (Vite + React 19 + Tailwind 4 + react-router). Built output: `backend/app/static/{index.html, assets/*.js, assets/*.css}`.

Every node serves a byte-identical bundle from this single build. **No per-platform forks of the SPA.** One source of truth.

| Path | Method | Behavior |
|---|---|---|
| `/` | GET | Returns the SPA `index.html` |
| `/assets/<file>` | GET | Returns the hashed JS / CSS / image asset |
| Any other non-API path | GET | SPA fallback — returns `index.html` so the React router can take over (so deep links work) |

### 2.2 The HTTP API contract (above the line)

These endpoints have **one shape across platforms**. Divergent shapes — for example today's iOS `/v1/chat` accepting `{prompt}` while Android's accepts `{messages}` — are bugs to be fixed, not platform features.

| Path | Method | Request | Response |
|---|---|---|---|
| `/health` | GET | — | `{ok, status, product, version, ...}` |
| `/discover` | GET | — | Identity bundle for advertisement (host, ip, port, role, capabilities) |
| `/capabilities` | GET | — | What this node can do, with backend hints per capability |
| `/system/stats` | GET | — | Uptime, memory, thermal, battery (where applicable), device-state |
| `/v1/models` | GET | — | `{available: [...], loaded, backend}` |
| `/v1/models/load` | POST | `{model_id}` | `{loaded, load_time_seconds, backend}` |
| `/v1/chat` | POST | `{messages: [...]}` (canonical); `{prompt}` accepted as legacy fallback for now | `{content, role, text, model, backend, ...timing}` (superset shape) |
| `/v1/transcribe-audio` | POST | multipart audio | `{text, language, segments, ...}` |
| `/v1/vision/ocr` | POST | multipart image | `{text, model, ...}` |

(Append-only fields are allowed without a contract version bump. Renaming or removing fields is a breaking change.)

### 2.3 The setup channel (below the line, but standard shape)

A node serves trust bootstrap on a separate plain-HTTP port (`:17778` on mobile; varies on backend) so a fresh client can fetch the CA before trusting the main TLS port. The shape of `/setup/*` is standard. The authority that issues the cert (per-device on mobile, per-fleet on backend) varies.

---

## 3. Layering

Three layers per node:

```
┌────────────────────────────────────────────────────────────┐
│  Above the line — IDENTICAL across platforms               │
│  - SPA bundle (built from frontend/)                        │
│  - HTTP contract endpoints (§2.2)                           │
└────────────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────────────┐
│  Adapter — node-specific wiring, conforms to §2.2          │
│  - HTTP server (NWListener / Ktor-style / FastAPI)          │
│  - Asset serving (bundled vs filesystem)                    │
│  - mDNS advertisement                                       │
│  - Trust bootstrap                                          │
└────────────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────────────┐
│  Below the line — platform-allowed differences             │
│  - Inference engine (MLX-Swift, LiteRT-LM, MLX-Python,     │
│    Ollama, future backends)                                 │
│  - On-device storage layout, model cache strategy           │
│  - Hardware-specific optimizations                          │
└────────────────────────────────────────────────────────────┘
```

### Current state by platform

| Platform | HTTP server | SPA serving | Engine layer | Adapter language |
|---|---|---|---|---|
| **Backend** (Linux/macOS host, SBCs, Mac mini brain) | FastAPI + uvicorn | **✅ Present.** `app.mount("/assets", ...)` + `spa_root` route in `backend/app/main.py` | `backend/app/llm.py` provider abstraction (MLX-Python, Ollama, others) | Python |
| **iOS** (iPhone, iPad) | `mobile/ios/.../NodeRuntime.swift` (Network.framework, NWListener, TLS via Home CA) | **❌ Missing.** 8-line stub `indexHTML` at `/` | `MLXEngine.swift` (mlx-swift, mlx-swift-lm), `WhisperEngine`, `OCREngine` | Swift |
| **Android** | `mobile/android/.../LocalNodeRuntime.kt` (custom socket server) | **❌ Missing.** Inline `commandCenterHtml()` dashboard, no SPA. Plumbing for bundled assets exists (`serveBundledCommandCenterAsset`) but no assets are bundled. | `AndroidChatEngine.kt` (LiteRT-LM), local Whisper variant | Kotlin |

### Allowed optimizations below the line (non-exhaustive)

- iOS may use `MLX.Memory.clearCache()` between model swaps (Kimi's recipe, `docs/MLX_MODEL_SWITCH_MEMORY_RECIPE.md`).
- Android may use LiteRT-LM GPU delegate where supported.
- Backend may pool model containers across requests in a way mobile cannot.
- Any platform may declare hardware-specific accelerators via `/capabilities` so the SPA can hint quality modes accordingly.

### Forbidden above the line

- **No platform-specific SPA forks.** No "iOS index.html" or "Android index.html"; one bundle, three transports.
- **No platform-specific endpoint shapes.** The current iOS `prompt` vs Android `messages` divergence is a bug.
- **No client-side hard-coded knowledge of who serves what.** Clients (the SPA, external testers) read `/capabilities` and dispatch by what's advertised, not by user-agent or hostname.

---

## 4. Build & distribution

Single build pipeline; one source of truth.

```
frontend/  ──[vite build]──>  backend/app/static/  ──┬── served by FastAPI as-is
                                                     ├── copied to mobile/ios/.../Resources/Console/
                                                     └── copied to mobile/android/.../assets/console/
```

Implementation: `scripts/build-frontend.sh` runs `vite build`, then mirrors the output into the iOS Resources folder and Android assets folder. Run before each mobile build (manually for now; eventually a pre-build phase in Xcode and a Gradle task).

The mobile adapters serve these files at `/` and `/assets/*`:
- **Backend** already does this via `StaticFiles` + `spa_root`.
- **Android**: `serveBundledCommandCenterAsset` plumbing already exists — needs the assets actually placed in `assets/console/`, plus a routing tweak that prefers them over the inline `commandCenterHtml()` fallback.
- **iOS**: new — `NodeRuntime.swift` reads from the app bundle's `Console/` folder and emits the correct MIME types per file extension.

---

## 5. Why this initiative exists right now

The `/v1/models` and `/v1/models/load` endpoints landed in `feature/mlx-llm-engine` (commit `3318276`) so the SPA can let users switch models. But the SPA isn't currently *served* from iOS or Android — only from backend nodes. So the model-switch feature has nowhere to live in the browser experience for two of three node types.

Closing that gap is the trigger for this initiative. The model-selection panel is the first concrete consumer of the new endpoints, and it lights up uniformly on every node the moment the bundle reaches them.

---

## 6. Roadmap

**Phase 1 — uniform web UI (this initiative):**
- [x] Architecture doc (this file)
- [ ] `scripts/build-frontend.sh` build pipeline (Codex)
- [ ] iOS `NodeRuntime.swift` SPA serving (Claude)
- [ ] Android `LocalNodeRuntime.kt` SPA serving + drop the inline `commandCenterHtml()` fallback once parity verified (Codex)
- [ ] Model-selection panel in `frontend/src/components/` (Qwen)
- [ ] Cross-platform parity test (DeepSeek): same SPA bundle hash served, same `/capabilities` shape, same `/v1/chat` round-trip on iOS/Android/backend

**Phase 2 — contract unification:**
- [ ] iOS `/v1/chat` accepts `{messages}` canonical form (today: only `{prompt}`)
- [ ] Response shape unification across iOS/Android: `content` + `text` both present so older SPA versions still work
- [ ] `IhnEngineError` taxonomy (Task #1, Qwen's design `docs/ERROR_TAXONOMY_DESIGN.md`)

**Phase 3 — third-platform onboarding:**
- [ ] Orange Pi / SBC profile: reuse FastAPI as the adapter? (Likely yes — Linux + Python is straightforward.)
- [ ] Mac mini brain (Codex's iphone-led setup): adapter language confirm — reuse FastAPI vs a native Swift adapter?
- [ ] Document each new platform under §3 "Current state by platform" as it lands.

---

## 7. Open questions

1. **Asset bundle vs build-time embed for iOS** — `Resources/Console/` folder vs an embedded `.bundle`? `Resources/` is simpler; `.bundle` keeps things namespaced. Lean: `Resources/Console/`, decide for real when implementing.
2. **Live reload during frontend dev** — when working on the SPA, does the mobile adapter serve from a Vite dev-server proxy, or do we always `vite build`? Lean: always build for fewer moving parts; reconsider if it slows the inner loop unacceptably.
3. **Versioning the SPA** — should `/health` advertise the bundle hash so a client can detect a stale node? Useful for "is this iPhone serving an old version?" debugging.
4. **Mac mini brain's contract** — Codex's iphone-led-mac-brain-setup flow implies the Mac will host the same SPA + endpoints. Confirm before that track diverges further.
5. **Where does `/setup/mac` (iPhone-only) belong?** It's currently iOS-specific. Per the rule "no client hard-coded knowledge of who serves what", should it live behind a `/capabilities` flag like `mac_setup_concierge: true` that only iPhones advertise?

---

## 8. Operating principle for copilots working under this doc

When a copilot is briefed on a slice of this initiative, the brief cites this doc and the copilot's fence is **whatever is consistent with the contract here**. If a copilot wants to deviate from the contract, the answer is to update *this doc* first (with reasoning), then implement. Implementation that contradicts the doc is rejected even if it works locally.

The doc is the fence. The branch is just where the work lands.
