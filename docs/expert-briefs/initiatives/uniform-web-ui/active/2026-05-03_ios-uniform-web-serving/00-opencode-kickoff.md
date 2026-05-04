# OpenCode Kickoff — iOS Uniform Web Serving

Paste this into the OpenCode session on `Acer-HL` (or another Swift-aware
implementation host).

```text
You are working in repo `iHomeNerd` on `Acer-HL`.

Use this as a focused iOS HTTP-side sprint under the `uniform-web-ui`
initiative. Start by clearing branch drift from any older session.

Sprint:
docs/expert-briefs/initiatives/uniform-web-ui/active/2026-05-03_ios-uniform-web-serving/01-brief.md

Before switching branches, run:

git status --short --branch

If there are uncommitted changes, stop and report them. Do not stash, commit,
or discard anything unless Alex explicitly approves.

Then create the sprint branch:

git fetch origin
git switch -c feature/uniform-web-ui/ios-uniform-web-serving origin/main

If the branch already exists locally, switch to it and report current status
before editing files.

Read first:
- docs/ARCHITECTURE_NODE_PARITY.md (sections §2, §6, §7 are load-bearing)
- docs/expert-briefs/README.md
- docs/expert-briefs/initiatives/uniform-web-ui/README.md
- docs/expert-briefs/reference/2026-05-02_android-uniform-web-serving/ (the analogue this sprint mirrors)
- docs/expert-briefs/initiatives/uniform-web-ui/active/2026-05-03_ios-uniform-web-serving/01-brief.md
- testing/initiatives/uniform-web-ui/2026-05-03_ios-uniform-web-serving/request.md (if missing, create from the legacy request listed in testing/initiatives/uniform-web-ui/INDEX.md)

Your fence:
- mobile/ios/ihn-home/IhnHome/Runtime/NodeRuntime.swift
- mobile/ios/ihn-home/IhnHome/Resources/Console/ (if you set up bundled assets manually for testing)
- mobile/ios/ihn-home/project.yml (if Resources/Console needs to be declared)
- testing/initiatives/uniform-web-ui/2026-05-03_ios-uniform-web-serving/result.md
- testing/initiatives/uniform-web-ui/2026-05-03_ios-uniform-web-serving/evidence/

Do not edit Android, backend, frontend, or unrelated iOS files. Do not add
new /v1/* endpoints. Do not redesign native iOS UI.

Goal:
Make the iOS NodeRuntime serve the bundled Command Center SPA from
Resources/Console/ with honest fallback when assets are missing. Match
Android's serving contract: GET /, /index.html, /assets/*, SPA-fallback
for non-API paths. Existing /v1/*, /capabilities, /system/stats,
/setup/* must remain unaffected.

Build/deploy host: mac-mini (Xcode + paired iPhone 12 PM at 192.168.0.220).
You can do simulator builds from any Swift-aware host as a sanity check.

Before handoff:
1. Simulator build green (xcodebuild -destination "generic/platform=iOS Simulator").
2. Real-device smoke on iPhone if mac-mini access available; otherwise note
   why and pass to mac-mini for the device build.
3. Probe both scenarios in the testing request: bundled-assets-present
   and bundled-assets-missing.
4. Treat the test request as the minimum validation floor.
5. Fill testing/initiatives/uniform-web-ui/2026-05-03_ios-uniform-web-serving/result.md with the final commit SHA.
6. Push feature/uniform-web-ui/ios-uniform-web-serving.
```
