# Expert Brief - iPhone-Mac Pairing Approval

**Date:** 2026-05-05
**Initiative:** `iphone-to-mac-brain`
**Status:** active
**Audience:** OpenCode implementer

## Why This Sprint Exists

The iPhone can already serve the bootstrap routes needed by a Mac:

- `GET /setup/mac`
- `GET /setup/mac/manifest`
- `GET /setup/ca.crt`
- `GET /setup/trust-status`

Real iPhone 12 Pro Max route smoke passed, and the Mac launchd/MLX lane is now
validated. The next product risk is consent. The current Mac setup page says
the iPhone will approve the Mac, but no approval state exists yet.

This sprint adds that explicit iPhone-owned approval step without jumping ahead
to certificate handoff.

## Execution Fence

- Repo: `iHomeNerd`
- Base branch: `origin/main`
- Working branch: `feature/iphone-to-mac-brain/pairing-approval`
- Merge target: `main` after validation
- Implementation host: `Acer-HL` or another Swift-aware OpenCode host
- Build/deploy host: `mac-mini`
- Validation host: `iMac-Debian`
- Real device: iPhone 12 Pro Max when validation reaches build/deploy

## References

Read these first:

- `docs/expert-briefs/initiatives/iphone-to-mac-brain/README.md`
- `docs/expert-briefs/initiatives/iphone-to-mac-brain/LESSONS.md`
- `testing/initiatives/iphone-to-mac-brain/2026-05-03_ios-mac-setup-route-smoke/result.md`
- `testing/initiatives/iphone-to-mac-brain/2026-05-04_mac-launchd-sidecar-service/result.md`

Relevant source:

- `mobile/ios/ihn-home/IhnHome/Runtime/NodeRuntime.swift`
- `mobile/ios/ihn-home/IhnHome/Screens/MacSetupScreen.swift`
- `mobile/ios/ihn-home/IhnHome/Screens/PairScreen.swift`
- `mobile/ios/ihn-home/Makefile`

## Product Goal

When a Mac opens the iPhone-hosted setup route, the Mac should be able to ask
for approval. The iPhone user should see the request in the app and approve or
deny it. The Mac should only learn the result by polling request status.

This gives us a real consent gate before the future token-gated certificate
handoff sprint.

## Boundary Model

Allowed over LAN:

- request creation
- request status polling
- safe setup manifest reads
- Home CA public certificate download

Not allowed over unauthenticated LAN:

- approve request
- deny request
- expose Home CA private key
- mint or hand out a Mac identity certificate
- change iPhone trust settings

Approval and denial belong to the iPhone app UI. If implementation introduces a
route for UI actions, it must be protected by an app-local secret that is never
included in the Mac-facing setup page, manifest, or response bodies. Prefer not
adding such a route in this sprint unless it is clearly needed.

## Suggested Route Contract

The exact shape can vary with the existing Swift HTTP helpers, but keep the
contract simple and explicit.

Create request:

```http
POST /setup/mac/pairing-requests
content-type: application/json

{
  "hostName": "alex-mac-mini",
  "lanIp": "192.168.0.220",
  "requestedBackend": "mlx_macos",
  "installerVersion": "dev-source"
}
```

Response:

```json
{
  "id": "short-random-id",
  "status": "pending",
  "createdAt": "2026-05-05T12:00:00Z",
  "expiresAt": "2026-05-05T12:10:00Z",
  "pollUrl": "http://iphone.local:17778/setup/mac/pairing-requests/short-random-id"
}
```

Poll status:

```http
GET /setup/mac/pairing-requests/<id>
```

Response:

```json
{
  "id": "short-random-id",
  "status": "pending",
  "hostName": "alex-mac-mini",
  "lanIp": "192.168.0.220",
  "requestedBackend": "mlx_macos",
  "createdAt": "2026-05-05T12:00:00Z",
  "expiresAt": "2026-05-05T12:10:00Z"
}
```

Statuses:

- `pending`
- `approved`
- `denied`
- `expired`
- `unknown` or 404 for missing ids

## Manifest Expectations

Keep `GET /setup/mac/manifest` safe to fetch from any Mac on the LAN. It should
continue to report that pairing requires user approval.

Add or refine manifest fields so clients can discover the pairing endpoints:

```json
{
  "pairing": {
    "requiresUserApproval": true,
    "oneTimeToken": false,
    "caKeyHandoff": false,
    "csrSigning": false,
    "requestUrl": "http://iphone.local:17778/setup/mac/pairing-requests",
    "approvalSurface": "iphone_app"
  }
}
```

Do not report `oneTimeToken`, `caKeyHandoff`, or `csrSigning` as true in this
sprint.

## iPhone UI Expectations

The iPhone app should make pending Mac requests visible without requiring the
operator to inspect logs.

Minimum useful UI:

- pending request count on the Mac setup screen or nearby setup surface
- host/IP/backend/request age displayed for each pending request
- Approve and Deny actions
- clear state after an action is taken

Keep styling consistent with the existing iOS app. This is a product workflow,
not a demo page.

## Developer Preview Fix

The current Mac setup preview command may still reference:

```text
mlx-community/gemma-4-e2b-it-4bit
```

That model was rejected by real MLX validation for `mlx-lm==0.31.3`. Update the
preview to use the validated default or omit `IHN_MLX_MODEL` entirely so the
installer default is used.

Validated default:

```text
mlx-community/Qwen2.5-1.5B-Instruct-4bit
```

## State And Expiration

This sprint can keep pairing state in memory. Persistence across iPhone app
restarts is not required unless it falls out naturally from existing state
helpers.

Recommended defaults:

- random non-guessable request id
- request expires after 10 minutes
- old expired requests are hidden or grouped separately in the UI
- no approved request grants certificate material yet

## Out Of Scope

- token-gated certificate handoff
- CSR signing
- CA private key transfer
- Mac installer notarization
- Mac `.app` packaging
- launchd service changes
- MLX model benchmarking
- backend chat contract changes

## Done Means

- Mac setup manifest advertises the pairing request contract.
- Mac can create a pairing request.
- Mac can poll the request status.
- iPhone UI shows pending requests.
- iPhone UI can approve or deny a request.
- Mac polling reflects approved/denied state after the phone action.
- No unauthenticated LAN route can approve a request.
- Home CA private key is still not exposed.
- Existing setup routes still pass.
- Stale Gemma 4 preview command is fixed or removed.
- Result file is filled and branch is pushed.
