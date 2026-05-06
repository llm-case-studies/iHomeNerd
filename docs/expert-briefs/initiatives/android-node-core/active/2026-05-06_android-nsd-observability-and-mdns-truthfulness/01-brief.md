# Expert Brief - Android NSD Observability and mDNS Truthfulness

**Date:** 2026-05-06
**Initiative:** `android-node-core`
**Status:** active sprint
**Audience:** OpenCode implementer on `Acer-HL`

## Why This Sprint Exists

Recent Android validation exposed a node-operability truthfulness gap.

We already know that:

- `M-E-21` advertises over mDNS/Bonjour as expected
- `Fold6` can be healthy and reachable by direct IP
- the same `Fold6` may still fail to appear in the browse path

Right now the runtime gives almost no visibility into what Android NSD
registration actually did. That makes discovery failures look like vague
"network weirdness" instead of concrete node state.

## Execution Fence

- Repo: `iHomeNerd`
- Base branch: `origin/main`
- Working branch: `feature/android-node-core/nsd-observability-and-mdns-truthfulness`
- Merge target: `main` after validation
- Implementation host: `Acer-HL`
- Build/deploy host: `iMac-macOS`
- Validation host: `iMac-Debian`

## References

Read these first:

- `docs/expert-briefs/initiatives/android-node-core/README.md`
- `docs/expert-briefs/initiatives/android-node-core/INDEX.md`
- `docs/expert-briefs/initiatives/android-node-core/queued/2026-05-05_android-nsd-observability-and-mdns-truthfulness/README.md`
- `mobile/android/ihn-home/app/src/main/java/com/ihomenerd/home/runtime/AndroidServiceAdvertiser.kt`
- `mobile/android/ihn-home/app/src/main/java/com/ihomenerd/home/runtime/LocalNodeRuntime.kt`

## Product Goal

Add a compact, honest NSD/mDNS registration surface to Android runtime JSON so
operators and validators can answer:

1. was service registration attempted?
2. what service name / hostname / service type did the runtime try to advertise?
3. did registration succeed?
4. if registration failed, what is the last known failure code/state?
5. was the service later unregistered or stopped?

## Required Runtime Shape

Add a new nested object such as `service_advertisement`, `nsd_registration`, or
similarly clear naming to:

- `/health`
- `/system/stats`

The exact field names do not matter as much as the truthfulness.

## Strong Candidate Fields

These are not mandatory exact names, but the branch should expose equivalents:

- registration attempted: true/false
- currently registered: true/false
- last lifecycle state:
  - `idle`
  - `registering`
  - `registered`
  - `registration_failed`
  - `unregistering`
  - `unregistered`
  - or another similarly clear vocabulary
- service type
- requested or effective service name
- advertised hostname attribute if available
- advertised port
- last error code if registration failed
- last status/message if available

If some of this cannot be known honestly from Android NSD callbacks, do not
invent it. Surface the strongest truth available and document the gap.

## Likely Implementation Direction

This sprint probably needs:

1. a small internal state model inside `AndroidServiceAdvertiser`
2. callback updates from the `NsdManager.RegistrationListener`
3. a runtime-readable snapshot that `LocalNodeRuntime.kt` can serialize into
   `/health` and `/system/stats`

The current problem is not that registration is definitely broken.
The current problem is that success and failure are nearly invisible.

## Out Of Scope

- a generic Android diagnostics framework
- discovery retries / backoff policy redesign
- multi-protocol discovery redesign
- explicit fallback discovery implementation
- frontend redesign
- build provenance changes
- client-app-specific workflows

## Done Means

- `/health` contains explicit Android NSD/mDNS registration truth
- `/system/stats` contains the same or a superset
- registration success/failure is observable through runtime JSON
- branch builds on `iMac-macOS`
- app installs and launches on at least one Android device
- smoke confirms the new fields are present and truthful
- result.md is filled and branch is pushed

