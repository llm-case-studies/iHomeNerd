# Android Build Provenance Surface

## Goal

Make Android node runtime responses honest about what APK was actually built and
what important bundled prerequisites are actually present.

This sprint is intentionally narrow. It is not a general Android diagnostics
rewrite. It is a provenance/truthfulness sprint motivated by real confusion
across `Fold6`, `Moto-Razr`, and `M-E-21`.

## Why this sprint exists

We already proved a painful failure mode:

- different devices appeared to be on the "same" Android version
- they were actually carrying different bundled Command Center assets and ASR
  prerequisites
- all of them still reported `0.1.0-dev-android`

The canonical-APK workflow fixed the operator side. Now the product needs to
surface that truth directly.
