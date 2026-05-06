# Android NSD Observability and mDNS Truthfulness

## Goal

Make Android node responses honest about NSD/mDNS registration state so
operators and validators can distinguish:

- discoverable and advertised
from
- only reachable by direct IP

This sprint is intentionally narrow. It is not a speculative networking
rewrite, and it is not trying to solve every discovery issue in one pass.

## Why this sprint exists

Recent device work exposed a concrete gap:

- `M-E-21` advertised over mDNS/Bonjour as expected
- `Fold6` was healthy and reachable by direct IP
- the same `Fold6` did not appear in the expected browse path

At the moment, the Android runtime does not surface whether NSD registration:

- was attempted
- succeeded
- failed
- was later unregistered

That makes real device failures hard to reason about and easy to misclassify.

