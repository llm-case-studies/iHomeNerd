# Result - iPhone-Mac Pairing Approval

**Date:** 2026-05-05
**Initiative:** `iphone-to-mac-brain`
**Sprint:** `2026-05-04_iphone-mac-pairing-approval`
**Implementation host:** `Acer-HL`
**Base branch:** `origin/main` (`2c81a1d`)
**Working branch:** `feature/iphone-to-mac-brain/pairing-approval`
**Working commit:** `667d4d1`
**Validation host:** `iMac-Debian`
**Runtime host:** `mac-mini` (build/deploy to iPhone 12 Pro Max)
**Verdict:** IMPLEMENTED — ready for validation

## Summary

Added iPhone-owned pairing approval to the Mac setup bootstrap service.
A Mac can POST a pairing request to `:17778`, the iPhone shows it in
MacSetupScreen with Approve/Deny controls, and the Mac polls for status.
Replaced the stale Gemma 4 reference with the validated Qwen2.5 1.5B default.

## Changed Files

| File | Changes |
|---|---|
| `mobile/ios/ihn-home/IhnHome/Runtime/NodeRuntime.swift` | +270 lines — PairingStore actor, POST/GET pairing routes, async manifest with live state, Qwen2.5 default |
| `mobile/ios/ihn-home/IhnHome/Screens/MacSetupScreen.swift` | +114 lines — Pairing requests section, Approve/Deny buttons, status badges |

## New Routes

### POST /setup/mac/pairing

Accepts JSON body with required `hostname` and `ip` fields, optional `arch`
and `backend`. Returns 201 with `requestId`, `status: "pending"`, `pollUrl`,
`createdAt`, and `expiresAt`.

Invalid bodies (missing/empty hostname or ip) return 400 with a detail message.

### GET /setup/mac/pairing/{id}

Returns the pairing request status: `pending`, `approved`, `denied`, or
`expired`. Response includes `hostname`, `ip`, `arch`, `backend`, timestamps.

Unknown request IDs return 404. Expired requests are marked `expired` on poll.

### GET /setup/mac/manifest (updated)

Now served asynchronously and includes live pairing state:
- `pairing.pendingRequests`: count of pending requests
- `pairing.latestRequest`: most recent request with id, hostname, status, timestamp
- `pairing.pairingEndpoint`: the POST endpoint URL

## PairingStore Actor

Thread-safe actor managing in-memory pairing requests with:
- `create(hostname:ip:arch:backend:)` — creates a pending request with 5-minute expiry
- `get(id:)` — returns request, auto-expiring stale entries
- `approve(id:)` — marks request as approved (returns false if not pending)
- `deny(id:)` — marks request as denied (returns false if not pending)
- `pendingRequests()` — returns all pending, non-expired requests
- `latestRequest()` — returns most recent active request
- `requestCount()` — returns (pending, total) counts

## MacSetupScreen UI

- New "PAIRING REQUESTS" section appears when the setup server is running
  and there are pending requests
- Each request card shows: hostname, IP, arch badge, backend badge,
  relative age, and truncated request ID
- Status badge: PENDING (yellow), APPROVED (green), DENIED (red), EXPIRED (gray)
- Approve/Deny buttons on pending requests call the runtime's actor methods
- Status card shows pending request count when > 0
- `.task` modifier refreshes pairing state on view appear

## Gemma 4 Fix

`macSetupHTML()` developer preview command now references:
```
mlx-community/Qwen2.5-1.5B-Instruct-4bit
```
instead of `mlx-community/gemma-4-e2b-it-4bit`.

## Safety

- No CA private key is exposed through any new or modified route.
- Pairing approval/denial happens only through the iPhone app UI (not via
  any LAN-accessible route).
- Requests expire after 5 minutes, preventing stale approvals.

## Local Checks

Swift code reviewed for:
- Consistency with existing patterns (NWListener, HTTPResponse, IhnButton)
- Thread safety (PairingStore actor, @MainActor NodeRuntime, nonisolated handlers)
- Identifiable/Codable/Sendable conformance
- Existing routes backward compatibility

No syntax errors identified. Build verification must happen on `mac-mini`
with Xcode — see validation request.

## Validation Status

Pending — see
`testing/initiatives/iphone-to-mac-brain/2026-05-04_iphone-mac-pairing-approval/request.md`
for the validation plan.

## Blockers

None from implementation side. The code is ready for Xcode build and iPhone
deployment on `mac-mini`.
