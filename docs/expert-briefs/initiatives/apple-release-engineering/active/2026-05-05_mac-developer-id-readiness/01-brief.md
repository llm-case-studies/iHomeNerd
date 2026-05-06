# Expert Brief - Mac Developer ID Readiness

**Date:** 2026-05-05
**Initiative:** `apple-release-engineering`
**Status:** active sprint
**Audience:** Codex/OpenCode implementer on `mac-mini` or `Acer-HL`

## Why This Sprint Exists

The `iphone-to-mac-brain` initiative now has a validated Mac MLX runtime and
launchd lifecycle. The next customer-facing gap is distribution: a normal Mac
installer/wrapper that Gatekeeper accepts.

Before building the wrapper app, we need to know what Apple signing and
notarization assets already exist on `mac-mini`, what is missing, and what
requires human action.

## Execution Fence

- Repo: `iHomeNerd`
- Base branch: `origin/main`
- Working branch: `feature/apple-release-engineering/mac-developer-id-readiness`
- Merge target: `main` after review
- Implementation host: `mac-mini` preferred; `Acer-HL` may prepare docs only
- Build/release host under inspection: `mac-mini`
- Validation host: optional `iMac-Debian`

## References

Read first:

- `docs/expert-briefs/initiatives/apple-release-engineering/README.md`
- `docs/expert-briefs/initiatives/apple-release-engineering/APPLE_DISTRIBUTION_LANES.md`
- `docs/expert-briefs/initiatives/apple-release-engineering/SIGNING_ASSET_POLICY.md`
- `docs/expert-briefs/initiatives/iphone-to-mac-brain/README.md`
- `docs/expert-briefs/initiatives/iphone-to-mac-brain/INDEX.md`

Apple references:

- `https://developer.apple.com/support/developer-id/`
- `https://developer.apple.com/help/account/create-certificates/create-developer-id-certificates/`
- `https://developer.apple.com/documentation/security/notarizing-macos-software-before-distribution`
- `https://developer.apple.com/documentation/xcode/configuring-the-hardened-runtime`

## Scope

Create a release-readiness report for Mac Developer ID distribution.

The report should answer:

- Is Xcode installed and usable on `mac-mini`?
- Are command-line tools selected?
- Is `notarytool` available?
- Are Developer ID Application and Developer ID Installer signing identities
  present?
- Is there a known notarytool credential profile name configured?
- What team/bundle ID information can be safely documented?
- What must Alex do manually in Apple Developer / Keychain?
- What should the first placeholder notarization sprint build?

## Required Output

Add a file:

```text
docs/expert-briefs/initiatives/apple-release-engineering/MAC_DEVELOPER_ID_READINESS_2026-05-05.md
```

It should include:

- inspected host and date
- Xcode/macOS/toolchain summary
- signing identity inventory by common name only
- missing assets
- human-gated actions
- recommendation for first placeholder artifact
- risks for iHN's current installer shape

Fill:

```text
testing/initiatives/apple-release-engineering/2026-05-05_mac-developer-id-readiness/result.md
```

## Safe Commands

Suggested probes on `mac-mini`:

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

Optional, profile-name-only probe:

```bash
xcrun notarytool history --keychain-profile <profile-name> --limit 1
```

Only run that if a profile name is already known locally. Do not ask for
notary credentials in chat.

## Out Of Scope

- creating Apple Developer certificates
- exporting/importing private keys
- notarizing a real iHN app
- creating the final Mac wrapper app
- changing `install-ihomenerd-macos.sh`
- changing iOS signing settings

## Done Means

- readiness report committed
- result.md filled
- no secrets committed
- branch pushed
