# Expert Brief — iOS Mac Setup Route Smoke

**Date:** 2026-05-03
**Initiative:** `iphone-to-mac-brain`
**Status:** active sprint
**Audience:** Codex or OpenCode tester with access to the iPhone build lane

## Why This Sprint Exists

The first iPhone-to-Mac brain setup spine is merged to `main`, but the last live
iPhone validation was blocked because the iPhone was running a stale build. The
feature code existed in static analysis; the device did not have it installed.

This sprint should close that specific evidence gap. It should not grow into
pairing approval, certificate handoff, or installer redesign.

## Execution Fence

- Repo: `iHomeNerd`
- Implementation host: `mac-mini` or other Xcode-capable host
- Base branch: `origin/main`
- Working branch: `wip/testing` or a disposable validation branch
- Merge target: none unless a tiny test/doc fix is required
- Build/deploy host: `mac-mini`
- Validation host: `iMac-Debian` / `testing/initiatives/iphone-to-mac-brain/2026-05-03_ios-mac-setup-route-smoke/`

## References

Read these first:

- `docs/expert-briefs/initiatives/iphone-to-mac-brain/README.md`
- `docs/IPHONE_TO_MAC_BRAIN_SETUP_VISION_2026-05-01.md`
- `docs/APPLE_SILICON_NATIVE_MLX_HOSTING_2026-05-01.md`
- `mobile/testing/requests/IPHONE_TO_MAC_BRAIN_SETUP_AND_MLX_PROVIDER_TEST_REQUEST_2026-05-02.md`

Relevant sources:

- `mobile/ios/ihn-home/IhnHome/Runtime/NodeRuntime.swift`
- `mobile/ios/ihn-home/IhnHome/Screens/MacSetupScreen.swift`
- `mobile/ios/ihn-home/IhnHome/App/RootView.swift`

## Feature Goal

Prove the merged iOS build serves the Mac setup surface live from the phone:

- `GET http://<iphone-ip>:17778/setup/mac`
- `GET http://<iphone-ip>:17778/setup/mac/manifest`
- Bonjour advertises `_ihomenerd-setup._tcp` with `role=mac-setup`
- no Home CA private key material is exposed

## Acceptable Scope

Good outcomes:

- current `main` builds and installs on the iPhone
- the iPhone Mac tab is visible
- hosting starts
- setup routes respond with the expected HTML and JSON manifest
- the testing result records exact commands and outputs

Do **not** turn this into:

- pairing approval implementation
- certificate handoff
- macOS installer packaging
- MLX performance benchmarking
- frontend Command Center changes

## Smoke Expectations

Before handing off:

1. Build and install current `main` on the iPhone.
2. Open iHN Home.
3. Start hosting if needed.
4. Confirm the Mac setup screen shows at least one usable setup URL.
5. Run the validator request under `testing/initiatives/.../request.md`.

## Deliverables

Required:

1. A result note at:
   `testing/initiatives/iphone-to-mac-brain/2026-05-03_ios-mac-setup-route-smoke/result.md`
2. Captured command output or screenshots under:
   `testing/initiatives/iphone-to-mac-brain/2026-05-03_ios-mac-setup-route-smoke/evidence/`
3. If a code change is required, keep it tiny and explain why in the result.

## Done Means

- `/setup/mac` returns the Mac setup page from the live iPhone.
- `/setup/mac/manifest` returns JSON with `setupRole == "iphone_concierge"`.
- Manifest claims `oneTimeToken`, `caKeyHandoff`, and `csrSigning` are false.
- No CA private key URL or key material appears in HTML or JSON.
- Existing `/setup/ca.crt` and `/setup/trust-status` still work.

