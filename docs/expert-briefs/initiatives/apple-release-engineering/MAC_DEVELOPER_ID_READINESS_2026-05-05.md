# Mac Developer ID Readiness

**Date:** 2026-05-05
**Initiative:** `apple-release-engineering`
**Sprint:** `2026-05-05_mac-developer-id-readiness`
**Inspected host:** `mac-mini`
**Working branch:** `feature/apple-release-engineering/mac-developer-id-readiness`
**Status:** completed - distribution blocked on human-gated signing assets

## Summary

`mac-mini` has the Apple toolchain needed to begin Mac release engineering:
Xcode is installed, command-line tools point at the full Xcode app, and
`notarytool` is available.

The current command-line keychain view does not expose any valid code-signing
identities:

```text
0 valid identities found
```

That means this host is not yet ready to sign and notarize a customer-facing Mac
artifact from the shell. This does not prove iPhone device deployment is broken.
Xcode device deployment can use automatic signing/account state that is separate
from a visible Developer ID command-line release setup.

## Toolchain Inventory

| Probe | Result |
|---|---|
| macOS | 26.4.1, build 25E253 |
| Xcode | 26.4.1, build 17E202 |
| selected developer dir | `/Applications/Xcode.app/Contents/Developer` |
| `notarytool` | present, `1.1.1 (40)` |
| `codesign` | present at `/usr/bin/codesign`; `codesign --version` is not supported on this host |
| `pkgbuild` | present at `/usr/bin/pkgbuild`; `pkgbuild --version` is not supported on this host |
| `productbuild` | present at `/usr/bin/productbuild`; `productbuild --version` is not supported on this host |

## Signing Inventory

| Asset | Present | Evidence |
|---|---|---|
| Developer ID Application identity | no | `security find-identity -v -p codesigning` reports 0 identities |
| Developer ID Installer identity | no | same |
| Apple Development identity | not visible to shell | same |
| Apple Distribution identity | not visible to shell | same |
| notarytool profile name | unknown | no profile name was provided or probed |

The default user keychain is:

```text
/Users/alex/Library/Keychains/login.keychain-db
```

The user keychain list contains the login keychain only.

## Human-Gated Actions

Alex or another Apple account holder/admin must decide and perform these steps:

- confirm Apple Developer Program team/account to use for iHN
- create or install a Developer ID Application certificate
- create or install a Developer ID Installer certificate if `.pkg` is the first
  Mac installer format
- configure a notary credential profile for `xcrun notarytool`
- decide the first production Mac bundle id, for example
  `com.ihomenerd.mac`
- decide whether release signing will use the login keychain or a dedicated
  release keychain

Do not paste Apple ID passwords, keychain passwords, `.p8`, `.p12`, or private
keys into agent chat. Use Xcode, Keychain Access, Apple Developer, or
`notarytool store-credentials` locally when the sprint explicitly reaches that
human step.

## iPhone Deployment Relationship

The existing ability to build/deploy to iPhone is a separate Apple signing lane.
It likely depends on Xcode automatic signing, iOS provisioning, and a trusted
development device.

Mac Developer ID distribution requires different release assets:

- Developer ID Application certificate for app/helper executable signing
- Developer ID Installer certificate for signed `.pkg` distribution
- notarization submission credentials
- Hardened Runtime and entitlements decisions for shipped executables

## Risk For Current Installer Shape

The current source-tree installer is useful for development and smoke tests, but
it is not a normal customer Mac distribution artifact.

Before calling the Mac path production-ready, release engineering must prove:

- signed placeholder `.app` or `.pkg`
- Hardened Runtime enabled where applicable
- successful `notarytool` submission
- successful stapling
- Gatekeeper verification on a clean host
- clear policy for any downloaded executable/model artifacts

## Recommended Next Sprint

Next human-gated milestone:

```text
apple-release-engineering/signing-asset-setup
```

Goal: install or create Developer ID Application/Installer identities and store
a notarytool credential profile on `mac-mini` without committing secrets.

Next coding/testing sprint after those assets exist:

```text
apple-release-engineering/mac-placeholder-notarization-proof
```

Goal: build a tiny placeholder Mac app or package, sign it, notarize it, staple
it, and record Gatekeeper verification evidence.
