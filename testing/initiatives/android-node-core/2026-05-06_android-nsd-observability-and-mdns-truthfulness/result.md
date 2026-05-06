# Result - Android NSD Observability and mDNS Truthfulness

- Verdict: PASS
- Validation commit: 0107c38
- Device: Fold6 (SM-F956U)

## Evidence

- Compiled Android app via Gradle on `iMac-macOS` targeting the branch.
- Deployed app to Fold6 via `adb`.
- Force-launched `NodeRuntimeService` to ensure `LocalNodeRuntime` is active.
- Port-forwarded the Android `17778` HTTP setup/health port via `adb`.
- Successfully curled `/health` and `/system/stats` endpoints and verified output.

## Observed NSD Fields

```json
"service_advertisement": {
  "attempted": true,
  "currently_registered": true,
  "lifecycle_state": "registered",
  "service_type": "_ihomenerd._tcp.",
  "service_name": "iHomeNerd on sm-f956u",
  "hostname": "sm-f956u.local",
  "port": 17777,
  "last_error_code": null
}
```

## Truthfulness Notes

- The runtime honestly reports that registration was `attempted` and is `currently_registered`.
- The `lifecycle_state` transitioned to `registered` smoothly.
- `service_name`, `hostname`, and `port` are explicitly listed so clients know exactly what to look for when connecting or debugging discovery.
- `last_error_code` correctly defaults to `null` on success.

## Remaining Gaps

- Complete discovery-side `avahi-browse` probe from a Linux host (e.g., `iMac-Debian`) is still needed as a final validation step since my host access was limited to `iMac-macOS` for the adb deployment and `curl` tests.
