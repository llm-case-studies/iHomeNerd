# Result — iPhone-Mac Pairing Approval

**Status:** validated — **PASS**

## Summary

- **validation host:** `iMac-Debian`
- **validation branch:** `validation/iphone-to-mac-brain/pairing-approval`
- **tested commit SHA:** `32c93afff056d0a089c2c079dff1f63801ede012`
- **build host:** `mac-mini-m1.local` (192.168.0.221)
- **target iPhone:** iPhone 12 Pro Max (D46E3DE5-3D7A-5091-BBEC-009330C30B6D) at `192.168.0.220`
- **verdict:** **PASS**

## Build/Deploy

| Step | Result |
|---|---|
| SSH to mac-mini | `mac-mini-m1.local` — OK |
| Device list | iPhone 12 Pro Max visible, paired |
| Sync + XcodeGen | Succeeded |
| Build (xcodebuild) | Succeeded |
| Install | Succeeded (iHN Home 0.1.0) |
| Launch | Succeeded, hosting active on 17777/17778 |

No blockers encountered during build/deploy.

## Existing Setup Route Probe Results

| # | Probe | HTTP | Status |
|---|---|---|---|
| 1 | `GET https://192.168.0.220:17777/health` | 200 | `ok: true`, `status: ok`, product `iHomeNerd`, version `0.1.0-dev-ios`, capabilities include `chat` |
| 2 | `GET http://192.168.0.220:17778/setup/trust-status` | 200 | `status: trusted`, homeCa present, serverCert present |
| 3 | `GET http://192.168.0.220:17778/setup/ca.crt` | 200 | Valid PEM certificate returned |
| 4 | `GET http://192.168.0.220:17778/setup/mac` | 200 | HTML page, title "Set up a Mac brain with iHomeNerd" |
| 5 | `GET http://192.168.0.220:17778/setup/mac/manifest` | 200 | All expected fields present (see below) |

## Pairing Route Probe Results

| # | Probe | HTTP | Status |
|---|---|---|---|
| 6 | `POST /setup/mac/pairing` (valid: hostname + ip + arch + backend) | 201 | `id`, `requestId`, `status: "pending"`, `pollUrl`, `createdAt`, `expiresAt` returned |
| 7 | `POST /setup/mac/pairing` (missing hostname) | 400 | `detail: "missing or empty 'hostname'"` |
| 8 | `POST /setup/mac/pairing` (missing ip) | 400 | `detail: "missing or empty 'ip'"` |
| 9 | `POST /setup/mac/pairing` (empty body) | 400 | `detail: "expected JSON body"` |
| 10 | `GET /setup/mac/pairing/{valid-id}` | 200 | Full pairing request: hostname, ip, arch, backend, status: pending |
| 11 | `GET /setup/mac/pairing/{nonexistent}` | 404 | `detail: "pairing request not found"` |
| 12 | `GET /setup/mac/pairing/` (no id) | 400 | `detail: "missing request id"` |

## Manifest Assertions

| Assertion | Expected | Actual | Status |
|---|---|---|---|
| `setupRole` | `iphone_concierge` | `iphone_concierge` | PASS |
| `status` | `installer_pending` | `installer_pending` | PASS |
| `mac.recommendedBackend` | `mlx_macos` | `mlx_macos` | PASS |
| `mac.requiresAppleSilicon` | `true` | `true` | PASS |
| `mac.installerTrust` | present | `developer_id_notarized_or_mac_app_store` | PASS |
| `pairing.requiresUserApproval` | `true` | `true` | PASS |
| `pairing.approvalSurface` | `iphone_app` | `iphone_app` | PASS |
| `pairing.oneTimeToken` | `false` | `false` | PASS |
| `pairing.caKeyHandoff` | `false` | `false` | PASS |
| `pairing.csrSigning` | `false` | `false` | PASS |
| `pairing.requestUrl` | present | `http://192.168.0.220:17778/setup/mac/pairing` | PASS |
| `pairing.pairingEndpoint` | present | `http://192.168.0.220:17778/setup/mac/pairing` | PASS |
| `pairing.pendingRequests` | present (int) | `1` (after creating a pairing) | PASS |
| `pairing.latestRequest` | present after creation | `{hostname, requestId, status, createdAt}` | PASS |
| `homeCa.certUrl` | present | `http://192.168.0.220:17778/setup/ca.crt` | PASS |
| `homeCa.fingerprintSha256` | present | Valid SHA-256 fingerprint | PASS |

## Security Assertions

| Check | Status |
|---|---|
| No CA private key material exposed | PASS |
| No `ca.key` URL exposed in any response | PASS |
| `GET /setup/ca.key` returns 404 | PASS |
| `caKeyHandoff` is `false` | PASS |
| `csrSigning` is `false` | PASS |
| No LAN approve endpoint (`POST .../approve` → 404) | PASS |
| No LAN deny endpoint (`POST .../deny` → 404) | PASS |
| No PUT method on pairing route (→ 404) | PASS |
| No Gemma 4 reference in code or responses | PASS |

## Gemma 4 / Model Reference Check

- Source code: `mobile/ios/ihn-home/IhnHome/Runtime/NodeRuntime.swift` uses `mlx-community/Qwen2.5-1.5B-Instruct-4bit`
- Setup HTML: references `mlx-community/Qwen2.5-1.5B-Instruct-4bit`
- Zero references to "gemma" (case-insensitive) across all responses and code
- Previous model `mlx-community/gemma-4-e2b-it-4bit` fully replaced

## Live Pairing State in Manifest

After creating a pairing request, the manifest reflects live state:

- `pairing.pendingRequests` increments from 0 to 1
- `pairing.latestRequest` includes the most recent request with hostname, status, and timestamps
- `pairing.approvalSurface` confirms approval must happen through `iphone_app`
- `pairing.pairingEndpoint` and `pairing.requestUrl` expose the POST endpoint for Mac clients

## iPhone UI Approve/Deny (Code-Level Verification)

The `MacSetupScreen.swift` UI was verified through code review on the target
branch. Key findings:

- **Pairing requests section** renders when `runtime.isRunning && !runtime.pairingRequests.isEmpty`
- Each card shows hostname, IP, arch, backend, age, and truncated request ID
- **Approve button** calls `runtime.approvePairing(id:)` → `PairingStore.approve(id:)` which transitions from `.pending` only
- **Deny button** calls `runtime.denyPairing(id:)` → `PairingStore.deny(id:)` which transitions from `.pending` only
- **Expiry enforced**: 5-minute expiry window, stale requests auto-expired
- **Live polling**: UI refreshes pairing state every 2 seconds via `.task` modifier
- **Status badges**: PENDING (yellow), APPROVED (green), DENIED (red), EXPIRED (gray)
- The pairing request created via the API appeared as `status: "pending"` in the manifest

Manual on-device UI verification was not possible from the remote validation host.
The code review confirms the buttons are wired correctly to the PairingStore actor.

## Full Manifest (Initial State)

```json
{
    "homeCa": {
        "certUrl": "http://192.168.0.220:17778/setup/ca.crt",
        "fingerprintSha256": "50:67:99:18:61:C9:5E:3F:1A:01:18:62:2B:13:F7:3A:BC:98:3F:1B:E1:C2:48:43:BE:C5:9B:DF:0F:16:3F:D5"
    },
    "hostname": "iphone",
    "mac": {
        "installerTrust": "developer_id_notarized_or_mac_app_store",
        "recommendedBackend": "mlx_macos",
        "requiresAppleSilicon": true
    },
    "manifestUrl": "http://192.168.0.220:17778/setup/mac/manifest",
    "pairing": {
        "approvalSurface": "iphone_app",
        "caKeyHandoff": false,
        "csrSigning": false,
        "oneTimeToken": false,
        "pairingEndpoint": "http://192.168.0.220:17778/setup/mac/pairing",
        "pendingRequests": 0,
        "requestUrl": "http://192.168.0.220:17778/setup/mac/pairing",
        "requiresUserApproval": true
    },
    "product": "iHomeNerd",
    "setupRole": "iphone_concierge",
    "setupUrl": "http://192.168.0.220:17778/setup/mac",
    "status": "installer_pending",
    "version": "0.1.0-dev-ios"
}
```

## Full Manifest (Live — After Pairing Created)

```json
{
    "homeCa": {
        "certUrl": "http://192.168.0.220:17778/setup/ca.crt",
        "fingerprintSha256": "50:67:99:18:61:C9:5E:3F:1A:01:18:62:2B:13:F7:3A:BC:98:3F:1B:E1:C2:48:43:BE:C5:9B:DF:0F:16:3F:D5"
    },
    "hostname": "iphone",
    "mac": {
        "installerTrust": "developer_id_notarized_or_mac_app_store",
        "recommendedBackend": "mlx_macos",
        "requiresAppleSilicon": true
    },
    "manifestUrl": "http://192.168.0.220:17778/setup/mac/manifest",
    "pairing": {
        "approvalSurface": "iphone_app",
        "caKeyHandoff": false,
        "csrSigning": false,
        "latestRequest": {
            "createdAt": "2026-05-06T02:06:42Z",
            "hostname": "mac-mini-m1.local",
            "requestId": "2F081F0A-7583-4951-981C-3BEF05EBDF80",
            "status": "pending"
        },
        "oneTimeToken": false,
        "pairingEndpoint": "http://192.168.0.220:17778/setup/mac/pairing",
        "pendingRequests": 1,
        "requestUrl": "http://192.168.0.220:17778/setup/mac/pairing",
        "requiresUserApproval": true
    },
    "product": "iHomeNerd",
    "setupRole": "iphone_concierge",
    "setupUrl": "http://192.168.0.220:17778/setup/mac",
    "status": "installer_pending",
    "version": "0.1.0-dev-ios"
}
```

## Evidence Files

| File | Content |
|---|---|
| `evidence/01_health.json` | `/health` response |
| `evidence/02_trust_status.json` | `/setup/trust-status` response |
| `evidence/03_ca_crt.txt` | `/setup/ca.crt` first 5 lines |
| `evidence/04_setup_mac.html` | `/setup/mac` HTML first 40 lines |
| `evidence/05_manifest_initial.json` | `/setup/mac/manifest` before pairing |
| `evidence/06_pairing_create_201.json` | `POST /setup/mac/pairing` valid request response |
| `evidence/07_pairing_missing_hostname_400.json` | 400 for missing hostname |
| `evidence/08_pairing_missing_ip_400.json` | 400 for missing ip |
| `evidence/09_pairing_empty_body_400.json` | 400 for empty body |
| `evidence/10_pairing_poll_valid.json` | `GET /setup/mac/pairing/{id}` poll response |
| `evidence/11_pairing_poll_404.json` | 404 for invalid id |
| `evidence/12_manifest_live_pairing.json` | `/setup/mac/manifest` after pairing created |
| `evidence/13_no_gemma4_reference.txt` | Gemma 4 grep results (negative) |
| `evidence/14_security_ca_key.txt` | `/setup/ca.key` probe (404) |
| `evidence/15_no_lan_approve_deny.txt` | LAN approve/deny probes (all 404) |
| `evidence/16_iphone_ui_approve_deny.txt` | iPhone UI code-level verification |

## Blockers

No blockers encountered. All probes pass.
