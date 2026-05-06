# OpenCode Kickoff - iPhone-Mac Pairing Approval

Paste this into the OpenCode session on `Acer-HL`.

```text
You are implementing the next iHomeNerd iPhone-to-Mac Brain sprint.

Repo: iHomeNerd
Implementation host: Acer-HL
Build/runtime host: mac-mini
Validation host: iMac-Debian
Sprint:
docs/expert-briefs/initiatives/iphone-to-mac-brain/active/2026-05-04_iphone-mac-pairing-approval/01-brief.md

Start with safety:

git status --short --branch

If there are uncommitted changes, stop and report them. Do not stash, commit,
or discard anything unless Alex explicitly approves.

Then create the sprint branch:

git fetch origin
git switch -c feature/iphone-to-mac-brain/pairing-approval origin/main

If the branch already exists locally, switch to it and report current status
before editing.

Read first:
- docs/expert-briefs/README.md
- docs/expert-briefs/initiatives/iphone-to-mac-brain/README.md
- docs/expert-briefs/initiatives/iphone-to-mac-brain/LESSONS.md
- docs/expert-briefs/initiatives/iphone-to-mac-brain/active/2026-05-04_iphone-mac-pairing-approval/01-brief.md
- testing/initiatives/iphone-to-mac-brain/2026-05-04_iphone-mac-pairing-approval/request.md
- testing/initiatives/iphone-to-mac-brain/2026-05-03_ios-mac-setup-route-smoke/result.md

Your fence:
- mobile/ios/ihn-home/IhnHome/Runtime/NodeRuntime.swift
- mobile/ios/ihn-home/IhnHome/Screens/MacSetupScreen.swift
- testing/initiatives/iphone-to-mac-brain/2026-05-04_iphone-mac-pairing-approval/result.md
- testing/initiatives/iphone-to-mac-brain/2026-05-04_iphone-mac-pairing-approval/request.md, only if implementation reveals extra validation cases

Do not edit installer, backend, frontend, launchd, Android, or other iOS files.
Do not touch MLX model lists, /v1/chat, pairing/certificate handoff code beyond
this sprint.

Goal:
Add iPhone-owned pairing approval to the Mac setup bootstrap service. The Mac
POSTs a pairing request to :17778, the iPhone shows it in MacSetupScreen, and
the user approves or denies.

Requirements:
- POST /setup/mac/pairing creates a pending request (hostname, ip required)
- GET /setup/mac/pairing/{id} returns status (pending/approved/denied/expired)
- MacSetupScreen shows pending requests with Approve/Deny buttons
- /setup/mac/manifest includes current pairing state
- Requests expire after 5 minutes
- No CA private key exposed
- Replace stale Gemma 4 reference with Qwen2.5 1.5B in macSetupHTML
- Existing routes must keep working

Before handoff:
1. Review the changed Swift files for syntax and logic.
2. Fill testing/initiatives/iphone-to-mac-brain/2026-05-04_iphone-mac-pairing-approval/result.md.
3. Commit and push feature/iphone-to-mac-brain/pairing-approval.
```
