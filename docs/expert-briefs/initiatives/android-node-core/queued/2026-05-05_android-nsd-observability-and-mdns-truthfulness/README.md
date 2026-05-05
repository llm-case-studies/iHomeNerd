# Queued Sprint: Android NSD Observability and mDNS Truthfulness

**Status:** ready to cut into a coding/testing sprint  
**Initiative:** `android-node-core`

## Why this is ready

Recent device work exposed a real discrepancy:

- `M-E-21` advertises over mDNS/Bonjour as expected
- `Fold6` was reachable by direct IP, but not visible through the expected
  browse path

That means we need better truthfulness around Android service registration.

## Candidate acceptance

- expose whether NSD/mDNS registration was attempted
- expose whether registration succeeded or failed
- expose last known registration error or state transition if available
- reflect this status in a runtime-observable surface such as `/system/stats`
  and, if appropriate, `/health`

## Why this belongs in core

This is node discoverability and operational truthfulness, not client-specific
workflow. It affects every Android node regardless of ecosystem app.
