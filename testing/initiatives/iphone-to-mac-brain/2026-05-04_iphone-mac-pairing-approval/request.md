# Test Request - iPhone-Mac Pairing Approval

**Date issued:** 2026-05-05
**Initiative:** `iphone-to-mac-brain`
**Sprint:** `2026-05-04_iphone-mac-pairing-approval`
**Product branch:** `feature/iphone-to-mac-brain/pairing-approval`
**Validator branch:** `validation/iphone-to-mac-brain/pairing-approval`
**Validation host:** `iMac-Debian`
**Build/deploy host:** `mac-mini`
**Device:** iPhone 12 Pro Max

## What You Are Validating

Validate that the iPhone-hosted Mac setup flow now has a real iPhone-owned
pairing approval step.

The Mac may request pairing and poll status. The iPhone user must approve or
deny from the app UI. No unauthenticated LAN route may approve a Mac.

## Product Commit Under Test

Record:

```bash
git rev-parse HEAD
```

from the product branch on the build host.

## Preflight

Confirm:

- iPhone 12 Pro Max is attached, paired, and trusted by `mac-mini`
- the app can build/deploy using the existing iOS workflow
- the phone and validator host are on the same LAN
- the iPhone app is launched and hosting is enabled

Save as:

```text
evidence/01_preflight.txt
```

## Build And Deploy

On `mac-mini`, build and install the product branch to iPhone 12 Pro Max using
the existing Makefile or documented iOS workflow.

Save build/deploy logs as:

```text
evidence/02_build_deploy.txt
```

If Developer Trust blocks launch, resolve it on the device and record the
steps. This is not a product failure unless the app still cannot launch after
trust is granted.

## Baseline Route Smoke

From the validator host or `mac-mini`, probe:

```text
GET /setup/trust-status
GET /setup/ca.crt
GET /setup/mac
GET /setup/mac/manifest
```

Save:

```text
evidence/03_baseline_routes.txt
evidence/04_manifest.json
```

Assert:

- `/setup/mac/manifest` returns HTTP 200 JSON
- `pairing.requiresUserApproval` is true
- `pairing.oneTimeToken` is false
- `pairing.caKeyHandoff` is false
- `pairing.csrSigning` is false
- manifest exposes a safe way to create or discover pairing requests
- `/setup/mac` no longer points developers at the known-bad Gemma 4 MLX model

## Create Pairing Request

Create a pairing request from the Mac-side route contract implemented by the
product branch. Use realistic Mac facts:

```json
{
  "hostName": "mac-mini",
  "lanIp": "192.168.0.220",
  "requestedBackend": "mlx_macos",
  "installerVersion": "dev-source"
}
```

Save request/response as:

```text
evidence/05_create_pairing_request.txt
```

Assert:

- HTTP status is successful
- response includes a request id
- initial status is `pending`
- response includes or implies a poll URL

## Pending Status Poll

Poll the request before approving it on the phone.

Save as:

```text
evidence/06_pending_status.txt
```

Assert status is `pending`.

## iPhone UI Approval

On the iPhone, verify that the request is visible in the app UI with useful
facts:

- host name
- LAN IP
- requested backend
- request age or timestamp
- request id or short fingerprint

Approve the request on the iPhone.

Record manual evidence:

```text
evidence/07_iphone_approval_notes.txt
```

Screenshots are useful if available, but notes are acceptable.

## Approved Status Poll

Poll the same request after approval.

Save as:

```text
evidence/08_approved_status.txt
```

Assert status is `approved`.

## Denial Path

Create a second request, deny it on the iPhone, and poll the result.

Save as:

```text
evidence/09_denied_status.txt
```

Assert status is `denied`.

## Security Checks

Probe for unsafe behavior:

- Home CA private key is not exposed at obvious URLs, including `/setup/ca.key`
- manifest does not include private key material
- manifest does not include a hidden approval token meant for the iPhone UI
- there is no unauthenticated LAN route that approves a request
- there is no certificate identity handoff yet

Save as:

```text
evidence/10_security_checks.txt
```

## Result

Fill:

```text
testing/initiatives/iphone-to-mac-brain/2026-05-04_iphone-mac-pairing-approval/result.md
```

Verdict values:

- `PASS`
- `PASS with findings`
- `BLOCKED`
- `FAIL`
