# Test Request - iPhone-Mac Pairing Approval

**Date issued:** 2026-05-05
**Initiative:** `iphone-to-mac-brain`
**Sprint:** `2026-05-04_iphone-mac-pairing-approval`
**Target branch:** `feature/iphone-to-mac-brain/pairing-approval`
**Validation branch:** `validation/iphone-to-mac-brain/pairing-approval`
**Validation host:** `iMac-Debian`
**Runtime host:** `mac-mini` (build/deploy to iPhone 12 Pro Max)

## What You Are Validating

The iPhone MacSetupScreen now shows pending Mac pairing requests with
Approve/Deny controls. The bootstrap service on :17778 accepts POST
pairing requests from the Mac and returns pollable request IDs.

## Branch Setup

```bash
git status --short --branch
git fetch origin
git switch -c validation/iphone-to-mac-brain/pairing-approval origin/feature/iphone-to-mac-brain/pairing-approval
```

## Build and Deploy

Build the iOS app on mac-mini and deploy to iPhone 12 Pro Max:

```bash
ssh mac-mini 'cd ~/Projects/iHomeNerd && git fetch origin && git switch feature/iphone-to-mac-brain/pairing-approval && git pull --ff-only'
```

Build with Xcode, deploy to iPhone, launch the app.

## Evidence Paths

Write result to:

```text
testing/initiatives/iphone-to-mac-brain/2026-05-04_iphone-mac-pairing-approval/result.md
```

Put raw output under:

```text
testing/initiatives/iphone-to-mac-brain/2026-05-04_iphone-mac-pairing-approval/evidence/
```

## Probe 1: Existing Routes Still Work

From iMac-Debian, after starting the setup server on iPhone:

```bash
curl -s http://<iphone-ip>:17778/setup/mac/manifest | python3 -m json.tool
curl -s http://<iphone-ip>:17778/setup/mac | head -20
```

Save as:

```text
evidence/01_existing_routes.txt
```

Check that manifest includes pairing section with `requiresUserApproval: true`.

## Probe 2: Create a Pairing Request (from Mac perspective)

From iMac-Debian (simulating a Mac):

```bash
curl -s -X POST http://<iphone-ip>:17778/setup/mac/pairing \
  -H "Content-Type: application/json" \
  -d '{"hostname":"test-mac","ip":"192.168.1.100","arch":"arm64","backend":"mlx"}' | python3 -m json.tool
```

Save as:

```text
evidence/02_create_pairing.json
```

Expected: 201 response with `requestId`, `id`, `status: "pending"`, `pollUrl`.

## Probe 3: Poll Pending Status

```bash
curl -s http://<iphone-ip>:17778/setup/mac/pairing/<requestId> | python3 -m json.tool
```

Save as:

```text
evidence/03_poll_pending.json
```

Expected: `status: "pending"`, hostname, ip, arch, backend fields.

## Probe 4: Manifest Includes Pairing State

```bash
curl -s http://<iphone-ip>:17778/setup/mac/manifest | python3 -m json.tool
```

Save as:

```text
evidence/04_manifest_with_pairing.json
```

Expected: manifest includes live pairing state such as pending request count,
latest request metadata, and the POST endpoint URL. It should also advertise
that pairing requires iPhone approval and does not use CA-key handoff or CSR
signing.

## Probe 5: Invalid Pairing Request

```bash
curl -s -X POST http://<iphone-ip>:17778/setup/mac/pairing \
  -H "Content-Type: application/json" \
  -d '{"hostname":""}' | python3 -m json.tool
```

Save as:

```text
evidence/05_invalid_pairing.json
```

Expected: 400 with detail message about missing/empty hostname.

## Probe 6: Stale Gemma 4 Reference

```bash
curl -s http://<iphone-ip>:17778/setup/mac | grep -i "gemma"
```

Save as:

```text
evidence/06_no_gemma4.txt
```

Expected: no match (Gemma 4 should not appear).

## Probe 7: MacSetupScreen UI (manual)

On the iPhone:
- Start the setup server
- Create a pairing request from iMac-Debian (probe 2)
- Verify the MacSetupScreen shows the pending request
- Approve the request
- Verify the polling endpoint returns `approved`
- Create another request and deny it
- Verify polling returns `denied`

Record the UI behavior as:

```text
evidence/07_ui_approval.txt
```

## Probe 8: Security Boundary

From iMac-Debian, verify that the setup service does not expose private trust
material or LAN-accessible approval shortcuts:

```bash
curl -i http://<iphone-ip>:17778/setup/ca.key
curl -i -X POST http://<iphone-ip>:17778/setup/mac/pairing/<requestId>/approve
curl -i -X POST http://<iphone-ip>:17778/setup/mac/pairing/<requestId>/deny
curl -s http://<iphone-ip>:17778/setup/mac/manifest | python3 -m json.tool
```

Save as:

```text
evidence/08_security_boundary.txt
```

Expected:
- `/setup/ca.key` is not served.
- LAN approve/deny URLs are not served; approval/denial happens only in the iPhone app UI.
- Manifest does not include private key material, approval tokens, or a client-side approval secret.
- Manifest pairing section has `requiresUserApproval: true`, `oneTimeToken: false`, `caKeyHandoff: false`, and `csrSigning: false`.

## Pass Criteria

- Existing routes (`/setup/mac`, `/setup/mac/manifest`, `/setup/ca.crt`, etc.) still respond correctly.
- `POST /setup/mac/pairing` creates a pending request with a valid JSON body.
- `POST /setup/mac/pairing` rejects invalid bodies with 400.
- `GET /setup/mac/pairing/{id}` returns `pending`, `approved`, or `denied`.
- Unknown request ID returns 404.
- Manifest reflects current pairing request state.
- MacSetupScreen shows pending requests with Approve/Deny controls.
- No Gemma 4 reference appears in `/setup/mac` HTML output.
- No CA private key is exposed through any route.
- No unauthenticated LAN route can approve or deny a pairing request.
