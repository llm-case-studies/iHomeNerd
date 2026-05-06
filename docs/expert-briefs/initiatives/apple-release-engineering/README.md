# Apple Release Engineering

## Goal

Build the repeatable Apple signing, packaging, notarization, and App Store
release discipline needed by the iHN ecosystem.

This initiative supports, but is separate from, product initiatives such as
`iphone-to-mac-brain`. Product initiatives decide what the app does; this
initiative decides how Apple artifacts are built, signed, distributed, verified,
and updated.

## Tracks

| Track | Purpose | First target |
|---|---|---|
| `ios-testflight-app-store` | iPhone/iPad signing, TestFlight, App Store Connect, App Review | iHN Home iPhone app |
| `mac-developer-id-notarization` | macOS distribution outside the Mac App Store | Mac Brain wrapper app / installer |
| `mac-native-installer-and-distribution` | customer installer UX, app/pkg/dmg shape, update/uninstall | iHomeNerd Mac installer |
| `signing-assets-and-build-hosts` | certificates, profiles, keychains, notary credentials, build-machine rules | `mac-mini` |
| `mac-app-store-later` | optional future Mac App Store lane | deferred |

## Principles

- **Do release engineering before release pressure.** Signing and notarization
  should be proven on a placeholder artifact before the production app depends
  on it.
- **Keep secrets out of agent chat and git.** Agents may inspect whether
  certificates/profiles exist, but must not export private keys, passwords, or
  App Store Connect API secrets.
- **Separate App Review from notarization.** iOS/TestFlight and Mac App Store
  go through App Review. Developer ID distribution outside the Mac App Store
  uses signing plus notarization.
- **Sign what we ship.** Apps, helper tools, command-line tools, packages, and
  disk images need explicit signing/notarization decisions.
- **Artifact evidence matters.** Every release sprint should record exact
  commit, Xcode version, certificate identity class, bundle ID, entitlements,
  package path, notarization status, and Gatekeeper verification.

## Distribution Lanes

| Lane | Apple gate | Intended iHN use |
|---|---|---|
| iOS App Store / TestFlight | App Review, provisioning, entitlements | iHN Home iPhone app |
| Mac outside App Store | Developer ID signing, Hardened Runtime, notarization, stapling | first Mac Brain installer |
| Mac App Store | App Review plus Mac sandbox expectations | later, if product shape fits |

## Human-Gated Assets

The following are expected to require Alex or another account holder/admin:

- Apple Developer Program membership and team choice
- Developer ID Application certificate
- Developer ID Installer certificate if using `.pkg`
- App Store Connect API key or notarytool credential profile
- production bundle ID choices
- certificate/private-key installation into the release keychain

Agents can prepare docs, scripts, placeholder targets, and evidence requests,
but should not ask for sensitive values in chat.

## Source References

- Apple Developer ID support:
  `https://developer.apple.com/support/developer-id/`
- Apple Developer ID certificates:
  `https://developer.apple.com/help/account/create-certificates/create-developer-id-certificates/`
- Apple notarization:
  `https://developer.apple.com/documentation/security/notarizing-macos-software-before-distribution`
- Apple hardened runtime:
  `https://developer.apple.com/documentation/xcode/configuring-the-hardened-runtime`
- Apple macOS distribution:
  `https://developer.apple.com/macos/distribution/`
