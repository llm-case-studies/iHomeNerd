# Result - Mac Developer ID Readiness

**Date:** 2026-05-05
**Initiative:** `apple-release-engineering`
**Sprint:** `2026-05-05_mac-developer-id-readiness`
**Inspected host:** `mac-mini`
**Branch:** `feature/apple-release-engineering/mac-developer-id-readiness`
**Commit SHA:** branch HEAD after push
**Verdict:** PASS with findings

## Summary

- `mac-mini` has Xcode, command-line tools, notarytool, codesign, pkgbuild,
  and productbuild available.
- The command-line keychain view currently exposes no valid code-signing
  identities.
- Mac Developer ID distribution is blocked on human-gated certificate/notary
  setup, not on missing Xcode tooling.
- No secrets were requested, exported, or committed.

## Evidence Files

| File | Description |
|---|---|
| `evidence/01_sw_vers.txt` | macOS 26.4.1, build 25E253 |
| `evidence/02_xcode.txt` | Xcode 26.4.1 and selected developer dir |
| `evidence/03_notarytool.txt` | notarytool present, version 1.1.1 |
| `evidence/04_codesign.txt` | codesign present; `--version` unsupported on this host |
| `evidence/05_signing_identities.txt` | 0 valid code-signing identities visible |
| `evidence/06_pkg_tools.txt` | pkgbuild/productbuild present; `--version` unsupported on this host |

## Findings

- No Developer ID Application identity is visible to `security find-identity`.
- No Developer ID Installer identity is visible to `security find-identity`.
- No Apple Development or Apple Distribution identity is visible to the shell,
  even though iPhone deployment may still work through Xcode automatic signing
  or a different account/keychain context.
- `codesign --version`, `pkgbuild --version`, and `productbuild --version` are
  not reliable version probes on this host; `xcrun -f` confirms the tools exist.

## Human-Gated Actions

- Confirm the Apple Developer Program team/account for iHN.
- Create or install Developer ID Application and Developer ID Installer
  certificates.
- Configure a notarytool credential profile by name on `mac-mini`.
- Decide whether release signing uses the login keychain or a dedicated release
  keychain.

## Recommended Next Sprint

- After signing assets exist:
  `apple-release-engineering/mac-placeholder-notarization-proof`.
