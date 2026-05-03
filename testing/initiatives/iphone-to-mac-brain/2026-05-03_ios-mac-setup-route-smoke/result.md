# Result — iOS Mac Setup Route Smoke

**Status:** validated — **PASS**

## Summary

- **validation host:** `iMac-Debian`
- **validation branch:** `validation/iphone-to-mac-brain/ios-mac-setup-route-smoke`
- **tested main commit SHA:** `7dc217144943da8d8cff7053084bd1ccab32c78b`
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
| Launch | Blocked by untrusted developer profile — resolved by trusting in Settings |
| App running | Confirmed, hosting active on 17777/17778 |

### Blocker (resolved)

App launch failed with: *"Unable to launch com.ihomenerd.home because it has an invalid code signature, inadequate entitlements or its profile has not been explicitly trusted by the user."* — resolved via Settings > General > VPN & Device Management > Trust Developer.

## Route Probe Results

| # | Probe | HTTP | Status |
|---|---|---|---|
| 1 | `GET https://192.168.0.220:17777/health` | 200 | `ok: true`, `status: ok`, product `iHomeNerd`, version `0.1.0-dev-ios`, capabilities include `chat` |
| 2 | `GET http://192.168.0.220:17778/setup/trust-status` | 200 | `status: trusted`, homeCa present, serverCert present |
| 3 | `GET http://192.168.0.220:17778/setup/ca.crt` | 200 | Valid PEM certificate returned |
| 4 | `GET http://192.168.0.220:17778/setup/mac` | 200 | HTML page, title "Set up a Mac brain with iHomeNerd", serves from iPhone |
| 5 | `GET http://192.168.0.220:17778/setup/mac/manifest` | 200 | All expected fields present (see manifest below) |
| 6 | Avahi `_ihomenerd-setup._tcp` | found | `Alexs-iPhone-2.local` at `192.168.0.220:17778`, role=mac-setup |

## Manifest Assertions

| Assertion | Expected | Actual | Status |
|---|---|---|---|
| `setupRole` | `iphone_concierge` | `iphone_concierge` | PASS |
| `status` | `installer_pending` | `installer_pending` | PASS |
| `mac.recommendedBackend` | `mlx_macos` | `mlx_macos` | PASS |
| `mac.requiresAppleSilicon` | `true` | `true` | PASS |
| `pairing.requiresUserApproval` | `true` | `true` | PASS |
| `pairing.oneTimeToken` | `false` | `false` | PASS |
| `pairing.caKeyHandoff` | `false` | `false` | PASS |
| `pairing.csrSigning` | `false` | `false` | PASS |
| `homeCa.certUrl` | present | `http://192.168.0.220:17778/setup/ca.crt` | PASS |

## Security Assertions

| Check | Status |
|---|---|
| No CA private key material exposed | PASS |
| No `ca.key` URL exposed | PASS |
| `caKeyHandoff` is `false` | PASS |
| `csrSigning` is `false` | PASS |
| `GET /setup/ca.key` returns 404 | PASS |

## Full Manifest

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
    "caKeyHandoff": false,
    "csrSigning": false,
    "oneTimeToken": false,
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
| `evidence/05_manifest.json` | `/setup/mac/manifest` response |
| `evidence/06_avahi.txt` | Avahi `_ihomenerd-setup._tcp` browse |
| `evidence/07_security_ca_key_check.txt` | `/setup/ca.key` probe (404) |
| `evidence/08_security_assertions.txt` | 10 security assertion results |

## Blockers

- **Developer trust (resolved):** Initial launch failed due to untrusted developer profile. Resolved manually on iPhone via Settings > General > VPN & Device Management > Trust Developer.
- No further blockers. All probes pass.
