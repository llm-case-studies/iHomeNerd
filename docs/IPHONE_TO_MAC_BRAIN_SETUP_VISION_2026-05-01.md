# iPhone-to-Mac Brain Setup Vision

**Date:** 2026-05-01
**Status:** Product vision + first implementation spine
**Related:** `docs/APPLE_SILICON_NATIVE_MLX_HOSTING_2026-05-01.md`

## Product Shape

The friendliest iHomeNerd onboarding path starts on the iPhone.

The user gets **iHN Home** from the App Store, turns the phone into a small local node, and later promotes an M-series Mac into the always-on home brain. This gives the user a real private AI experience before asking them to install a desktop/server runtime.

## User Journey

### 1. Start on iPhone

1. User installs iHN Home from the App Store.
2. App offers **Host this iPhone as a node**.
3. Strong iPhones can run session-local capabilities:
   - local chat via MLX
   - speech recognition / Whisper tier where available
   - Apple Vision OCR
   - trust and node discovery helpers
4. The app is honest about limits:
   - foreground/session hosting
   - battery and thermal constraints
   - smaller models
   - not the final always-on home brain

### 2. Promote a Mac

When the user wants more permanence, the app offers **Set up a Mac brain**.

1. iPhone starts a local setup server on `:17778`.
2. iPhone shows a local address, for example:

   ```text
   http://iphone-name.local:17778/setup/mac
   ```

3. User opens that address from the Mac.
4. The iPhone asks the user to approve the Mac.
5. The Mac install is initiated from the iPhone-hosted setup surface.
6. The Mac installer is still normal macOS-trusted software:
   - Mac App Store app, or
   - Developer ID signed + Apple-notarized package
7. The Mac starts iHN as a launchd service, uses native MLX on Apple Silicon, and pairs back to the iPhone.
8. iPhone offers **Make this Mac the home brain**.

## Trust Model

The iPhone app is the trusted concierge, not a way around macOS security.

What trust means:

- The user starts from an App Store iPhone app.
- The Mac connects to a local page served by that app, not an arbitrary public website.
- The iPhone can approve the specific Mac setup session.
- The Mac still verifies a Mac-native installer using Gatekeeper.
- Production Mac software should be signed and notarized, or distributed through the Mac App Store.

What trust does **not** mean:

- iPhone cannot silently install software on a Mac.
- iPhone cannot bypass Gatekeeper or user consent.
- A public Home CA private key must not be exposed from an unauthenticated setup URL.

## Certificate Handoff

Today, Python-managed nodes can reuse a whole-home CA by copying both:

- `ca.crt`
- `ca.key`

That is functional for lab-managed nodes, but too blunt for the iPhone-led App Store flow. The safer production options are:

1. **One-time approved CA-key transfer**
   - iPhone shows an approval sheet.
   - Mac presents a pairing code.
   - iPhone releases CA key material only for that one approved session.
   - Simple and compatible with the existing Python cert model.

2. **Phone-signed Mac leaf certificate**
   - Mac creates a private key and CSR.
   - iPhone signs a server certificate with the Home CA.
   - Mac receives `server.crt`, keeps `server.key`, and stores only `ca.crt`.
   - Better long-term model because the Home CA key stays on the trust authority.
   - Requires Python backend support for externally supplied server cert/key rotation.

Recommendation: implement option 1 first for managed-home MVP, then move to option 2 before broad public release.

## iOS Features Needed

- **Mac Setup screen**
  - starts the iPhone node if needed
  - displays local Mac setup URLs
  - explains the phone-first to Mac-brain migration
- **Mac setup bootstrap route**
  - `GET /setup/mac`
  - served by iHN Home on the iPhone over local HTTP
  - shows trust status, setup stage, and install options
- **Setup manifest**
  - `GET /setup/mac/manifest`
  - machine-readable status for future Mac helper/installer
- **Pairing approval**
  - one-time code
  - approve/deny sheet on iPhone
  - short expiry
- **Certificate handoff**
  - initially token-gated CA material transfer
  - later CSR signing flow
- **Migration CTA**
  - once Mac is online, mark it as preferred home brain
  - keep iPhone as controller and portable node

## macOS Features Needed

- Native Apple Silicon preflight:
  - detect `arm64`
  - detect chip family
  - require Python 3.11+
  - detect `mlx` / `mlx_lm`
  - recommend `mlx_macos` for M-series Macs
- Installer switches:

  ```bash
  IHN_MAC_LLM_BACKEND=mlx
  IHN_MLX_MODEL=mlx-community/gemma-4-e2b-it-4bit
  ```

- Launchd agents:
  - `com.ihomenerd.brain`
  - optional first-pass MLX sidecar: `com.ihomenerd.mlx`
- Later packaging:
  - Developer ID signed + notarized `.pkg`, or
  - Mac App Store helper app plus notarized privileged/helper installer where needed

## First Implementation Spine

This repo now starts the flow with:

- iOS Mac Setup screen
- iOS `GET /setup/mac`
- iOS `GET /setup/mac/manifest`
- macOS preflight fields for Apple Silicon / MLX readiness
- macOS installer switches for future MLX provider selection

The next real milestone is pairing approval plus token-gated certificate handoff.
