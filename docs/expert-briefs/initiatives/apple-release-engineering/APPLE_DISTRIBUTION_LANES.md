# Apple Distribution Lanes

**Date:** 2026-05-05
**Status:** working reference

## Summary

iHN needs to master one Apple release discipline with multiple platform lanes.
The common pieces are certificates, bundle IDs, entitlements, build hosts,
versioning, and artifact evidence. The gate differs by platform.

| Platform lane | Primary artifact | Apple process | Customer expectation |
|---|---|---|---|
| iPhone / iPad | `.ipa` via App Store Connect | TestFlight / App Review | install from TestFlight or App Store |
| Mac outside App Store | `.app`, `.pkg`, or `.dmg` | Developer ID signing + notarization | download, open, Gatekeeper says it is from an identified developer |
| Mac App Store | `.app` via App Store Connect | App Review, sandbox expectations | install/update from Mac App Store |

## Mac Outside App Store

This is the recommended first Mac Brain distribution lane.

Expected customer path:

1. Download `iHomeNerd.dmg` or `iHomeNerd.pkg`.
2. Open `iHomeNerd.app` or run the installer.
3. Native wrapper/menu bar app installs or repairs the user launchd services.
4. User opens the local dashboard and pairs the iPhone.

Expected Apple requirements:

- Apple Developer Program membership
- Developer ID Application certificate for the app
- Developer ID Installer certificate if using a signed `.pkg`
- Hardened Runtime for notarized macOS executable targets
- `xcrun notarytool` submission
- `xcrun stapler` ticket stapling
- Gatekeeper verification on a clean Mac

This lane is not App Review. Apple's notary service is an automated scan for
malicious content and code-signing issues. It still matters for customer trust
because Gatekeeper checks the signature and notarization ticket.

## Mac App Store

Do not start here for the Mac Brain.

Reasons:

- App sandbox expectations may conflict with launchd service management,
  local server behavior, model downloads, and installer/repair flows.
- App Review adds product-policy friction before we have a stable installer UX.
- We can revisit this once the Mac wrapper app is mature.

## iPhone App Store

The iPhone lane remains important and should be learned in parallel. It shares
the same Apple team/signing discipline but uses App Store Connect and App
Review, not Developer ID notarization.

## Hardened Runtime In Plain English

Hardened Runtime is a macOS security mode for signed software. It turns on
system-enforced restrictions that reduce common runtime attacks. If an app needs
something the runtime restricts, the app requests a narrow entitlement.

For iHN this means:

- use the smallest entitlement set possible
- avoid broad exceptions such as disabling library validation unless proven
  necessary
- treat microphone/camera/network/background-service needs as explicit
  entitlements or user-permission decisions
- keep helper tools signed and visible in release evidence

## Dependency Notes

- `iphone-to-mac-brain` can continue product sprints before notarization is
  solved.
- Customer Mac distribution cannot be called production-ready until Developer
  ID signing and notarization are proven.
- We can prove notarization with a placeholder Mac app before the real wrapper
  app is complete.
- If the installer downloads executable code after notarization, release
  engineering must define checksum/signature verification for those downloads.
