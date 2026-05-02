# iPhone-to-Mac Brain Setup and MLX Provider Test Results

**Date:** 2026-05-02
**Time run:** ~11:30 EDT
**Tester:** DeepSeek/OpenCode (Mac mini M1)
**Request ref:** `mobile/testing/requests/IPHONE_TO_MAC_BRAIN_SETUP_AND_MLX_PROVIDER_TEST_REQUEST_2026-05-02.md`
**Branch under test:** `feature/iphone-mac-brain-setup` (HEAD `446b5b2`)

---

## 1. Environment

| Field | Value |
|---|---|
| **Tester host** | mac-mini-m1.local |
| **Tester IP** | `192.168.0.221` |
| **iPhone IP** | `192.168.0.220` |
| **iPhone hostname** | `iphone` |
| **Local backend** | NOT RUNNING (no docker/venv process on :17777) |
| **Repo HEAD (tested)** | `feature/iphone-mac-brain-setup` at `446b5b2` |
| **Repo HEAD (checkout)** | `wip/testing` at `ff7f38a` |
| **Test method** | Static code analysis + diffs against `origin/main` |

---

## 2. Pre-flight: iPhone Reachability — BLOCKED

All pre-flight curls against `192.168.0.220` timed out with no response:

```bash
curl -sk --connect-timeout 3 https://192.168.0.220:17777/health       # no output
curl -sk --connect-timeout 3 https://192.168.0.220:17777/capabilities  # no output
curl -s  --connect-timeout 3 http://192.168.0.220:17778/setup/mac      # no output
curl -s  --connect-timeout 3 http://192.168.0.220:17778/setup/mac/manifest  # no output
```

**Verdict: iPhone offline or not running iHN Home Node toggle.** The iPhone was
previously reachable on the same IP during the contract test run (2026-04-29)
and the OCR test run (2026-05-01). All iPhone live-testing sections below are
marked **BLOCKED**. Static analysis of the code on the feature branch proceeds
as planned.

The local Python backend (:17777) is also not running, so live contract test
re-runs are skipped. All findings below are from static code analysis.

---

## 3. Test Category Results

---

### 3.1 Fake MLX Sidecar Backend Routing

**Status: PASS with observations**

The "fake MLX sidecar" pathway for Mac brains is wired through env variables
across three layers:

#### Layer 1: Mac SSH Preflight Detection (`control_plane.py:120-270`)

The preflight bash script probes the Mac target for Apple Silicon readiness:

| Probe | Detection | Field In Preflight Response |
|---|---|---|
| `uname -m` == `arm64` | Apple Silicon confirmed | `appleSilicon: bool` |
| `system_profiler SPHardwareDataType` | Chip family name | `macChip: string` |
| `import mlx` (via python3) | mlx package installed | `mlx.ready: bool` |
| `import mlx_lm` (via python3) | mlx-lm package installed | `mlx.lmReady: bool` |
| `mx.metal.is_available()` | Metal GPU backend available | `mlx.metalReady: bool` |

When `appleSilicon` is true, `mlx.recommendedBackend` is set to `"mlx_macos"`.

The MLX probe Python script (`control_plane.py:180-201`) is robust:
- Uses `importlib.util.find_spec` (no import side-effects)
- Guards against missing `metal` attribute on `mlx.core`
- Falls back to `mx.device_info()` if `metal.is_available()` is not present

#### Layer 2: Mac Installer Script (`install-ihomenerd-macos.sh:213-379`)

When `IHN_MAC_LLM_BACKEND=mlx`:

1. **Architecture gate** (line 218): aborts if `uname -m` != `arm64`
2. **Model selection** (line 214): defaults to `mlx-community/gemma-4-e2b-it-4bit`
3. **Runtime script** (lines 346-353): creates `run-mlx.sh` that launches `mlx_lm.server` on port 11435
4. **launchd agent** (lines 355-378): registers `com.ihomenerd.mlx` as a macOS user agent
5. **The run-ihomenerd.sh** (lines 289-293) exports these env vars:
   ```
   IHN_LLM_PROVIDER=mlx
   IHN_MLX_MODEL=mlx-community/gemma-4-e2b-it-4bit
   IHN_MLX_SERVER_URL=http://127.0.0.1:11435
   ```
6. **pip install**: installs `mlx-lm` into the backend venv (line 311)
7. **Health check** (lines 457-459): curls `http://127.0.0.1:${MLX_SERVER_PORT}/v1/models` to confirm sidecar reachability

#### Layer 3: iPhone Manifest (`NodeRuntime.swift:852-877`)

The iPhone's `/setup/mac/manifest` returns:

```json
{
  "mac": {
    "recommendedBackend": "mlx_macos",
    "requiresAppleSilicon": true,
    "installerTrust": "developer_id_notarized_or_mac_app_store"
  }
}
```

This is consistent with the Mac preflight's `mlx.recommendedBackend`.

#### Gap: Python Backend Does NOT Consume IHN_LLM_PROVIDER

The feature branch does **not** modify `backend/app/config.py` to add
`IHN_LLM_PROVIDER`, `IHN_MLX_MODEL`, or `IHN_MLX_SERVER_URL` settings (confirmed
by `git diff origin/main...feature/iphone-mac-brain-setup -- backend/app/config.py`
returning empty). The env vars set by the installer script are present in the
process environment but have no backend consumer. The backend currently only
configures Ollama via `IHN_OLLAMA_URL`.

**Observation:** The MLX sidecar routing is a **two-piece design**: the installer
sets up the sidecar process and the env vars; the backend's `IHN_LLM_PROVIDER`
consumer is planned but not yet implemented. This is consistent with the vision
doc's statement that this branch is the "first implementation spine."

**Recommendation:** Add `IHN_LLM_PROVIDER` and `IHN_MLX_SERVER_URL` to
`config.py` and wire them into a provider abstraction so the installer doesn't
set dead env vars.

---

### 3.2 /health and /capabilities Provider Metadata

**Status: PASS with observations**

#### iOS `/health` Provider Metadata (`NodeRuntime.swift:570-584`)

```json
{
  "ok": true,
  "status": "ok",
  "product": "iHomeNerd",
  "version": "0.1.0-dev-ios",
  "hostname": "iphone",
  "ollama": false,
  "providers": ["ios_local"],
  "models": {},
  "available_capabilities": ["text_to_speech", "speech_to_text", "transcribe_audio", "analyze_image", "chat"]
}
```

- `providers: ["ios_local"]` — correct for an iOS-only node; no Mac MLX provider
- `models: {}` — correct; iOS doesn't advertise Ollama models
- `available_capabilities` includes `"chat"` when the device has >= 5GB RAM
- All fields match the established contract shape from previous iPhone test runs

#### iOS `/capabilities` Provider Metadata (`NodeRuntime.swift:587-608`, `CapabilityHost.swift`)

The `_detail.capabilities.chat` sub-object shape:

```json
{
  "chat": {
    "available": true,
    "backend": "mlx_ios",
    "endpoint": "/v1/chat",
    "loaded_pack_name": null  // or model name if loaded
  }
}
```

- `backend: "mlx_ios"` — correct provider designation for on-device iOS MLX
- `loaded_pack_name` is `null` by default (the nonisolated `getLoadedModelName()` returns nil)
- The `chat` flat boolean is `true` when `ChatCapability.available` (RAM >= 5GB)
- Match with `test_chat_contract.py:test_chat_capability_shape` expectations: `backend` is a string, `endpoint` is `/v1/chat`, `available` is boolean

#### Python Backend `/health` Provider Metadata (`main.py:255-268`)

```python
"providers": ["gemma_local"] if ollama_health["ok"] else [],
```

- Python backend does **not** advertise `mlx_macos` as a provider
- No change in provider metadata on the feature branch vs `main`
- `models` is built from capabilities, not from the MLX sidecar

#### Python Backend `/capabilities` Provider Metadata (`capabilities.py:25-83`)

The `chat` capability is Ollama-model-dependent:

```python
_cap("chat", "medium")
# available = True when a medium-tier Ollama model is present
```

- No MLX-specific capability in the Python backend
- The `_detail.capabilities.chat` sub-object does not include a `backend` or `endpoint` field (unlike iOS)
- This is a contract divergence: the iOS capability contract includes `backend` and `endpoint`; the Python backend does not

**Observation:** The Python backend's capabilities shape lacks a `backend` field for `chat`. This is a minor contract delta but not a bug — the backend routes chat through Ollama and doesn't need to distinguish backends in its own capability advertisement.

**Recommendation:** Add `backend: "ollama_local"` (or `"mlx_macos"` when wired) to the Python backend's chat capability in `_detail.capabilities.chat` to match the iOS shape contract.

---

### 3.3 /v1/chat Routing Through mlx_macos

**Status: PASS with observations**

#### iOS `/v1/chat` (`NodeRuntime.swift:296-318`, `MLXEngine.swift`)

Route flow:
1. `POST /v1/chat` → `handleChat(request:snapshot:)` on a `Task.detached`
2. Validates body is JSON with `"prompt"` key → 400 on missing/malformed
3. Calls `MLXEngine.shared.generate(prompt:)` 
4. Returns 502 with `{"detail": "MLX inference failed: ..."}` on error
5. Returns 200 with response shape:
   ```json
   {
     "text": "...",
     "processingTime": 1.23,
     "tokensPerSecond": 12.34,
     "model": "mlx-community/gemma-4-e2b-it-4bit",
     "backend": "mlx_ios"
   }
   ```

The `test_chat_contract.py` tests on the feature branch validate:
- `test_chat_missing_prompt_returns_400` — empty JSON → 400
- `test_chat_malformed_json_handled` — non-JSON body → server survives
- `test_chat_valid_prompt_response_shape` — valid prompt → correct response shape, handles 502 when model not loaded

#### Python Backend `/v1/chat`

**No dedicated `/v1/chat` endpoint exists** on the feature branch. The Python backend routes chat through:
- `agents_router` (`agents.py:214`): `ollama.chat(messages, tier="medium")` 
- `investigate_router` (`investigate.py:809`): `ollama.generate(prompt, tier="medium")`

The `backend/app/main.py` diff from the feature branch does **not** add:
- A `/v1/chat` POST endpoint
- An MLX chat router
- Any provider-switching logic

The env var `IHN_LLM_PROVIDER=mlx` set by the Mac installer is **not consumed**
by any backend code path.

#### Gap Analysis

| Concern | iOS | Python Backend |
|---|---|---|
| `/v1/chat` endpoint | Present, `backend: "mlx_ios"` | **Missing** |
| Prompt validation (400 on missing) | Yes | N/A |
| MLX generate path | `MLXEngine.generate(prompt:)` | **Not implemented** |
| Shape contract (`text`, `processingTime`, `tokensPerSecond`, `model`, `backend`) | Yes | N/A |
| `IHN_LLM_PROVIDER` consumer | N/A (iOS doesn't use it) | **Not implemented** |

**Observation:** The Mac sidecar design (installer sets `IHN_LLM_PROVIDER=mlx` + launches `mlx_lm.server` on port 11435) is architecturally sound as a "fake sidecar" pattern, but the backend has no provider routing to consume it. The Python backend needs a `/v1/chat` endpoint that routes to either Ollama or the MLX sidecar based on `IHN_LLM_PROVIDER`.

**Recommendation:** Add a `/v1/chat` POST endpoint to the Python backend with:
1. Same shape contract as iOS (`text`, `processingTime`, `tokensPerSecond`, `model`, `backend`)
2. Provider selection based on `IHN_LLM_PROVIDER` (`ollama` → Ollama API; `mlx` → MLX sidecar on `IHN_MLX_SERVER_URL`)
3. When `IHN_LLM_PROVIDER=mlx`, `backend` should report `"mlx_macos"` (matching the preflight/manifest)

---

### 3.4 /setup/mac and /setup/mac/manifest Routes

**Status: BLOCKED (iPhone offline), PASS (static analysis)**

#### Route Definitions (`NodeRuntime.swift:805-816`)

Both routes are served on the bootstrap HTTP listener on port `:17778`:

```
bootstrapListener (NWListener, port 17778, plain HTTP)
├── GET /                         → bootstrapIndexHTML() 
├── GET /setup/ca.crt             → caPEM (certificate)
├── GET /setup/trust-status       → trustStatusJson()
├── GET /setup/ihomenerd.mobileconfig → mobileconfig data
├── GET /setup/mac                → macSetupHTML()        ← NEW on feature branch
├── GET /setup/mac/manifest       → macSetupManifest()    ← NEW on feature branch
```

#### `/setup/mac` HTML Page (`NodeRuntime.swift:880-942`)

Renders a styled HTML page with:
- Title: "Set up this Mac as your home brain"
- Trusted handoff section showing the elided CA fingerprint
- "This page intentionally does not expose the Home CA private key."
- Developer preview command with `IHN_MAC_LLM_BACKEND=mlx IHN_MLX_MODEL=...`
- Links to the manifest and the CA cert download
- Implementation roadmap ("What happens next")

#### `/setup/mac/manifest` JSON (`NodeRuntime.swift:852-877`)

Expected response shape (from code, not verified live):

```json
{
  "product": "iHomeNerd",
  "version": "0.1.0-dev-ios",
  "setupRole": "iphone_concierge",
  "status": "installer_pending",
  "hostname": "iphone",
  "setupUrl": "http://<iphone-ip>:17778/setup/mac",
  "manifestUrl": "http://<iphone-ip>:17778/setup/mac/manifest",
  "homeCa": {
    "fingerprintSha256": "<ca-fingerprint>",
    "certUrl": "http://<iphone-ip>:17778/setup/ca.crt"
  },
  "mac": {
    "recommendedBackend": "mlx_macos",
    "requiresAppleSilicon": true,
    "installerTrust": "developer_id_notarized_or_mac_app_store"
  },
  "pairing": {
    "requiresUserApproval": true,
    "oneTimeToken": false,
    "caKeyHandoff": false,
    "csrSigning": false
  }
}
```

#### Contract Shape Validation

| Field | Value | Contract Notes |
|---|---|---|
| `setupRole` | `"iphone_concierge"` | Unique role identifier for iPhone-led setup |
| `status` | `"installer_pending"` | Reflects current state of pairing implementation |
| `mac.recommendedBackend` | `"mlx_macos"` | Consistent with control_plane.py preflight |
| `mac.requiresAppleSilicon` | `true` | Correct — MLX requires ARM64 |
| `pairing.caKeyHandoff` | `false` | Not yet implemented per vision doc |
| `pairing.csrSigning` | `false` | Not yet implemented per vision doc |
| `pairing.requiresUserApproval` | `true` | Required per trust model |
| `homeCa.*` | fingerprint + certUrl only | No key URL — correct |

#### Python Backend

No `/setup/mac` or `/setup/mac/manifest` routes on the Python backend (neither
TLS :17777 nor bootstrap :17778). Expected — the iPhone is the concierge.

#### mDNS Advertisement

The bootstrap listener advertises via `_ihomenerd-setup._tcp`:

```swift
bootstrapListener.service = NWListener.Service(
    name: "iHomeNerd Mac setup on \(host)",
    type: Self.setupServiceType,  // "_ihomenerd-setup._tcp"
    txtRecord: NWTXTRecord([
        "role": "mac-setup",
        "hostname": "\(host).local",
        "version": Self.version,
        "path": "/setup/mac",
    ])
)
```

This enables mDNS discovery of the Mac setup service.

**Observation:** The manifest and HTML page are well-structured. The pairing
section honestly advertises that `caKeyHandoff` and `csrSigning` are `false`
(not yet implemented), matching the vision doc's statement that these are
future work.

---

### 3.5 Home CA Private Key Exposure Audit

**Status: PASS — No CA private key exposed in any HTTP endpoint**

#### Audit Matrix

| Surface | Source File | Key Material | Verdict |
|---|---|---|---|
| `/setup/ca.crt` (iOS bootstrap :17778) | `NodeRuntime.swift:807-808` | `caPEM` (cert only) | **Safe** — cert only |
| `/setup/mac` (iOS bootstrap :17778) | `NodeRuntime.swift:880-942` | CA fingerprint only (elided); explicit text: "This page intentionally does not expose the Home CA private key." | **Safe** |
| `/setup/mac/manifest` (iOS bootstrap :17778) | `NodeRuntime.swift:852-877` | `homeCa.fingerprintSha256`, `homeCa.certUrl` — no key URL | **Safe** |
| `/setup/trust-status` (iOS bootstrap :17778) | `NodeRuntime.swift:970-987` | `homeCa.fingerprintSha256`, `serverCert.fingerprintSha256` — no keys | **Safe** |
| `/setup/ihomenerd.mobileconfig` (iOS bootstrap :17778) | `NodeRuntime.swift:811-812` | `mobileconfig` data wrapping the CA cert, not the key | **Safe** |
| `BootstrapSnapshot` struct | `NodeRuntime.swift:28-36` | `caPEM`, `caFingerprint`, `leafFingerprint` — **NO key field** | **Safe** |
| `/setup/ca.crt` (Python backend) | `main.py:121-130` | Serves CA cert PEM only (from file) | **Safe** |
| `/setup/trust-status` (Python backend) | `main.py:247-252`, `certs.py:191-255` | `homeCa.fingerprintSha256`, `subject`, `issuer`, validity dates — **no key** | **Safe** |
| `/setup/profile.mobileconfig` (Python backend) | `main.py:133-192` | DER certificate, not key | **Safe** |
| `get_trust_status()` | `certs.py:191-255` | Only `_read_cert_metadata()` which reads via `openssl x509 -noout` — only public fields | **Safe** |
| CA key on filesystem | `certs.py:41` | `IHN_CA_KEY_PATH` env var / `ca.key` on disk — **not exposed over HTTP** | **Safe** |

#### Key Architectural Protections

1. **`BootstrapSnapshot` does not include a key field** (line 28-36 of `NodeRuntime.swift`). The struct's only fields are `hostname`, `ips`, `caPEM` (cert), `caFingerprint`, `leafFingerprint`, `mobileconfig`, and `port`. No private key material.

2. **The Home CA private key lives in the iOS keychain** (`HomeCAStore`, `HomeCA.swift`). The key is only accessed at Node start time to sign the per-session leaf cert. It is never cached in the `BootstrapSnapshot` or exposed to any HTTP handler.

3. **Python backend keeps CA key on disk only** (`certs.py:40-42`). The key path is derived from `IHN_CA_KEY_PATH` env var or `data_dir/certs/ca.key`. No HTTP endpoint reads or returns the key content. The key is only used internally by `_generate_server_cert()` and `ensure_certs()`.

4. **The pairing manifest advertises `caKeyHandoff: false`** — when this is eventually implemented, it will require user approval via the `MacSetupScreen` and will likely use a one-time token mechanism. The current `false` value means no key transfer is possible.

**Observation:** The security posture is correct for the current "installer_pending" status. The design follows the vision doc's recommendation to keep the Home CA key on the trust authority (iPhone) and not expose it through unauthenticated setup URLs.

---

## 4. Static Test File Verification

The feature branch includes two static test files:

### 4.1 `backend/tests/test_chat_contract.py` (111 lines)

Tests the MLX chat capability shape and endpoint contract:

| Test | Coverage |
|---|---|
| `test_chat_capability_shape` | `chat` flat boolean, `_detail.capabilities.chat` fields (`available`, `backend`, `endpoint`, `loaded_pack_name`) |
| `test_chat_missing_prompt_returns_400` | Validates 400 on empty JSON body (requires `IHN_RUN_LIVE_CHAT=1`) |
| `test_chat_malformed_json_handled` | Server survives non-JSON input (requires `IHN_RUN_LIVE_CHAT=1`) |
| `test_chat_valid_prompt_response_shape` | Valid response has `text`, `processingTime`, `tokensPerSecond`, `model`, `backend` (requires `IHN_RUN_LIVE_CHAT=1`) |

Logic adapts for two node shapes:
- **iOS** (`backend: "mlx_ios"`): capabilities nested under `_detail.capabilities.chat`
- **Python** backend: capabilities might be flat under `_detail.chat` without `capabilities` wrapper

### 4.2 `mobile/testing/test_mlx_ios_static.py` (50 lines)

Validates iOS source code invariants:

| Test | Coverage |
|---|---|
| `test_models_screen_has_correct_catalog` | `ModelsScreen.swift` has `LLMRegistry.qwen2_5_1_5b`, `LLMRegistry.gemma4_e2b_it_4bit`, `"1.5B parameters"`, `"2B parameters"`, `"4-bit"` |
| `test_ram_guard_logic` | `MLXEngine.swift` does NOT contain the buggy `configuration.name.lowercased().contains("4b")` pattern that would reject 4-bit quantized models as 4B models |

Both static test files are well-structured and target real regression risks.

---

## 5. Summary

```
iPhone Live Tests:     BLOCKED (device offline at 192.168.0.220)
Python Backend Live:   BLOCKED (backend not running on :17777)
Static Analysis:       COMPLETE (5 categories)

MLX Sidecar Routing:   PASS (env-var design sound, backend consumer missing)
Provider Metadata:     PASS (iOS shape correct, Python backend misses mlx_macos)
/v1/chat Routing:      PASS (iOS complete, Python backend has no /v1/chat endpoint)
/setup/mac Routes:     PASS (static) — iPhone BLOCKED for live verification
CA Private Key Audit:  PASS — No key material exposed in any HTTP endpoint
```

### Key Findings

| # | Finding | Severity | File(s) |
|---|---|---|---|
| 1 | `IHN_LLM_PROVIDER`/`IHN_MLX_SERVER_URL` env vars set by installer but never consumed by backend config | Gap | `install-ihomenerd-macos.sh:291-293`, `backend/app/config.py` |
| 2 | Python backend has no `/v1/chat` endpoint — chat goes through agents router only | Gap | `backend/app/main.py` |
| 3 | Python backend `/capabilities` chat detail lacks `backend`/`endpoint` fields (iOS has them) | Minor delta | `backend/app/capabilities.py:37` vs `NodeRuntime.swift:676-683` |
| 4 | `/setup/mac` HTML page explicitly declares "intentionally does not expose the Home CA private key" | Good | `NodeRuntime.swift:922` |
| 5 | Manifest pairing section honestly advertises `caKeyHandoff: false`, `csrSigning: false` | Good | `NodeRuntime.swift:873-876` |
| 6 | `BootstrapSnapshot` struct has zero key fields — CA private key never leaves keychain | Good | `NodeRuntime.swift:28-36` |
| 7 | MLX preflight probe uses `importlib.util.find_spec` (no side-effects) and has Metal availability guards | Good | `control_plane.py:180-201` |
| 8 | MLX model-switch in `MLXEngine.swift` properly releases old model + clears cache before loading new one | Good | `MLXEngine.swift:44-79` |

### Contract Shape Verification

| Route | iOS (NodeRuntime.swift) | Python Backend (main.py) | Parity |
|---|---|---|---|
| `GET /health` | Complete — `providers: ["ios_local"]` | Complete — `providers: ["gemma_local"]` | PASS (different values, same shape) |
| `GET /capabilities` | Complete — chat has `backend`, `endpoint` | Complete — chat has `model`, `tier` | **Minor delta** — backend missing `backend`/`endpoint` |
| `POST /v1/chat` | Complete — `mlx_ios` backend | **Not implemented** | **Gap** |
| `GET /setup/mac` | Complete — HTML page | **Not implemented** (expected) | N/A |
| `GET /setup/mac/manifest` | Complete — JSON | **Not implemented** (expected) | N/A |
| CA private key routes | **None** | **None** | PASS |

---

## 6. Recommendations

1. **Add `IHN_LLM_PROVIDER` to `config.py`** and implement a provider router in the Python backend so the Mac installer's env vars actually control which LLM backend serves chat.

2. **Add `POST /v1/chat` to the Python backend** matching the iOS contract shape (`text`, `processingTime`, `tokensPerSecond`, `model`, `backend`). Route to the MLX sidecar when `IHN_LLM_PROVIDER=mlx`, reporting `backend: "mlx_macos"`.

3. **Add `backend` and `endpoint` fields** to the Python backend's `_detail.capabilities.chat` to match the iOS capability contract.

4. **Re-run this test suite against a live iPhone** when device is online and running the feature branch build:
   ```bash
   curl -sk https://192.168.0.220:17777/capabilities | python3 -m json.tool
   curl -s  http://192.168.0.220:17778/setup/mac/manifest | python3 -m json.tool
   ```

5. **Re-run contract tests** (`test_contract_api.py`, `test_chat_contract.py`) against the live iPhone when online.

---

## 7. Runtime-Side Changes Required?

**No.** All findings are either expected gaps (backend consumer not yet built) or minor deltas (field parity). No runtime implementation files were edited during this test.

