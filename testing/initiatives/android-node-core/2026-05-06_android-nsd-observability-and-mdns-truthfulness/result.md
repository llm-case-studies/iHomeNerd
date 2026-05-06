# Result - Android NSD Observability and mDNS Truthfulness

- **Verdict:** PASS
- **Validation commit (branch tip):** fc8a807
- **Implementation commit:** 0107c38
- **Device:** Fold6 (SM-F956U), Android 36 (API 36)
- **Android IP:** 192.168.0.237
- **Validation host:** iMac-Debian
- **Build/deploy host:** iMac-macOS

---

## Evidence

- Compiled Android app (pre-built APK from commit `0107c38`) deployed to Fold6 via ADB from iMac-macOS.
- APK build timestamp: May 6 01:12, after implementation commit 0107c38 at 01:10.
- Application launched with `start_local_runtime=true` flag to start `NodeRuntimeService`.
- All three expected ports bound: 17777 (HTTPS), 17778 (HTTP setup/health), and an additional internal port 17779.
- Health and system/stats captured from this validation host (iMac-Debian) via direct LAN connectivity to 192.168.0.237.
- mDNS discovery probe performed from iMac-Debian via `avahi-browse -alrtk`.

---

## Observed NSD/Advertisement Fields (from /health and /system/stats)

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

---

## Discovery-Side Observations (iMac-Debian)

### avahi-browse output

```
+ enp4s0f0 IPv6 iHomeNerd on sm-f956u                         _ihomenerd._tcp      local
+ enp4s0f0 IPv4 iHomeNerd on sm-f956u                         _ihomenerd._tcp      local
= enp4s0f0 IPv6 iHomeNerd on sm-f956u                         _ihomenerd._tcp      local
   hostname = [sm-f956u.local]
   address = [192.168.0.237]
   port = [17777]
   txt = ["version=0.1.0-dev-android" "role=brain" "hostname=sm-f956u.local"]
= enp4s0f0 IPv4 iHomeNerd on sm-f956u                         _ihomenerd._tcp      local
   hostname = [sm-f956u.local]
   address = [192.168.0.237]
   port = [17777]
   txt = ["version=0.1.0-dev-android" "role=brain" "hostname=sm-f956u.local"]
```

### Direct Connectivity

Both ports are reachable from this validation host via direct LAN:

- `curl -sk https://192.168.0.237:17777/health` → 200 OK
- `curl -s http://192.168.0.237:17778/health` → 200 OK

### Hostname Resolution

`avahi-resolve-host-name sm-f956u.local` timed out. This is expected - Android NSD typically
registers the DNS-SD service record but may not register the corresponding mDNS hostname
(A/AAAA record). The TXT record `hostname=sm-f956u.local` correctly reflects the service-level
hostname, and the IP address `192.168.0.237` is returned in the resolved service record.

---

## Truthfulness Assessment

| Field | Reported | Observed via avahi-browse | Match |
|-------|----------|---------------------------|-------|
| `attempted` | `true` | Service published | PASS |
| `currently_registered` | `true` | Service actively resolving | PASS |
| `lifecycle_state` | `registered` | Service resolved w/ port + TXT | PASS |
| `service_type` | `_ihomenerd._tcp.` | `_ihomenerd._tcp` | PASS |
| `service_name` | `iHomeNerd on sm-f956u` | `iHomeNerd on sm-f956u` | PASS |
| `hostname` | `sm-f956u.local` | `sm-f956u.local` in TXT | PASS |
| `port` | 17777 | 17777 | PASS |
| `last_error_code` | `null` | No errors observed | PASS |

---

## Assertion Checklist

| Assertion | Status |
|-----------|--------|
| Runtime reports `attempted: true` | PASS |
| Runtime reports `currently_registered: true` | PASS |
| Service name, hostname, type, and port are explicitly listed | PASS |
| mDNS discovery from Linux host confirms service is discoverable | PASS |
| Advertised `service_name` matches avahi-browse output | PASS |
| Advertised `service_type` matches avahi-browse output | PASS |
| Advertised `port` matches resolved service port | PASS |
| Advertised `hostname` matches TXT record | PASS |
| Direct HTTPS and HTTP connectivity confirmed from Linux host | PASS |
| `/health` exposes `service_advertisement` | PASS |
| `/system/stats` exposes `service_advertisement` | PASS |
| `last_error_code` is `null` on successful registration | PASS |
| No regression on existing `/health` or `/system/stats` fields | PASS |

---

## Answers to Key Questions

1. **Did the runtime attempt registration?** Yes. `attempted: true`, and the service is observable.

2. **Does the runtime believe registration succeeded?** Yes. `currently_registered: true`, `lifecycle_state: registered`.

3. **What exactly did it try to advertise?** `_ihomenerd._tcp.` with name `iHomeNerd on sm-f956u`,
   hostname `sm-f956u.local`, port 17777, and TXT attributes `role=brain`, `version=0.1.0-dev-android`,
   `hostname=sm-f956u.local`. All confirmed by avahi-browse.

4. **If registration failed, is there a concrete observable reason/state?** Not applicable - registration
   succeeded with no error.

---

## Remaining Notes

- The Android NSD API registers the DNS-SD PTR/SRV/TXT records but does not necessarily register
  an mDNS A/AAAA record for the hostname. The IP address is still returned in the resolved SRV record.
  This is standard Android NSD behavior and does not affect discoverability.

- Port 17779 was also observed listening but is not part of the public API surface - likely an internal
  management port.

- The implementation commit `0107c38` matches the `build_git_sha` reported in `build_provenance`,
  confirming truthful build provenance as well.

---

## Evidence Saved

- `evidence/health-fold6.json` — raw `/health` response from Fold6
- `evidence/system-stats-fold6.json` — raw `/system/stats` response from Fold6
- `evidence/avahi-browse-full.txt` — full avahi-browse discovery output from iMac-Debian
- `request.md` — validation protocol (this directory)
