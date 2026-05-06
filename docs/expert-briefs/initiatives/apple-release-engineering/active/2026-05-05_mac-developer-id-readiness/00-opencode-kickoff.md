# OpenCode Kickoff - Mac Developer ID Readiness

You are working on the Apple release-engineering initiative.

## Read First

1. `docs/expert-briefs/initiatives/apple-release-engineering/README.md`
2. `docs/expert-briefs/initiatives/apple-release-engineering/APPLE_DISTRIBUTION_LANES.md`
3. `docs/expert-briefs/initiatives/apple-release-engineering/SIGNING_ASSET_POLICY.md`
4. `docs/expert-briefs/initiatives/apple-release-engineering/active/2026-05-05_mac-developer-id-readiness/01-brief.md`
5. `testing/initiatives/apple-release-engineering/2026-05-05_mac-developer-id-readiness/request.md`

## Branch

Start from current `origin/main` and create:

```bash
feature/apple-release-engineering/mac-developer-id-readiness
```

Do not work on `main`.

## Task

Inventory the Mac Developer ID signing/notarization readiness state for
`mac-mini`. This is a documentation/evidence sprint. Do not create, export, or
commit secrets.

Required new report:

```text
docs/expert-briefs/initiatives/apple-release-engineering/MAC_DEVELOPER_ID_READINESS_2026-05-05.md
```

Fill:

```text
testing/initiatives/apple-release-engineering/2026-05-05_mac-developer-id-readiness/result.md
```

## Important Safety Rules

- Do not ask Alex to paste Apple ID passwords, app-specific passwords, `.p8`
  keys, `.p12` files, or keychain passwords into chat.
- Do not export private keys or certificates.
- Do not commit provisioning profiles, private keys, keychains, or notary
  credentials.
- Record signing identity common names only.
- Record missing assets and human-gated actions clearly.

## Suggested Probes

Run on `mac-mini`:

```bash
sw_vers
xcodebuild -version
xcode-select -p
xcrun notarytool --version
codesign --version
security find-identity -v -p codesigning
pkgbuild --version
productbuild --version
```

If no Developer ID Application / Installer identities are present, that is a
valid result. Mark the sprint blocked on human Apple Developer account actions,
not failed.

## Handoff

Push the branch and report:

- commit SHA
- what was inspected
- what is present
- what is missing
- recommended next sprint
