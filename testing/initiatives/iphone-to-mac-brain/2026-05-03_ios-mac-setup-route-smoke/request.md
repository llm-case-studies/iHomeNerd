# Test Request — iOS Mac Setup Route Smoke

**Date issued:** 2026-05-03
**Initiative:** `iphone-to-mac-brain`
**Sprint:** `2026-05-03_ios-mac-setup-route-smoke`
**Target branch:** `main`
**Target device:** iPhone 12 Pro Max at `192.168.0.220` if reachable

## What You Are Validating

The current iPhone build serves the Mac setup surface from the bootstrap server
on `:17778`.

The previous validation attempt was blocked because the iPhone was running a
stale build that did not include `/setup/mac`. This request verifies the live
device after a fresh install from current `main`.

## Prerequisites

1. Build and install iHN Home from current `main`.
2. Open the app on the iPhone.
3. Start hosting if it does not auto-start.
4. Keep the app foregrounded and screen unlocked.

## Probe Commands

```bash
export IHN_IPHONE_BOOTSTRAP=http://192.168.0.220:17778
export IHN_IPHONE_NODE=https://192.168.0.220:17777

curl -sk "$IHN_IPHONE_NODE/health" | python3 -m json.tool
curl -s "$IHN_IPHONE_BOOTSTRAP/setup/trust-status" | python3 -m json.tool
curl -s "$IHN_IPHONE_BOOTSTRAP/setup/ca.crt" | head -5

curl -s "$IHN_IPHONE_BOOTSTRAP/setup/mac" -o /tmp/ihn-mac-setup.html
head -40 /tmp/ihn-mac-setup.html

curl -s "$IHN_IPHONE_BOOTSTRAP/setup/mac/manifest" -o /tmp/ihn-mac-setup-manifest.json
python3 -m json.tool /tmp/ihn-mac-setup-manifest.json
```

If Avahi is available:

```bash
avahi-browse -rt _ihomenerd-setup._tcp
```

## Expected Manifest Assertions

- `setupRole == "iphone_concierge"`
- `status == "installer_pending"`
- `mac.recommendedBackend == "mlx_macos"`
- `mac.requiresAppleSilicon == true`
- `pairing.requiresUserApproval == true`
- `pairing.oneTimeToken == false`
- `pairing.caKeyHandoff == false`
- `pairing.csrSigning == false`
- `homeCa.certUrl` is present

## Security Assertions

Fail the test if any response exposes:

- Home CA private key material
- a URL for `ca.key`
- `pairing.caKeyHandoff == true` before an approval/token flow exists
- `pairing.csrSigning == true` before a CSR signing flow exists

## Pass Criteria

- `/health` responds from the iPhone node.
- `/setup/trust-status` and `/setup/ca.crt` still work.
- `/setup/mac` returns HTML that explains the Mac setup flow.
- `/setup/mac/manifest` returns the expected JSON contract.
- no CA private key exposure appears.

## Result Path

Write results to:

```text
testing/initiatives/iphone-to-mac-brain/2026-05-03_ios-mac-setup-route-smoke/result.md
```

Put raw command output, screenshots, or browser captures under:

```text
testing/initiatives/iphone-to-mac-brain/2026-05-03_ios-mac-setup-route-smoke/evidence/
```

