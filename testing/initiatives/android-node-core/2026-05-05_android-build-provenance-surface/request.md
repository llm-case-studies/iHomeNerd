# Test Request - Android Build Provenance Surface

**Date issued:** 2026-05-05
**Initiative:** `android-node-core`
**Sprint:** `2026-05-05_android-build-provenance-surface`
**Product branch:** `feature/android-node-core/build-provenance-surface`
**Validation host:** `iMac-Debian`
**Build/deploy host:** `iMac-macOS`

## What You Are Validating

Validate that Android runtime JSON now surfaces truthful build provenance and
bundled-prerequisite state.

The goal is to let testers distinguish:
- same semantic version only
from
- same actual build baseline

and to make bundled web asset / ASR prerequisite presence visible.

## Product Commit Under Test

Record from the product branch on the build host:
```bash
git rev-parse HEAD
```

## Build and Deploy

Build the branch on `iMac-macOS`, install it to at least one real Android
device, and launch the app.

Prefer validating on one of:
- `Fold6`
- `Moto-Razr`
- `M-E-21`

## Required Probes

After the runtime is started on-device, capture:
```bash
curl -sk https://127.0.0.1:17779/health
curl -sk https://127.0.0.1:17779/system/stats
```

## Assertions

Confirm that the responses now expose clear provenance:
- semantic app version
- build identifier / revision signal
- bundled Command Center asset presence
- major ASR prerequisite presence

## Truthfulness Checks
- if bundled web assets are present, runtime should not claim they are absent
- if relevant ASR model assets are absent, runtime should not claim they are present
- if branch still cannot expose a git SHA, state explicitly

## Save Evidence

Under: `testing/initiatives/android-node-core/2026-05-05_android-build-provenance-surface/evidence/`

## Result

Write findings to: `result.md`
