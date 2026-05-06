# OpenCode Kickoff - iPhone-Mac Pairing Approval

You are implementing the next sprint in the `iphone-to-mac-brain` initiative.

## Read First

1. `docs/expert-briefs/initiatives/iphone-to-mac-brain/README.md`
2. `docs/expert-briefs/initiatives/iphone-to-mac-brain/LESSONS.md`
3. `docs/expert-briefs/initiatives/iphone-to-mac-brain/INDEX.md`
4. `docs/expert-briefs/initiatives/iphone-to-mac-brain/active/2026-05-04_iphone-mac-pairing-approval/01-brief.md`
5. `testing/initiatives/iphone-to-mac-brain/2026-05-04_iphone-mac-pairing-approval/request.md`

Useful recent references:

- `testing/initiatives/iphone-to-mac-brain/2026-05-03_ios-mac-setup-route-smoke/result.md`
- `testing/initiatives/iphone-to-mac-brain/2026-05-04_mac-launchd-sidecar-service/result.md`

## Branch

Start from current `origin/main` and create:

```bash
feature/iphone-to-mac-brain/pairing-approval
```

Do not work on `main`.

## Task

Add a narrow iPhone-owned approval step to the Mac setup flow.

The Mac may request pairing and poll request status through the iPhone bootstrap
HTTP service on `:17778`, but approval or denial must happen in the iPhone app
UI. Do not add an unauthenticated LAN route that approves a Mac.

Primary files are likely:

```text
mobile/ios/ihn-home/IhnHome/Runtime/NodeRuntime.swift
mobile/ios/ihn-home/IhnHome/Screens/MacSetupScreen.swift
```

Secondary files may include nearby Swift models/views if the existing structure
asks for it.

Expected behavior:

- `/setup/mac` lets a Mac create or learn how to create a pairing request
- `/setup/mac/manifest` reports the pairing contract and current safety flags
- a Mac can poll a pending request and see `pending`, `approved`, `denied`, or
  `expired`
- the iPhone UI shows pending Mac requests with useful facts, such as host,
  IP, requested backend, request age, and request id/fingerprint
- the iPhone user can approve or deny from the app UI
- the Home CA private key is never exposed
- the current trust/setup routes keep working

Also fix any stale developer-preview setup command that still references the
known-bad Gemma 4 Mac MLX default. The validated default is:

```text
mlx-community/Qwen2.5-1.5B-Instruct-4bit
```

## Out Of Scope

- token-gated certificate handoff
- CSR signing
- CA private key transfer
- notarized Mac installer packaging
- Mac app wrapper work
- MLX benchmark/model ladder changes
- backend `/v1/chat` contract changes

## Validation Expectations

Before handoff, run what you can locally:

- Swift build or project generation checks available on the implementation host
- any focused unit/static checks that are already part of the iOS workflow
- route smoke with simulator or local app if available
- update `testing/initiatives/iphone-to-mac-brain/2026-05-04_iphone-mac-pairing-approval/request.md`
  if your implementation reveals additional failure cases validators should
  check

If your host cannot build or deploy the iOS app, do not fake a PASS. Fill the
result with local evidence and mark mac-mini/iPhone validation as required.

## Result

Fill:

```text
testing/initiatives/iphone-to-mac-brain/2026-05-04_iphone-mac-pairing-approval/result.md
```

Include:

- branch
- commit SHA
- changed files
- local checks run
- whether the branch was pushed
- any validation-specific notes for iMac-Debian and mac-mini
