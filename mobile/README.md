# iHomeNerd Mobile

Native mobile work for iHomeNerd lives here.

This repo already behaves like a monorepo:
- `backend/` for the API and control plane
- `frontend/` for the main web Command Center
- `landing/` for the public site
- `browser-extension/` for the shared bridge
- `mobile/` for native controller apps and mobile-specific docs

## Current direction

Mobile v1 is:
- a scout
- a controller
- a trust helper
- a notification surface

Mobile v1 is not:
- the main household AI brain
- the only control plane
- a pretend always-on worker for heavy models

The native app should help the user:
- discover the gateway
- pair with the home
- install and verify trust
- monitor gateway and worker health
- run selected node actions

See:
- `docs/MOBILE_REPO_STRATEGY_2026-04-24.md`
- `docs/CLAUDE_DESIGN_IHN_HOME_BRIEF_2026-04-24.md`
- `../docs/MOBILE_STRATEGY_2026-04-24.md`
- `../docs/HOST_ASSIST_VISION_2026-04-24.md`

## Structure

```text
mobile/
  android/
    ihn-home/
  ios/
  docs/
  testing/
```

`android/ihn-home/` is the native Android node-class controller app —
hosts a local iHN runtime in addition to the controller surface.

`ios/ihn-home/` is the native SwiftUI iOS app — currently controller-first,
with trust, pairing, alerts, and quick actions in front. Longer-term iOS role
should be determined by hardware/runtime capability, the same way the Android
track is, but the current iOS scaffold is still behind Android in both runtime
hosting and trust compliance. iOS scaffold landed 2026-04-25.

`docs/` holds mobile-specific product, UX, planning, and handoff documents.

`testing/` holds mobile cross-testing protocol docs, device test requests,
and result notes that should be easy for other agents and other machines to
pick up.

`design/` holds exported design artifacts, prompts, and review notes from tools
like Claude Design.

## Repo policy

Keep in repo:
- app source
- project settings
- small fixtures
- prompts and design briefs
- screenshots used in docs

Do not keep in repo:
- Android SDK
- AVD disk images
- Xcode DerivedData
- Gradle caches
- build outputs

Those remain local to each developer machine and are ignored by Git.
