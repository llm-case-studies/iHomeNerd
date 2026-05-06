# Test Request — iPhone-Mac Pairing Approval

**Date issued:** 2026-05-04
**Initiative:** `iphone-to-mac-brain`
**Sprint:** `2026-05-04_iphone-mac-pairing-approval`
**Target branch:** `feature/iphone-to-mac-brain/pairing-approval`
**Target SHA:** `32c93af`
**Target device:** iPhone 12 Pro Max at `192.168.0.220` if reachable

## What You Are Validating

The pairing-approval feature adds POST/GET pairing routes, a PairingStore actor,
and MacSetupScreen UI allowing the iPhone user to approve or deny Mac pairing
requests from the device itself. Approval is only possible through the iPhone UI
— no LAN shortcut exists.

## Prerequisites

1. Build and install iHN Home from `feature/iphone-to-mac-brain/pairing-approval`
   at commit `32c93af`.
2. Open the app on the iPhone.
3. Start hosting if it does not auto-start.
4. Keep the app foregrounded and screen unlocked.

## SSH Build/Deploy Path

Validation runs from `iMac-Debian`. iOS build and device deploy run through
the Apple build host `mac-mini`:

```bash
ssh -o BatchMode=yes mac-mini hostname
# Expected: mac-mini-m1.local

cd mobile/ios/ihn-home
export IHN_KEYCHAIN_PW
make remote-device-launch MAC_HOST=mac-mini MAC_USER=alex \
  DEVICE_ID='D46E3DE5-3D7A-5091-BBEC-009330C30B6D'
```

## Probe Commands

```bash
export IHN_IPHONE_BOOTSTRAP=http://192.168.0.220:17778
export IHN_IPHONE_NODE=https://192.168.0.220:17777

# Probe 1: Existing setup routes
curl -sk "$IHN_IPHONE_NODE/health" | python3 -m json.tool
curl -s "$IHN_IPHONE_BOOTSTRAP/setup/trust-status" | python3 -m json.tool
curl -s "$IHN_IPHONE_BOOTSTRAP/setup/ca.crt" | head -5
curl -s "$IHN_IPHONE_BOOTSTRAP/setup/mac" -o /tmp/ihn-mac-setup.html && head -40 /tmp/ihn-mac-setup.html
curl -s "$IHN_IPHONE_BOOTSTRAP/setup/mac/manifest" | python3 -m json.tool

# Probe 2: POST /setup/mac/pairing — valid request (201)
curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "$IHN_IPHONE_BOOTSTRAP/setup/mac/pairing" \
  -H "Content-Type: application/json" \
  -d '{"hostname":"mac-mini-m1.local","ip":"192.168.0.221","arch":"arm64","backend":"mlx_macos"}'

# Probe 3: POST /setup/mac/pairing — missing hostname (400)
curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "$IHN_IPHONE_BOOTSTRAP/setup/mac/pairing" \
  -H "Content-Type: application/json" \
  -d '{"ip":"192.168.0.221"}'

# Probe 4: POST /setup/mac/pairing — missing ip (400)
curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "$IHN_IPHONE_BOOTSTRAP/setup/mac/pairing" \
  -H "Content-Type: application/json" \
  -d '{"hostname":"mac-mini-m1.local"}'

# Probe 5: POST /setup/mac/pairing — empty body (400)
curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "$IHN_IPHONE_BOOTSTRAP/setup/mac/pairing" \
  -H "Content-Type: application/json" -d ''

# Probe 6: GET /setup/mac/pairing/{id} — poll valid request
curl -s "$IHN_IPHONE_BOOTSTRAP/setup/mac/pairing/{id}"

# Probe 7: GET /setup/mac/pairing/{id} — 404 for invalid id
curl -s -w "\nHTTP_CODE:%{http_code}" "$IHN_IPHONE_BOOTSTRAP/setup/mac/pairing/00000000-0000-0000-0000-000000000000"

# Probe 8: GET /setup/mac/manifest — live pairing state
curl -s "$IHN_IPHONE_BOOTSTRAP/setup/mac/manifest" | python3 -m json.tool

# Probe 9: No Gemma 4 reference
curl -s "$IHN_IPHONE_BOOTSTRAP/setup/mac" | grep -i gemma
curl -s "$IHN_IPHONE_BOOTSTRAP/setup/mac/manifest" | grep -i gemma

# Probe 10: Security — no ca.key exposure
curl -s -w "\nHTTP_CODE:%{http_code}" "$IHN_IPHONE_BOOTSTRAP/setup/ca.key"

# Probe 11: Security — no LAN approve/deny shortcut
curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "$IHN_IPHONE_BOOTSTRAP/setup/mac/pairing/{id}/approve"
curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "$IHN_IPHONE_BOOTSTRAP/setup/mac/pairing/{id}/deny"
```

## Expected Manifest Assertions

- `setupRole == "iphone_concierge"`
- `status == "installer_pending"`
- `mac.recommendedBackend == "mlx_macos"`
- `mac.requiresAppleSilicon == true`
- `pairing.requiresUserApproval == true`
- `pairing.approvalSurface == "iphone_app"`
- `pairing.oneTimeToken == false`
- `pairing.caKeyHandoff == false`
- `pairing.csrSigning == false`
- `pairing.requestUrl` is present
- `pairing.pairingEndpoint` is present
- `pairing.pendingRequests` is present (integer)
- `homeCa.certUrl` is present
- `homeCa.fingerprintSha256` is present

## Pairing Route Assertions

- `POST /setup/mac/pairing` with valid body returns 201 with `id`, `requestId`, `status: "pending"`, `pollUrl`, `createdAt`, `expiresAt`
- `POST /setup/mac/pairing` with missing `hostname` returns 400 `"missing or empty 'hostname'"`
- `POST /setup/mac/pairing` with missing `ip` returns 400 `"missing or empty 'ip'"`
- `POST /setup/mac/pairing` with empty body returns 400 `"expected JSON body"`
- `GET /setup/mac/pairing/{id}` returns full pairing request with `hostname`, `ip`, `arch`, `backend`, `status`
- `GET /setup/mac/pairing/{invalid}` returns 404 `"pairing request not found"`
- `GET /setup/mac/pairing/` (no id) returns 400 `"missing request id"`

## Security Assertions

Fail the test if any response exposes:
- Home CA private key material
- a URL for `ca.key`
- `pairing.caKeyHandoff == true` before an approval/token flow exists
- `pairing.csrSigning == true` before a CSR signing flow exists
- LAN-based approve/deny endpoint (POST/PUT to any /pairing/ path other than the create route)
- Any reference to Gemma 4 (verify model is Qwen2.5-1.5B-Instruct-4bit)

## Pass Criteria

- `/health` responds from the iPhone node.
- `/setup/trust-status` and `/setup/ca.crt` still work.
- `/setup/mac` returns HTML that explains the Mac setup flow.
- `/setup/mac/manifest` returns the expected JSON contract with live pairing state.
- `POST /setup/mac/pairing` accepts valid requests and rejects invalid ones.
- `GET /setup/mac/pairing/{id}` polls pairing status correctly.
- Manifest includes `latestRequest` and `pendingRequests` after a pairing is created.
- No CA private key exposure.
- No LAN approve/deny shortcut.
- No Gemma 4 reference in code or responses.

## Result Path

Write results to:

```text
testing/initiatives/iphone-to-mac-brain/2026-05-04_iphone-mac-pairing-approval/result.md
```

Put raw command output under:

```text
testing/initiatives/iphone-to-mac-brain/2026-05-04_iphone-mac-pairing-approval/evidence/
```
