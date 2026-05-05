# Test Request - Android Build Provenance Surface

**Date issued:** 2026-05-05
**Initiative:** `android-node-core`
**Sprint:** `2026-05-05_android-build-provenance-surface`
**Product branch:** `feature/android-node-core/build-provenance-surface`
**Validator branch:** `validation/android-node-core/android-build-provenance-surface`
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

Record:

```bash
git rev-parse HEAD
```

from the product branch on the build host.

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

or the equivalent forwarded port arrangement used by the build host.

## Assertions

Confirm that the responses now expose clear provenance such as:

- semantic app version
- build identifier / revision signal
- bundled Command Center asset presence
- major ASR prerequisite presence

The exact field names may differ, but the response must let a validator answer:

1. what build am I running?
2. are bundled web assets really present?
3. are major ASR prerequisites really present?

## Truthfulness Checks

Compare the surfaced provenance against the actual installation context:

- if bundled web assets are present, the runtime should not claim they are absent
- if the relevant ASR model assets are absent, the runtime should not claim they are present
- if the branch still cannot expose a git SHA, the result note must state that explicitly

## Save Evidence

Save:

- `/health` response
- `/system/stats` response
- short notes on observed asset reality

under:

```text
testing/initiatives/android-node-core/2026-05-05_android-build-provenance-surface/evidence/
```

## Result

Write findings to:

```text
testing/initiatives/android-node-core/2026-05-05_android-build-provenance-surface/result.md
```

Include:

- pass/fail verdict
- device model + Android version
- exact provenance fields observed
- whether the fields were truthful
- any remaining ambiguity
