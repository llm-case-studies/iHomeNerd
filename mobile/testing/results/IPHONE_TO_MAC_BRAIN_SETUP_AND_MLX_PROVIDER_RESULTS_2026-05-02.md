# iPhone-to-Mac Brain Setup and MLX Provider Test Results

**Date:** 2026-05-02
**Time run:** ~11:30 EDT (initial, static), ~12:00 EDT (retest against 94350ec with live backend)
**Tester:** DeepSeek/OpenCode (Mac mini M1)
**Request ref:** `mobile/testing/requests/IPHONE_TO_MAC_BRAIN_SETUP_AND_MLX_PROVIDER_TEST_REQUEST_2026-05-02.md`
**Branch under test:** `feature/iphone-mac-brain-setup` at `94350ec` (retest, includes `7ca398b` MLX provider routing)

---

## 1. Environment

| Field | Value |
|---|---|
| **Tester host** | iMac-Debian.local (this machine) |
| **Tester IP** | `192.168.0.221` |
| **iPhone IP** | `192.168.0.220` |
| **iPhone hostname** | `iphone` |
| **iPhone build** | `main` branch (does NOT have Mac setup routes) |
| **Local backend** | Started from feature branch source at `94350ec`, port `:17790` |
| **Repo HEAD (retest)** | `feature/iphone-mac-brain-setup` at `94350ec` |
| **New commits since initial** | `7ca398b` (Add MLX text provider routing), `94350ec` (Request testing for iPhone-led Mac setup) |
| **Test method** | Live HTTP + fake MLX sidecar on `127.0.0.1:11435` |

---

## 2. What Changed Between 446b5b2 and 94350ec

Commit `7ca398b` added exactly the pieces the initial test flagged as missing. 14 files changed, +370/-52 lines.

### New file: `backend/app/llm.py` (234 lines)

Provider-neutral LLM client with:

| Component | Description |
|---|---|
| `_active_provider()` | Returns `"mlx"` when `IHN_LLM_PROVIDER` is `mlx`/`mlx_macos`/`mlx-lm`/`mlx_lm`; else `"ollama"` |
| `provider_name()` | Returns configured provider name (`"mlx"` or `"ollama"`) |
| `backend_name()` | Returns user-facing name (`"mlx_macos"` or `"ollama"`) |
| `_check_mlx_health()` | Probes `{mlx_server_url}/v1/models` for OpenAI-compatible model list |
| `check_health()` | Returns `{ok, provider, backend, models, chatModel, mlx: {...}, ollama: {...}}` |
| `resolve(tier)` | Resolves a capability tier to the active provider's best model |
| `_mlx_chat(messages, model, tier)` | Posts to `{mlx_server_url}/v1/chat/completions` in OpenAI format |
| `chat()` / `generate()` | Routes to either Ollama or MLX sidecar based on active provider |
| `_content_text()` | Normalizes OpenAI content fields (string, list, dict) into plain text |

### Config additions (`backend/app/config.py`)

```python
llm_provider: str  = os.environ.get("IHN_LLM_PROVIDER", "ollama")
mlx_server_url: str = os.environ.get("IHN_MLX_SERVER_URL", "http://127.0.0.1:11435")
mlx_model: str      = os.environ.get("IHN_MLX_MODEL", "mlx-community/gemma-4-e2b-it-4bit")
```

### Main app changes (`backend/app/main.py`)

- `import ollama` → `import llm` throughout
- `/health` now includes `llm` sub-object: `{ok, provider, backend, model}`
- `/health` `providers` dynamic: `["mlx_macos"]` when MLX, `["gemma_local"]` when Ollama
- `/discover` now includes `llm_provider` and `llm_backend` fields
- Startup logging uses `llm.backend_name()`

### Capabilities changes (`backend/app/capabilities.py`)

- `discover()` takes optional `llm_health` dict to avoid double-probing
- All text capabilities (`chat`, `translate_text`, `summarize_document`, etc.) now include `extra` dict with:
  ```json
  {"backend": "mlx_macos", "provider": "mlx", "endpoint": "/v1/chat"}
  ```
- `chat` capability includes `loaded_pack_name` when MLX provider is active
- `/capabilities` response includes `llm` sub-object

### Domain router changes

- `language.py`, `investigate.py`, `agents.py`, `docs.py`, `builder.py`, `pronunco.py` all migrated from `import ollama` to `from ..llm import generate, chat as llm_chat`

### New test file: `backend/tests/test_llm_provider.py` (46 lines)

Tests OpenAI payload parser, MLX model resolution, and content normalization.

---

## 3. iPhone Pre-flight — PARTIAL

iPhone is REACHABLE at `192.168.0.220` but is running a **non-feature-branch build** (likely `main`). The Mac setup routes are not deployed.

| Endpoint | Result |
|---|---|
| `GET /health` (TLS :17777) | 200 — OK (`providers: ["ios_local"]`) |
| `GET /capabilities` (TLS :17777) | 200 — `chat.backend: "mlx_ios"`, `chat.endpoint: "/v1/chat"`, `chat.available: true` |
| `POST /v1/chat` (TLS :17777) | 502 — `"MLX inference failed: Model not loaded."` (model not loaded, correct error) |
| `GET /setup/ca.crt` (HTTP :17778) | 200 — valid PEM |
| `GET /setup/trust-status` (HTTP :17778) | 200 — `status: "trusted"`, CA fingerprint unchanged from 2026-04-29 |
| `GET /setup/mac` (HTTP :17778) | **404** — not on this iPhone build |
| `GET /setup/mac/manifest` (HTTP :17778) | **404** — not on this iPhone build |

### iPhone /health (live)

```json
{
    "available_capabilities": ["text_to_speech", "speech_to_text", "transcribe_audio", "analyze_image", "chat"],
    "binding": "0.0.0.0",
    "hostname": "iphone",
    "models": {},
    "network_ips": ["192.168.0.220"],
    "ok": true,
    "ollama": false,
    "port": 17777,
    "product": "iHomeNerd",
    "providers": ["ios_local"],
    "status": "ok",
    "version": "0.1.0-dev-ios"
}
```

### iPhone /capabilities chat (extract)

```json
{
    "chat": {
        "available": true,
        "backend": "mlx_ios",
        "endpoint": "/v1/chat"
    }
}
```

### CA Fingerprint (still stable)

```
50:67:99:18:61:C9:5E:3F:1A:01:18:62:2B:13:F7:3A:BC:98:3F:1B:E1:C2:48:43:BE:C5:9B:DF:0F:16:3F:D5
```
Matches the 2026-04-29 run — delta #3 (CA fingerprint stability) confirmed.

---

## 4. Live Backend Test Against 94350ec with Fake MLX Sidecar

### 4.1 Test Setup

A fake Python HTTP server was run on `127.0.0.1:11435` implementing the MLX
sidecar's OpenAI-compatible API:

- `GET /v1/models` → returns model list with `mlx-community/gemma-4-e2b-it-4bit`
- `POST /v1/chat/completions` → returns `[FAKE MLX: model=X] I received: <prompt>`

The backend was started with:
```
IHN_LLM_PROVIDER=mlx
IHN_MLX_SERVER_URL=http://127.0.0.1:11435
IHN_MLX_MODEL=mlx-community/gemma-4-e2b-it-4bit
IHN_PORT=17790
```

Startup log confirmed:
```
mlx_macos ready: ['mlx-community/gemma-4-e2b-it-4bit']
```

### 4.2 Confirmation 1: /health reports llm.provider=mlx and llm.backend=mlx_macos

```json
{
    "ok": true,
    "llm": {
        "ok": true,
        "provider": "mlx",
        "backend": "mlx_macos",
        "model": "mlx-community/gemma-4-e2b-it-4bit"
    },
    "providers": ["mlx_macos"],
    "models": {
        "translate_text": "mlx-community/gemma-4-e2b-it-4bit",
        "chat": "mlx-community/gemma-4-e2b-it-4bit",
        "summarize_document": "mlx-community/gemma-4-e2b-it-4bit",
        "extract_lesson_items": "mlx-community/gemma-4-e2b-it-4bit",
        "chat_persona": "mlx-community/gemma-4-e2b-it-4bit",
        "dialogue_session": "mlx-community/gemma-4-e2b-it-4bit",
        "dialogue_turn": "mlx-community/gemma-4-e2b-it-4bit",
        "query_documents": "mlx-community/gemma-4-e2b-it-4bit"
    },
    "ollama": false
}
```

**Verdict: PASS** `llm.provider=mlx`, `llm.backend=mlx_macos`, `providers: ["mlx_macos"]` ✓

Also verified with no sidecar running: `/health` reports `llm.ok: false`, `llm.backend: "mlx_macos"`, `providers: []` (still correctly reports backend name even when unreachable).

### 4.3 Confirmation 2: /capabilities chat has backend/provider/endpoint metadata

```json
{
    "chat": {
        "available": true,
        "model": "mlx-community/gemma-4-e2b-it-4bit",
        "tier": "medium",
        "core": true,
        "backend": "mlx_macos",
        "provider": "mlx",
        "endpoint": "/v1/chat",
        "loaded_pack_name": "mlx-community/gemma-4-e2b-it-4bit"
    }
}
```

All text-generation capabilities (`translate_text`, `summarize_document`, `extract_lesson_items`,
`chat_persona`, `dialogue_session`, `dialogue_turn`, `query_documents`) carry the same
`backend`/`provider`/`endpoint` metadata. System capabilities (`ingest_folder`, `investigate_*`)
do not — correct, they're not LLM-driven.

The `/capabilities` response also includes the top-level `llm` sub-object:
```json
{
    "llm": {
        "ok": true,
        "provider": "mlx",
        "backend": "mlx_macos",
        "model": "mlx-community/gemma-4-e2b-it-4bit"
    }
}
```

**Verdict: PASS** ✓

### 4.4 Confirmation 3: POST /v1/chat returns fake MLX response through the MLX sidecar

`POST /v1/chat` with `{"messages": [{"role": "user", "content": "What device are you?"}]}`:

```json
{
    "response": "[FAKE MLX: model=mlx-community/gemma-4-e2b-it-4bit] I received: What device are you?"
}
```

The fake sidecar logged the request, confirming the backend routed through the MLX sidecar
correctly. The call path:

```
POST /v1/chat → language.py:chat_endpoint() → llm.chat(messages, tier="medium")
→ _active_provider() returns "mlx"
→ _mlx_chat(messages, model="mlx-community/gemma-4-e2b-it-4bit")
→ POST http://127.0.0.1:11435/v1/chat/completions
→ [FAKE MLX response]
```

`POST /v1/translate` also routes through the fake MLX sidecar:

```json
{
    "translation": "[FAKE MLX: model=mlx-community/gemma-4-e2b-it-4bit] I received: Translate the following from en to es...",
    "source": "en",
    "target": "es"
}
```

**Verdict: PASS** — end-to-end MLX sidecar routing confirmed ✓

### 4.5 Error handling without MLX sidecar

When the backend is configured with `IHN_LLM_PROVIDER=mlx` but no sidecar is running:

| Path | Behavior |
|---|---|
| `/health` `llm.ok` | `false` (correct) |
| `/health` `providers` | `[]` (correct — no provider available) |
| `/capabilities` chat `available` | `false` (correct — no model) |
| `POST /v1/chat` | 500 `RuntimeError: No MLX model available for tier 'medium'.` |

The 500 on chat is a gap: this should return a 502 with a JSON `{"detail": "..."}` body
matching the iOS contract. Currently it raises an unhandled `RuntimeError`.

### 4.6 Contract mismatch: iOS vs Python /v1/chat body shape

| Field | iOS (`mlx_ios`) | Python Backend (`language.py`) |
|---|---|---|
| Request body | `{"prompt": "..."}` | `{"messages": [{"role": "user", "content": "..."}]}` |
| Success response | `{"text": "...", "processingTime": ..., "tokensPerSecond": ..., "model": "...", "backend": "mlx_ios"}` | `{"response": "..."}` |
| Error response | `{"detail": "..."}` 502 | Unhandled exception 500 |

The iOS and Python backends have different `/v1/chat` contracts. The Python backend
expects the OpenAI `messages` format; iOS uses a simple `prompt` format. The Python
backend's `/v1/chat` response shape is `{"response": "..."}` while iOS uses
`{"text": "...", "processingTime": ..., "tokensPerSecond": ..., "model": "...", "backend": "mlx_ios"}`.

---

## 5. /discover LLM Metadata 

```json
{
    "product": "iHomeNerd",
    "version": "0.1.0",
    "role": "brain",
    "hostname": "iMac-Debian",
    "ollama": false,
    "llm_provider": "mlx",
    "llm_backend": "mlx_macos",
    "models": ["mlx-community/gemma-4-e2b-it-4bit"]
}
```

**Verdict: PASS** — `/discover` correctly reports `llm_provider` and `llm_backend` ✓

---

## 6. iPhone /setup/mac BLOCKED (Not Deployed)

The iPhone at `192.168.0.220` is running a `main`-branch build that does not include
the Mac setup routes. Both `/setup/mac` and `/setup/mac/manifest` return 404.

The existing bootstrap routes work correctly:
- `/setup/ca.crt` → 200, valid PEM
- `/setup/trust-status` → 200, `status: "trusted"`
- `/setup/ihomenerd.mobileconfig` → 200

This section remains **BLOCKED** until the feature branch is deployed to the iPhone.

**Note:** This is not a failure — it's a deployment status issue. The feature branch
code (NodeRuntime.swift lines 813-816) defines the routes correctly, as confirmed by
static analysis in the initial test run.

---

## 7. Home CA Private Key Exposure (Re-audited)

The feature branch continues to have zero CA private key exposure:

| Surface | Key Material | Verdict |
|---|---|---|
| `llm.py` | No key references | Safe |
| `/health` `llm` sub-object | Only `provider`, `backend`, `model` | Safe |
| `/capabilities` `llm` sub-object | Only `ok`, `provider`, `backend`, `model` | Safe |
| `/discover` | Only `llm_provider`, `llm_backend` strings | Safe |
| All `/setup/*` routes | Unchanged since initial audit | Safe |

No regression. The provider routing code operates entirely on public LLM metadata,
not on certificate material.

---

## 8. Summary

```
Test Mode:              LIVE HTTP (backend) + FAKE MLX SIDECAR
iPhone /setup/mac:      BLOCKED (iPhone on non-feature-branch build)
iPhone other routes:    PASS (all existing routes healthy)

MLX /health metadata:   PASS — llm.provider=mlx, llm.backend=mlx_macos ✓
MLX /capabilities:      PASS — chat has backend/provider/endpoint ✓
MLX /v1/chat routing:   PASS — fake sidecar receives backend chat ✓
MLX /v1/translate:      PASS — also routes through MLX sidecar ✓
MLX /discover:          PASS — llm_provider + llm_backend fields ✓
Error handling:         GAP — no-sidecar chat raises unhandled RuntimeError → 500
iOS contract mismatch:  GAP — different body shapes for /v1/chat
CA key exposure:        PASS — no regression
```

### Key Findings (Updated)

| # | Finding | Severity | Status vs Initial |
|---|---|---|---|
| 1 | `IHN_LLM_PROVIDER`/`IHN_MLX_SERVER_URL`/`IHN_MLX_MODEL` now consumed by `llm.py` and `config.py` | N/A | **RESOLVED** — was Gap #1 |
| 2 | `/health` reports `llm.provider=mlx`, `llm.backend=mlx_macos`, `providers: ["mlx_macos"]` | N/A | **RESOLVED** — was Gap #2 |
| 3 | `/capabilities` text capabilities now have `backend`/`provider`/`endpoint` metadata | N/A | **RESOLVED** — was minor delta #3 |
| 4 | `POST /v1/chat` routes through MLX sidecar via `language.py` | N/A | **RESOLVED** — was Gap #4 |
| 5 | No-sidecar chat raises unhandled RuntimeError → 500; should return 502 with JSON detail | Medium | **New** |
| 6 | iOS `/v1/chat` uses `{"prompt":"..."}` → `{"text":...,"backend":"mlx_ios"}`; Python uses `{"messages":[...]}` → `{"response":"..."}` | Medium | **New** |
| 7 | iPhone `/setup/mac` and `/setup/mac/manifest` are 404 — iPhone runs non-feature-branch build | Info | BLOCKED |
| 8 | iPhone CA fingerprint stable across weeks: same value as 2026-04-29 | Good | Confirmed |

---

## 9. Recommendations

1. **Add try/except to `language.py:chat_endpoint`** — catch `RuntimeError` from `llm.chat()` and return a 502 with `{"detail": "..."}` JSON body matching the iOS error contract.

2. **Align `/v1/chat` contracts** — decide on either `{"prompt":"..."}` with structured response (iOS style) or `{"messages":[...]}` with `{"response":"..."}` (current Python style). The capability `extra.endpoint="/v1/chat"` advertises the endpoint exists but doesn't document the body contract.

3. **Deploy feature branch to iPhone** — the Mac setup routes were confirmed present in static analysis but are not live on the device. The next deployment cycle should include these routes.

4. **Test no-sidecar error path** — verify that when the MLX sidecar is unreachable, `/v1/chat` returns a 502 (not 500) with a descriptive JSON detail body.

5. **Run `test_llm_provider.py`** — the new unit tests should pass in CI against the feature branch source.

---

## 10. Runtime-Side Changes Required?

**No.** All findings are either resolved (gaps 1-4 from initial test are now addressed
by commit `7ca398b`) or are new observations about contract alignment and error handling
that should be addressed in future commits. No runtime implementation files were edited
during this retest.

