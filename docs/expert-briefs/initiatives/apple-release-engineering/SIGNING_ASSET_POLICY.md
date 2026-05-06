# Signing Asset Policy

**Date:** 2026-05-05
**Status:** draft policy

## What Agents May Do

Agents may:

- inspect whether Xcode command-line tools exist
- inspect `xcrun notarytool` availability
- list signing identity names with `security find-identity -v -p codesigning`
- list provisioning profile filenames and metadata that do not expose secrets
- create placeholder apps, scripts, entitlements, and package recipes
- document missing signing assets and human actions
- run signing/notarization commands only when credentials are already configured
  on the build host

## What Agents Must Not Do

Agents must not:

- ask Alex to paste Apple ID passwords, app-specific passwords, private keys, or
  App Store Connect API private keys into chat
- export certificates or private keys from Keychain
- commit `.p12`, `.cer` with private key material, `.mobileprovision`, `.p8`,
  keychain files, or notary credentials
- weaken Gatekeeper, disable SIP, or remove quarantine attributes as a release
  shortcut
- silently add broad Hardened Runtime exceptions

## Human-Gated Actions

These require Alex or another Apple account holder/admin:

- enroll or renew Apple Developer Program membership
- choose individual vs organization team identity
- create Developer ID Application and Installer certificates
- install certificates/private keys into the release keychain
- create App Store Connect API key or store notarytool credentials
- approve final bundle IDs and team IDs

## Evidence To Record

Record facts, not secrets:

- Xcode version
- macOS version
- `xcrun notarytool --version` output
- `codesign --version` output
- signing identity common names, if present
- whether Developer ID Application identity exists
- whether Developer ID Installer identity exists
- whether a notarytool profile exists, by profile name only
- bundle ID under test
- entitlements file path and contents
- artifact hash
- notarization submission UUID
- stapler validation output
- Gatekeeper verification output
