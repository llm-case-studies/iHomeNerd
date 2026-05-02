# iPhone-to-Mac Brain Setup and MLX Provider Test Request

**Date:** 2026-05-02
**Time issued:** ~11:00 EDT
**Requester:** DeepSeek/OpenCode (Mac mini M1)
**Target device:** iPhone 12 Pro Max (LAN IP `192.168.0.220`, advertised hostname `iphone`)
**Target role:** iOS node-class host + Mac brain concierge
**Expected branch context:** `feature/iphone-mac-brain-setup` (HEAD `446b5b2`)

---

## 1. Goal

Validate the iPhone-led Mac brain setup flow and the MLX provider backend routing
introduced on the `feature/iphone-mac-brain-setup` branch. The branch introduces:

- A fictitious "fake MLX sidecar" backend routing pathway (env-var-driven `mlx_macos`
  designation for Apple Silicon Macs)
- `/health` and `/capabilities` provider metadata shape
- `POST /v1/chat` routing through `mlx_macos` (Mac) and `mlx_ios` (iPhone)
- iPhone-served `/setup/mac` (HTML) and `/setup/mac/manifest` (JSON) bootstrap routes
- Home CA private key non-exposure audit across all setup surfaces

If the iPhone is unreachable, mark that section BLOCKED and proceed with
backend static analysis.

---

## 2. What shipped on this branch (55 files, +7036 / -339 lines)

Key commits:

- `446b5b2` — Add iPhone-led Mac brain setup flow
- `6bb851d` — feat(mlx): wire up POST /v1/chat endpoint and capabilities
- `1101251` — feat(mlx): flesh out MLXEngine load and generate logic
- `741a7d6` — docs: formalize MLX pivot for Apple Silicon
- `c2f7eaf` — test: add MLX chat contract and static regression tests

Files of interest:

| File | Role |
|------|------|
| `mobile/ios/.../NodeRuntime.swift` | iPhone node: `/v1/chat`, `/setup/mac`, `/setup/mac/manifest`, capability shapes |
| `mobile/ios/.../MLXEngine.swift` | MLX model load/generate actor |
| `mobile/ios/.../CapabilityHost.swift` | Live capability snapshot (chat, STT, TTS, OCR) |
| `mobile/ios/.../MacSetupScreen.swift` | iPhone UI for brain setup |
| `backend/app/domains/control_plane.py` | SSH preflight: Apple Silicon / MLX readiness fields |
| `backend/app/certs.py` | CA trust-status endpoint (new on feature branch) |
| `backend/app/main.py` | `/setup/trust-status` added to bootstrap HTTP app |
| `install-ihomenerd-macos.sh` | Mac installer with `IHN_MAC_LLM_BACKEND=mlx` support |
| `backend/tests/test_chat_contract.py` | MLX chat contract tests |

---

## 3. Test categories

### 3.1 Fake MLX sidecar backend routing

- Trace the `mlx_macos` backend designation path from iPhone manifest through
  installer env vars to Python backend provider selection
- Verify the Mac preflight in control_plane.py correctly detects Apple Silicon
  and populates `mlx.ready`, `mlx.lmReady`, `mlx.metalReady`, `mlx.recommendedBackend`
- Verify `install-ihomenerd-macos.sh` env var routing: `IHN_MAC_LLM_BACKEND=mlx`
  triggers MLX model selection, `IHN_MLX_SERVER_URL` points to local port 11435

### 3.2 /health and /capabilities provider metadata

- iOS: `/health` reports `providers: ["ios_local"]`
- iOS: `/capabilities._detail.capabilities.chat` reports `backend: "mlx_ios"`, `endpoint: "/v1/chat"`
- Python backend: `/health` reports `providers: ["gemma_local"]` (Ollama-dependent)
- Check: does Python backend advertise an mlx provider when configured with
  `IHN_LLM_PROVIDER=mlx`?

### 3.3 /v1/chat routing through mlx_macos

- iOS: `POST /v1/chat` → `MLXEngine.generate(prompt:)` → returns `backend: "mlx_ios"`
- iOS: Validates prompt presence, returns 400 on missing prompt
- iOS: Returns 502 with "detail" key on inference failure
- Python backend: chat goes through agents_router; `IHN_LLM_PROVIDER` env var
  governs provider selection but no dedicated `/v1/chat` endpoint exists;
  validate that `mlx_macos` configuration is wired in

### 3.4 /setup/mac and /setup/mac/manifest

- `GET /setup/mac` (iPhone bootstrap :17778) → HTML page with Mac setup instructions
- `GET /setup/mac/manifest` (iPhone bootstrap :17778) → JSON with:
  - `setupRole`: `"iphone_concierge"`
  - `mac.recommendedBackend`: `"mlx_macos"`
  - `mac.requiresAppleSilicon`: `true`
  - `pairing.caKeyHandoff`: `false` (not yet implemented)
  - `pairing.csrSigning`: `false` (not yet implemented)
- If iPhone is reachable: curl and validate both routes

### 3.5 Home CA private key exposure

- Audit all HTTP endpoints (both :17777 TLS and :17778 plain) for CA private key
  material
- Verify `BootstrapSnapshot` transports only `caPEM` (cert), not `ca.key`
- Verify `/setup/mac` HTML explicitly declares no key exposure
- Verify `/setup/mac/manifest` provides `homeCa.certUrl` but no key URL
- Verify Python backend's `certs.py` `get_trust_status()` returns only fingerprint
  metadata, not key material
- Verify Python backend's `/setup/ca.crt` serves only the certificate PEM

---

## 4. How to test

### iPhone reachability pre-flight

```bash
curl -sk --connect-timeout 3 https://192.168.0.220:17777/health
curl -sk --connect-timeout 3 https://192.168.0.220:17777/capabilities
curl -s  --connect-timeout 3 http://192.168.0.220:17778/setup/mac
curl -s  --connect-timeout 3 http://192.168.0.220:17778/setup/mac/manifest
```

If **any** of these fail: mark iPhone section **BLOCKED** and proceed with
static analysis.

### Static analysis

For items that cannot be verified via live HTTP calls:
- Diff the feature branch against `origin/main`
- Trace code paths from env var → provider selection → chat routing
- Audit all HTTP response bodies for private key material
- Validate capability shape contracts against existing patterns

---

## 5. Expected deltas / known gaps

1. **No `/setup/mac` on Python backend** — these routes exist only on iOS
   (NodeRuntime.swift). The Python backend has no equivalent — expected.
2. **No mlx provider in Python backend `/health`** — the Python backend does
   not yet advertise `mlx_macos` as a provider in `/health`. The MLX sidecar
   concept is env-var-driven, not surfaced through the API metadata yet.
3. **Pairing caKeyHandoff and csrSigning both false** — these are future work
   per the vision doc. Current status is `"installer_pending"`.
4. **`/v1/chat` on Python backend** — no dedicated route exists; chat is routed
   through agents. The feature branch does not add an MLX-specific chat endpoint
   to the Python backend.

---

## 6. Hands-off zones

- Do **not** edit `mobile/ios/ihn-home/IhnHome/Runtime/*` — iOS runtime ownership
- Do **not** edit `backend/app/main.py` or `backend/app/certs.py` — backend ownership
- New test files under `backend/tests/` or `mobile/testing/` are fine with flagging
- Write results to `mobile/testing/results/IPHONE_TO_MAC_BRAIN_SETUP_AND_MLX_PROVIDER_RESULTS_2026-05-02.md`

---

## 7. One-line kickoff

> DeepSeek: test the iPhone-to-Mac brain setup flow and MLX provider backend routing
> from branch `feature/iphone-mac-brain-setup`. Read this request doc first. Drop
> results as the matching results file. Don't touch runtime code.

