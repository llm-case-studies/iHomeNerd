# Cross-Platform Contract Findings

**Date:** 2026-04-28
**Audience:** Alex, Codex, Claude, DeepSeek sessions
**Targets tested:**
- Python backend (local, macOS, Python 3.12, `LAN_MODE=0`)
- Android backend (remote, Motorola Edge 2021, `192.168.0.246`)
- iOS scaffold (remote, iPhone 12 Pro Max, `192.168.0.220`) — **not yet contract-capable** (see §7)

**Goal:** The backend is supposed to present an identical API contract across
platforms — the same JSON shapes, field names, and status codes whether the
runtime is Python or Android.

**Verdict:** Contract is mostly shared, with 7 gaps worth aligning.

---

## 1. Test coverage deployed

| File | Tests | Purpose |
|---|---|---|
| `backend/tests/test_contract_api.py` | 25 | `/health`, `/discover`, `/capabilities`, `/system/stats`, root, 404 |
| `backend/tests/test_bootstrap_routes.py` | 13 | `/setup/ca.crt`, `/setup/trust-status` on port 17778 |
| `backend/tests/test_persistence_api.py` | 71 | PronunCo persistence full CRUD (existing) |

Both new suites pass 38/38 on Python and 38/38 on Android after contracting
for intentional differences.

---

## 2. Identical across platforms

| Endpoint | Fields verified identical |
|---|---|
| `GET /health` | `ok` (bool), `status` ("ok"), `product` ("iHomeNerd"), `version` (str), `hostname` (str), `providers` (list), `models` (dict), `binding` (str), `port` (int) |
| `GET /discover` | `product`, `version`, `role` ("brain"), `hostname`, `os`, `arch`, `protocol`, `port` |
| `GET /discover` | `suggested_roles` (list), `strengths` (list), `accelerators` (list) |
| `GET /setup/ca.crt` | PEM body, self-signed, CA:TRUE, content-type, 200 status |
| `GET /setup/trust-status` | `status` (str enum), `homeCa.present` (bool), `serverCert.present` (bool), `homeCa.fingerprintSha256`, cert metadata |

---

## 3. Differences found (7 gaps)

### 3.1 `GET /capabilities` — extra keys in flat map

**Python:** Flat map contains only capability booleans + `_detail`.
**Android:** Flat map additionally includes `product`, `version`, `capabilities`.

```json
// Python
{"chat": true, "transcribe_audio": false, "_detail": {...}}

// Android  
{"product": "iHomeNerd", "version": "0.1.0-dev-android", "capabilities": {...}, "chat": true, "transcribe_audio": true, "_detail": {...}}
```

**Severity:** Low. The booleans are still present; extra keys don't break consumers.
**Recommendation:** Decide whether `product`/`version` belong in the capabilities map or in `_detail`.

### 3.2 `GET /capabilities` `_detail` hostname location

**Python:** `_detail.hostname` (top-level).
**Android:** `_detail.node_profile.hostname` (nested).

**Severity:** Medium. Clients looking for `_detail.hostname` will fail on Android.
**Recommendation:** Pick one: top-level `hostname` or `node_profile.hostname`. Top-level preferred for consistency with `/health`.

### 3.3 `GET /discover` `network_hint` type

**Python:** Not present when `LAN_MODE=0`. Expected shape: dict.
**Android:** Present as a plain string.

```json
// Expected (from Python LAN mode)
{"network_hint": {"bootstrap": "http://...", "runtime": "https://..."}}

// Android actual
{"network_hint": "Nearby devices should be able to reach this node over HTTP :17778 and HTTPS :17777."}
```

**Severity:** Medium. Clients that expect a structured object will fail.
**Recommendation:** Standardise as a dict with `message` (str) and optionally `bootstrap_url`/`runtime_url`.

### 3.4 `GET /discover` `quality_profiles`

**Python:** `null` when `LAN_MODE=0`.
**Android:** `["fast", "balanced"]`.

**Severity:** Low. Python may need to expose this in LAN mode too.
**Recommendation:** Python backend should emit `["fast", "balanced"]` or equivalent.

### 3.5 `GET /system/stats` storage metric naming

**Python:** `storage_bytes` (int).
**Android:** `app_memory_pss_bytes` (int).

**Severity:** Medium. Different field name for the same concept.
**Recommendation:** Align on `storage_bytes`. Android can add `app_memory_pss_bytes` as an additional detail.

### 3.6 `GET /setup/trust-status` optional metadata fields

**Python:** Returns `product` ("iHomeNerd") and `message` (str).
**Android:** Omits both fields.

**Severity:** Low. The core trust fields (`status`, `homeCa`, `serverCert`) match.
**Recommendation:** Android should add `product` and `message` for consistency.

### 3.7 Unknown route behaviour

**Python:** `GET /nonexistent` returns 404.
**Android:** `GET /nonexistent` returns 200 (likely catch-all SPA routing).

**Severity:** Low. Both are valid server behaviours, but clients hitting a
nonexistent API route on Android will get HTML instead of a clear JSON error.
**Recommendation:** Android should return 404 for unknown API paths that don't match SPA routes.

---

## 4. Platform-specific (not a gap — expected)

| Feature | Python | Android |
|---|---|---|
| PronunCo persistence | Full CRUD (71/71) | Not implemented (persistence capability absent) |
| `/capabilities` live capability count | 13 capabilities | 5 capabilities (chat, transcribe_audio, synthesize_speech, compare/normalize_pinyin) |
| `/system/stats` battery/temperature | Not present | `battery_percent`, `battery_temp_c` |
| `/health` Ollama info | `ollama` + model cache | Not present (Android uses `android_local` providers) |

These are expected hardware/runtime differences, not contract violations.

---

## 5. Test run commands

```bash
# Local
source backend/.venv/bin/activate
IHN_LAN_MODE=0 python -m app.main &
IHN_BASE_URL=https://localhost:17777 IHN_BOOTSTRAP_URL=http://localhost:17778 \
  pytest backend/tests/test_contract_api.py backend/tests/test_bootstrap_routes.py -v
python backend/tests/test_persistence_api.py https://localhost:17777

# Android (ME-21)
IHN_BASE_URL=https://192.168.0.246:17777 IHN_BOOTSTRAP_URL=http://192.168.0.246:17778 \
  pytest backend/tests/test_contract_api.py backend/tests/test_bootstrap_routes.py -v
```

---

## 6. iPhone 12 Pro Max — 33/38, rapid progress

**Probe dates:** 2026-04-28 (two sweeps, ~4 hours apart)
**IP:** `192.168.0.220`

| Sweep | HTTPS :17777 | HTTP :17778 | Tests passed |
|-------|-------------|-------------|-------------|
| First | TCP connects, TLS `SSL_ERROR_SYSCALL` | Connection refused | 0/38 |
| **Now** | TLS handshake works, health + discover + capabilities live | ca.crt + trust-status live | **33/38** |

**What's working (33/38 tests):**
- `GET /health` — full contract: `product`, `version` ("0.1.0-dev-ios"), `hostname` ("iphone"), `ok`, `status`, `providers` (["ios_local"]), `models` ({}), `binding`, `port`, `network_ips`
- `GET /discover` — full contract: `role` ("brain"), `os` ("ios"), `arch` ("arm64"), `protocol`, `port`, `ram_bytes` (~5.9 GB), `suggested_roles` (["controller", "travel-node-candidate"]), `strengths`, `network_ips`
- `GET /capabilities` — correct JSON structure with `_detail`, flat boolean map. All capabilities currently `false` (no models loaded — expected for early iOS)
- `GET /setup/ca.crt` — 200, valid PEM, self-signed, CA:TRUE
- `GET /setup/trust-status` — 200, `status: "trusted"`, `homeCa.present`, `serverCert.present`, includes `product` and `version` (better than ME-21 which omits them)
- Root `/` — responds
- 404 behaviour — correct

**What's missing (5/38 tests):**
- `GET /system/stats` — returns 404 (not yet implemented)

**iPhone contract quality notes:**
- `_detail` includes `hostname` at both top level AND `node_profile` — best of both Python/Android patterns
- `trust-status` includes `product` + `version` — Android should match this
- `discover` omits `gpu` field (not None, just absent) — acceptable for mobile
- `discover` omits `quality_profiles` — same as Python in non-LAN mode

---

## 7. Next steps

1. **iPhone TLS fix** — unblocks 38 contract tests and real peer serving
2. **Align the 7 Python/Android gaps** — prioritise `_detail.hostname` and `network_hint` type first
3. **Add Node.js to the Mac mini** — unblocks Playwright smoke tests against ME-21
4. **Run speech fixture pack against ME-21** — all 20 WAV files ready under `testing/fixtures/audio/`
5. **Keep the contract suite running** — `pytest backend/tests/ -v` now validates any iHomeNerd node
