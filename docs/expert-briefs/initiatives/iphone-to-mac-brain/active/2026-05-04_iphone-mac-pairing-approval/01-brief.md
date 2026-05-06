# Expert Brief - iPhone-Mac Pairing Approval

**Date:** 2026-05-05
**Initiative:** `iphone-to-mac-brain`
**Status:** active sprint
**Audience:** OpenCode implementer on `Acer-HL`

## Why This Sprint Exists

The Mac setup bootstrap routes (`/setup/mac`, `/setup/mac/manifest`) are live
and the installer path is hardening. The missing piece before certificate
handoff is an explicit pairing approval step: the Mac must request pairing
through the iPhone's setup service, and the user must approve or deny from
the iPhone app UI.

No unauthenticated LAN route should approve a Mac. The Home CA private key
must never be exposed.

## Execution Fence

- Repo: `iHomeNerd`
- Base branch: `origin/main`
- Working branch: `feature/iphone-to-mac-brain/pairing-approval`
- Merge target: `main` after validation
- Implementation host: `Acer-HL`
- Build/runtime host: `mac-mini`
- Validation host: `iMac-Debian`

## References

Read these first:

- `docs/expert-briefs/initiatives/iphone-to-mac-brain/README.md`
- `docs/expert-briefs/initiatives/iphone-to-mac-brain/LESSONS.md`
- `docs/IPHONE_TO_MAC_BRAIN_SETUP_VISION_2026-05-01.md`
- `testing/initiatives/iphone-to-mac-brain/2026-05-03_ios-mac-setup-route-smoke/result.md`

Relevant source:

- `mobile/ios/ihn-home/IhnHome/Runtime/NodeRuntime.swift`
- `mobile/ios/ihn-home/IhnHome/Screens/MacSetupScreen.swift`

## Product Goal

Add a narrow iPhone-owned approval step to the Mac setup flow:

1. A Mac can POST a pairing request to the iPhone's bootstrap service on
   `:17778`, providing its hostname, IP, architecture, and backend preference.
2. The iPhone returns a pairing request ID and a polling URL.
3. The Mac can poll `GET /setup/mac/pairing/{id}` for status: `pending`,
   `approved`, `denied`, or `expired`.
4. The iPhone MacSetupScreen shows pending requests with host, IP, backend,
   age, and request id/fingerprint.
5. The user taps Approve or Deny from the iPhone app UI.
6. Pending requests expire after 5 minutes.
7. The `POST` body is validated for basic shape (hostname, ip required; arch,
   backend optional).
8. The `/setup/mac/manifest` includes current pairing state: whether a request
   is pending and its status.

## Developer Preview Fix

The `/setup/mac` HTML currently references Gemma 4 as the default MLX model.
Change this to the validated default:

```text
mlx-community/Qwen2.5-1.5B-Instruct-4bit
```

## Out Of Scope

- Token-gated certificate handoff
- CSR signing
- CA private key transfer
- Notarized Mac installer packaging
- Mac app wrapper work
- MLX benchmark/model ladder changes
- Backend `/v1/chat` contract changes
- Launchd or installer changes

## Done Means

- `POST /setup/mac/pairing` creates a pending request and returns request ID + poll URL.
- `GET /setup/mac/pairing/{id}` returns current status.
- MacSetupScreen shows pending requests with Approve/Deny controls.
- Approved/denied status is reflected in poll responses.
- Requests expire after 5 minutes.
- Gemma 4 reference is replaced with Qwen2.5 1.5B in the setup HTML.
- Existing routes (`/setup/mac`, `/setup/mac/manifest`, `/setup/ca.crt`, etc.) still work.
- No CA private key is exposed through any new route.
- `bash -n` (N/A for Swift) — verify with a focused local check.
- result.md is filled and branch is pushed.
