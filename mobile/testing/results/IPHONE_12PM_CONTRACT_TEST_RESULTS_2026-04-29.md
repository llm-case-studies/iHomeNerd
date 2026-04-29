# iPhone 12 Pro Max Contract Test Results

**Date:** 2026-04-29
**Time run:** ~07:30 EDT
**Tester:** DeepSeek (Mac mini M1)
**Request ref:** `mobile/testing/requests/IPHONE_12PM_NODE_CONTRACT_TEST_REQUEST_2026-04-29.md`

---

## 1. Environment

| Field | Value |
|---|---|
| **Tester host** | mac-mini-m1.local |
| **Tester IP** | `192.168.0.221` |
| **iPhone IP** | `192.168.0.220` |
| **iPhone hostname** | `iphone` |
| **iPhone build commit** | `0a42457` — iOS: serve .mobileconfig wrapping the Home CA on :17778 |
| **Repo HEAD** | `0a42457` (branch `main`) |
| **Node toggle state** | ON (both :17777 TLS and :17778 plain HTTP responding) |
| **iPhone version** | `0.1.0-dev-ios` |
| **Python / pytest** | Python 3.9.6, pytest 8.4.2, httpx 0.28.1 |

---

## 2. Pre-flight curl output

### `/health` (TLS :17777)

```json
{
  "available_capabilities" : [],
  "binding" : "0.0.0.0",
  "hostname" : "iphone",
  "models" : {},
  "network_ips" : ["192.168.0.220"],
  "ok" : true,
  "ollama" : false,
  "port" : 17777,
  "product" : "iHomeNerd",
  "providers" : ["ios_local"],
  "status" : "ok",
  "version" : "0.1.0-dev-ios"
}
```

### `/discover` (TLS :17777)

```json
{
  "accelerators" : [],
  "arch" : "arm64",
  "capabilities" : [],
  "hostname" : "iphone",
  "ip" : "192.168.0.220",
  "models" : [],
  "network_ips" : ["192.168.0.220"],
  "ollama" : false,
  "os" : "ios",
  "port" : 17777,
  "product" : "iHomeNerd",
  "protocol" : "https",
  "ram_bytes" : 5967052800,
  "role" : "brain",
  "strengths" : ["portable controller", "trust helper", "LAN node"],
  "suggested_roles" : ["controller", "travel-node-candidate"],
  "version" : "0.1.0-dev-ios"
}
```

### `/capabilities` (TLS :17777)

```json
{
  "_detail" : {
    "arch" : "arm64",
    "capabilities" : {},
    "hostname" : "iphone",
    "node_profile" : {
      "hostname" : "iphone",
      "ips" : ["192.168.0.220"],
      "port" : 17777,
      "role" : "brain"
    },
    "os" : "ios",
    "product" : "iHomeNerd",
    "version" : "0.1.0-dev-ios"
  }
}
```

### `/setup/trust-status` (plain HTTP :17778)

```json
{
  "homeCa" : {
    "fingerprintSha256" : "50:67:99:18:61:C9:5E:3F:1A:01:18:62:2B:13:F7:3A:BC:98:3F:1B:E1:C2:48:43:BE:C5:9B:DF:0F:16:3F:D5",
    "present" : true
  },
  "hostname" : "iphone",
  "product" : "iHomeNerd",
  "serverCert" : {
    "fingerprintSha256" : "B8:DC:19:AB:A2:79:BF:43:E4:F9:FF:A2:6D:C8:F3:84:84:68:4C:55:A2:15:C5:68:A8:DF:95:E3:B2:68:25:50",
    "present" : true
  },
  "status" : "trusted",
  "version" : "0.1.0-dev-ios"
}
```

### `/setup/ca.crt` (plain HTTP :17778)

- HTTP 200, valid PEM certificate returned
- `-----BEGIN CERTIFICATE-----` header present

---

## 3. Per-test pass/fail tally

### test_contract_api.py — 20 passed, 5 failed (25 total)

| Test | Result | Notes |
|---|---|---|
| `test_health_returns_200` | PASS | |
| `test_health_product` | PASS | `product == "iHomeNerd"` |
| `test_health_required_fields` | PASS | ok, status, version, hostname all present |
| `test_health_ok_boolean` | PASS | |
| `test_health_has_providers_list` | PASS | `["ios_local"]` |
| `test_health_has_models_dict` | PASS | `{}` (empty — expected per delta #5) |
| `test_health_binding_and_port` | PASS | |
| `test_discover_returns_200` | PASS | |
| `test_discover_product` | PASS | |
| `test_discover_role` | PASS | `"brain"` — matches delta #7 |
| `test_discover_os_and_arch` | PASS | os=ios, arch=arm64 — matches delta #7 |
| `test_discover_network_fields` | PASS | |
| `test_discover_quality_profiles` | PASS | None (valid per contract) |
| `test_discover_capabilities_present` | PASS | Empty list (expected per delta #6) |
| `test_discover_network_hint_present` | PASS | None (valid per contract) |
| `test_capabilities_returns_200` | PASS | |
| `test_capabilities_flat_bool_map` | PASS | Flat map is `{}` — expected per delta #1 |
| `test_capabilities_detail_subobject` | PASS | `_detail` present with hostname/product/version/os/arch/node_profile |
| `test_system_stats_returns_200` | **FAIL** | See failure analysis below |
| `test_system_stats_uptime` | **FAIL** | See failure analysis below |
| `test_system_stats_session_count` | **FAIL** | See failure analysis below |
| `test_system_stats_storage` | **FAIL** | See failure analysis below |
| `test_system_stats_connected_apps` | **FAIL** | See failure analysis below |
| `test_root_responds` | PASS | 200 with `text/html` content-type |
| `test_nonexistent_route_returns_404` | PASS | |

### test_bootstrap_routes.py — 12 passed, 1 skipped (13 total)

| Test | Result | Notes |
|---|---|---|
| `test_ca_cert_returns_200` | PASS | |
| `test_ca_cert_content_type_is_pem` | PASS | Content-type accepted |
| `test_ca_cert_body_looks_like_pem` | PASS | BEGIN/END CERTIFICATE present |
| `test_ca_cert_parses_as_x509` | PASS | Valid X.509 via stdlib PEM→DER |
| `test_ca_cert_is_self_signed` | PASS | Issuer == Subject |
| `test_ca_cert_has_ca_basic_constraints` | SKIP | `cryptography` library not installed |
| `test_trust_status_responds` | PASS | No timeout (unlike ME-21) |
| `test_trust_status_is_json` | PASS | |
| `test_trust_status_required_fields` | PASS | status, homeCa, serverCert all present |
| `test_trust_status_product` | PASS | |
| `test_trust_status_valid_status_value` | PASS | `"trusted"` |
| `test_trust_status_home_ca_subobject` | PASS | present: true, fingerprintSha256 present |
| `test_trust_status_server_cert_subobject` | PASS | present: true, fingerprintSha256 present |

---

## 4. Failure analysis

### 4.1 — `/system/stats` (5 failures — iOS gap, expected)

**Tests:** `test_system_stats_returns_200`, `test_system_stats_uptime`, `test_system_stats_session_count`, `test_system_stats_storage`, `test_system_stats_connected_apps`

**Root cause:** iOS has not implemented `/system/stats`. The route returns HTTP 404 with body `"Not found"`.

**Assertion detail:**
- `test_system_stats_returns_200`: `AssertionError: got 404: Not found` — `assert 404 == 200`
- Remaining 4 tests: `JSONDecodeError: Expecting value: line 1 column 1 (char 0)` — body is `"Not found\n"`, not JSON

**Judgement:** **iOS gap (delta #2)** — documented in the test request. No runtime fix needed.

**Recommendation:** Mark these tests with a conditional skip when targeting iOS (e.g., `pytest.skip` if `/system/stats` returns 404 on an iOS host). The test request specifically asks that this be documented, not "fixed" on the runtime side.

### 4.2 — `test_ca_cert_has_ca_basic_constraints` (1 skip — missing library)

**Root cause:** `cryptography` Python package not installed. The test falls back to `ssl` stdlib but has no path for checking BasicConstraints without `cryptography`.

**Judgement:** **Test infrastructure gap.** Not an iOS issue.

**Recommendation:** Install `cryptography` package and re-run. This is a useful assertion for cert chain validation.

---

## 5. Observed CA fingerprint

```
50:67:99:18:61:C9:5E:3F:1A:01:18:62:2B:13:F7:3A:BC:98:3F:1B:E1:C2:48:43:BE:C5:9B:DF:0F:16:3F:D5
```

This fingerprint should remain stable across Node toggle cycles (it's the Home CA root, persisted in the iOS keychain).

The **serverCert** (leaf) fingerprint observed this run:
```
B8:DC:19:AB:A2:79:BF:43:E4:F9:FF:A2:6D:C8:F3:84:84:68:4C:55:A2:15:C5:68:A8:DF:95:E3:B2:68:25:50
```
This is expected to change on the next toggle cycle (delta #3).

---

## 6. Runtime-side changes required?

**No.** All failures are expected iOS deltas. No runtime code was touched.

---

## 7. Deltas verified

| Delta | Description | Verified? |
|---|---|---|
| #1 | `/capabilities` flat map is empty `{}` | Yes — flat portion is `{}`, `_detail` sub-object present |
| #2 | No `/system/stats` endpoint (404) | Yes — all 5 tests fail with 404 on `/system/stats` |
| #3 | `serverCert.fingerprintSha256` is unstable | Not cycle-tested yet — leaf fingerprint noted for baseline |
| #4 | `hostname` is `"iphone"` | Yes — confirmed in all responses |
| #5 | `ollama: false`, `providers: ["ios_local"]` | Yes — confirmed in `/health` |
| #6 | `available_capabilities` is empty list `[]` | Yes — confirmed in `/health` and `/discover` |
| #7 | `/discover` reports `os: "ios"`, `arch: "arm64"`, suggested roles, role `"brain"` | Yes — all confirmed |

---

## 8. Summary

```
Contract API:  20 passed / 5 failed / 0 skipped  (25 total)
Bootstrap:     12 passed / 0 failed / 1 skipped  (13 total)
─────────────────────────────────────────────────
Overall:       32 passed / 5 failed / 1 skipped  (38 total)

iOS-specific failure rate: 5/5 failures are the documented /system/stats gap
Effective pass rate (excluding documented gaps): 100%
```

**Verdict:** The iPhone 12 Pro Max running build `0a42457` successfully passes the contract suite for all implemented routes. The iPhone has cleared the bar from the previous probe (`advertising-only / scaffold`) and is now a **healthy iOS serving node** for its implemented route set. The only documented gap is `/system/stats`, which matches the Android role-based missing-routes pattern already accounted for in the contract tests.

**Bootstrap listener comparison:** Unlike ME-21 (Android) where `/setup/trust-status` hangs, the iPhone responds cleanly with full JSON. The iPhone bootstrap listener on :17778 is fully functional.

---

## 9. Next actions

1. **Install `cryptography`** to re-enable the BasicConstraints test
2. **Expand contract tests** with iOS-specific cert identity tests (Phase 2)
3. **Cycle test** — toggle Node OFF→ON to verify CA fingerprint stability and leaf fingerprint rotation (delta #3)
4. **Parametrize `/system/stats` tests** with an iOS-aware skip so CI can run against any node without manual flagging
5. **Run the same suite against ME-21** to produce a side-by-side comparison report
