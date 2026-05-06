# Test Request - Android NSD Observability and mDNS Truthfulness

**Date issued:** 2026-05-06
**Initiative:** `android-node-core`
**Sprint:** `2026-05-06_android-nsd-observability-and-mdns-truthfulness`
**Product branch:** `feature/android-node-core/nsd-observability-and-mdns-truthfulness`
**Validator branch:** `validation/android-node-core/android-nsd-observability-and-mdns-truthfulness`
**Validation host:** `iMac-Debian`
**Build/deploy host:** `iMac-macOS`

## What You Are Validating

Validate that Android runtime JSON now surfaces truthful NSD/mDNS registration
state.

The goal is to let validators distinguish:

- direct-IP reachability only
from
- successful discoverable advertisement

and to expose concrete registration failure state when discoverability breaks.

## Product Commit Under Test

Record:

```bash
git rev-parse HEAD
```

from the product branch on the build host.

## Build and Deploy

Build the branch on `iMac-macOS`, install it to at least one real Android
device, and launch the app.

Prefer validating on:

- `Fold6`

If `Fold6` is unavailable, use another attached Android device and record it.

## Required Probes

After the runtime is started on-device, capture:

```bash
curl -sk https://127.0.0.1:17779/health
curl -sk https://127.0.0.1:17779/system/stats
```

or the equivalent forwarded port arrangement used by the build host.

If possible, also capture a discovery-side observation from a Linux host:

```bash
avahi-browse -alrt | rg -n "_ihomenerd|<device-name>|17777"
```

or the closest available equivalent.

## Assertions

Confirm that the responses now expose clear NSD/mDNS registration truth such as:

- registration attempted
- current registration state
- service name / hostname / service type
- advertised port
- last error code or failure state when registration did not succeed

The exact field names may differ, but the response must let a validator answer:

1. did the runtime attempt registration?
2. does the runtime believe registration succeeded?
3. what exactly did it try to advertise?
4. if registration failed, is there a concrete observable reason/state?

## Truthfulness Checks

Compare the surfaced NSD state against observable behavior:

- if the runtime reports `registered`, discovery should be plausible and not obviously contradicted by host observation
- if the runtime reports `registration_failed`, the result should record the failure code/state
- if the runtime reports `unregistered` or `idle`, the result should explain whether that matches the app/runtime lifecycle

## Save Evidence

Save:

- `/health` response
- `/system/stats` response
- short notes on observed discovery behavior

under:

```text
testing/initiatives/android-node-core/2026-05-06_android-nsd-observability-and-mdns-truthfulness/evidence/
```

## Result

Write findings to:

```text
testing/initiatives/android-node-core/2026-05-06_android-nsd-observability-and-mdns-truthfulness/result.md
```

Include:

- pass/fail verdict
- device model + Android version
- exact NSD/advertisement fields observed
- whether the fields were truthful
- discovery-side observations
- any remaining ambiguity

