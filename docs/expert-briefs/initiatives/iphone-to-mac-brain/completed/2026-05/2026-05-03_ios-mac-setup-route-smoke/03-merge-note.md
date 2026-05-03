# Merge Note — iOS Mac Setup Route Smoke

## Branch

- validation branch: `validation/iphone-to-mac-brain/ios-mac-setup-route-smoke`
- merge target: `main`

## Validation Outcome

- validator: `iMac-Debian`
- tested main commit: `7dc2171`
- validation commit: `22067d8`
- build/deploy host: `mac-mini-m1.local`
- target device: iPhone 12 Pro Max at `192.168.0.220`
- result path:
  `testing/initiatives/iphone-to-mac-brain/2026-05-03_ios-mac-setup-route-smoke/result.md`
- verdict: PASS

## Notes

- code changed: no product code changed; validation evidence only
- real-device flow passed: `iMac-Debian` drove `mac-mini` build/deploy over SSH,
  Xcode installed and launched iHN Home on the iPhone, and route probes passed
  from the validation host.
- resolved blocker: Personal Team developer profile required trust on the
  iPhone via Settings > General > VPN & Device Management.
- follow-up sprint recommended: `2026-05-03_mac-mini-mlx-sidecar-smoke`
