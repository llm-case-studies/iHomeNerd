# Test Request - Mac Developer ID Readiness

**Date issued:** 2026-05-05
**Initiative:** `apple-release-engineering`
**Sprint:** `2026-05-05_mac-developer-id-readiness`
**Product branch:** `feature/apple-release-engineering/mac-developer-id-readiness`
**Validator host:** optional `iMac-Debian`
**Inspected host:** `mac-mini`

## What You Are Validating

Validate that the readiness report is factually supported by non-secret
evidence from `mac-mini`.

This is not a notarization test. It is an inventory and dependency test.

## Evidence To Capture

Save command output under:

```text
testing/initiatives/apple-release-engineering/2026-05-05_mac-developer-id-readiness/evidence/
```

Suggested files:

| File | Command |
|---|---|
| `01_sw_vers.txt` | `sw_vers` |
| `02_xcode.txt` | `xcodebuild -version && xcode-select -p` |
| `03_notarytool.txt` | `xcrun notarytool --version` |
| `04_codesign.txt` | `codesign --version` |
| `05_signing_identities.txt` | `security find-identity -v -p codesigning` |
| `06_pkg_tools.txt` | `pkgbuild --version && productbuild --version` |

Do not capture private keys, certificate exports, keychain dumps, passwords, or
App Store Connect API private keys.

## Assertions

- report exists:
  `docs/expert-briefs/initiatives/apple-release-engineering/MAC_DEVELOPER_ID_READINESS_2026-05-05.md`
- result.md is filled
- no secrets are committed
- missing Developer ID assets, if any, are clearly marked as human-gated
- next sprint recommendation is concrete

## Result

Fill:

```text
testing/initiatives/apple-release-engineering/2026-05-05_mac-developer-id-readiness/result.md
```

Push the branch when done.
