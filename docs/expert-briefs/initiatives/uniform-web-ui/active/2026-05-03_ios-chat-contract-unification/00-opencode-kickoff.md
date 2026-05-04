# OpenCode Kickoff — iOS Chat Contract Unification

Paste this into the OpenCode session on `Acer-HL` (or another Swift-aware
implementation host).

```text
You are working in repo `iHomeNerd` on `Acer-HL`.

Use this as a focused iOS contract sprint under the `uniform-web-ui`
initiative. The backend already shipped this same shape unification on
2026-05-03 (commit 4e9aa7b). This sprint brings iOS to parity.

Sprint:
docs/expert-briefs/initiatives/uniform-web-ui/active/2026-05-03_ios-chat-contract-unification/01-brief.md

Before switching branches, run:

git status --short --branch

If there are uncommitted changes, stop and report them. Do not stash, commit,
or discard anything unless Alex explicitly approves.

Then create the sprint branch:

git fetch origin
git switch -c feature/uniform-web-ui/ios-chat-contract-unification origin/main

If the branch already exists locally, switch to it and report current status
before editing files.

Read first:
- docs/ARCHITECTURE_NODE_PARITY.md (especially §3 and §8 — silent shape divergence is the canonical fabric-breaker)
- docs/expert-briefs/README.md
- docs/expert-briefs/initiatives/uniform-web-ui/README.md
- docs/expert-briefs/initiatives/uniform-web-ui/active/2026-05-03_ios-chat-contract-unification/01-brief.md
- docs/expert-briefs/initiatives/iphone-to-mac-brain/completed/2026-05/2026-05-03_mlx-chat-contract-cleanup/01-brief.md (the backend analogue you are mirroring)
- backend/app/domains/language.py (the reference implementation)
- testing/initiatives/uniform-web-ui/2026-05-03_ios-chat-contract-unification/request.md

Your fence:
- mobile/ios/ihn-home/IhnHome/Runtime/NodeRuntime.swift (handleChat handler around line 583)
- testing/initiatives/uniform-web-ui/2026-05-03_ios-chat-contract-unification/result.md
- testing/initiatives/uniform-web-ui/2026-05-03_ios-chat-contract-unification/evidence/

Do not edit Android, backend, frontend, or unrelated iOS files. Do not change
MLXEngine.swift unless the contract change requires a strictly additive helper.

Goal:
Make iOS POST /v1/chat accept both {"prompt": ...} and {"messages": [...]}
request shapes. Return a response that includes role, content, text, response,
model, backend, and provider — superset of the old shape so existing iOS
clients (the native ChatScreen) keep working. Preserve the iOS-specific
timing fields (processingTime, tokensPerSecond) as additive.

Build/deploy host: mac-mini (Xcode + paired iPhone 12 PM at 192.168.0.220).
Simulator build is sufficient for the smoke pass; device install is a plus
but not required if mac-mini access is constrained.

Before handoff:
1. Simulator build green.
2. Probe both shapes via curl per the testing request.
3. Confirm response shape matches the canonical superset.
4. Confirm error handling (400 missing/invalid, 502 engine failure) still works.
5. Treat the test request as the minimum validation floor. Add cases if you
   discover gaps during implementation.
6. Fill testing/initiatives/uniform-web-ui/2026-05-03_ios-chat-contract-unification/result.md with the final commit SHA.
7. Push feature/uniform-web-ui/ios-chat-contract-unification.
```
