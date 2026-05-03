# Android Server Profile Surface Test Request

**Date:** 2026-05-02  
**Requester:** OpenCode session on `Acer-HL`  
**Target branch:** `feature/android-server-profile-surface`  
**Validation lane:** `wip/testing` (testing host: `iMac-Debian`)  
**Primary build/deploy host:** `iMac-macOS`

## Goal

Validate the first Android "server profile" surface intended to make Android
node-class devices more honest and useful as semi-headless iHN nodes.

The implementation adds:

1. A **`server_readiness`** JSON block to `GET /system/stats` and `GET /health`
   with charging status, battery optimization state, network readiness, and runtime
   serving status.

2. A new **Server Readiness card** in the Android app's "This node" tab that
   shows live charging, network, runtime serving, and battery optimization state
   with color-coded readiness indicators.

## Candidate devices

- `Galaxy Z Fold6`
- `Moto-Razr`
- fallback / comparison: `M-E-21`

## Preconditions

- target branch `feature/android-server-profile-surface` is available on the Android build/deploy host
- device is attached and visible through `adb`
- app can be rebuilt and reinstalled from `iMac-macOS`
- **Note**: The **build/deploy** runs from `iMac-macOS` (the Android SDK host with USB-attached devices). The **validation/testing** runs from `iMac-Debian` on the `wip/testing` lane. The branch was already built and smoke-tested on `iMac-macOS` against `M-E-21` on 2026-05-02. The APK compiled, installed, launched, and served without errors. The `server_readiness` block appeared in both `/health` and `/system/stats`. This test request is for full validation across additional devices and scenarios.

Reference:

- `docs/ANDROID_BUILD_HOST_IMAC_MACOS_2026-04-28.md`

## Build / deploy path

```bash
ssh alex@192.168.0.117
source ~/.local/share/ihomenerd-android/env.sh
cd ~/Projects/iHomeNerd/mobile/android/ihn-home
git fetch origin
git checkout feature/android-server-profile-surface
./gradlew assembleDebug
adb devices
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

If multiple devices are connected, use serial-targeted installs:

```bash
adb -s <serial> install -r app/build/outputs/apk/debug/app-debug.apk
```

## Exact steps

### 1. Build and install

Build the APK from `feature/android-server-profile-surface` and install it on
at least one target Android device.

### 2. Launch the app and start the runtime

1. Open the app on the device.
2. In the **Session** tab, enable **Travel mode** (or press **Start runtime** from
   the **This node** tab).
3. Confirm the runtime shows "Android runtime is serving HTTPS :17777" in the
   Local Runtime card.

### 3. Inspect the new Server Readiness card (UI)

In the **This node** tab, scroll down past the Connection and Local Runtime cards.
Find the **Server Readiness** card. Verify it shows:

- **Charging** state (green "Charging" if plugged in, amber "Not charging" if on battery)
- **Network OK** (green with the device's LAN IP) or **No LAN** (amber)
- **Serving** (green with `:17777/:17778`) or **Stopped** (red)
- **Battery opt** status (green "Exempted" or amber "Not exempted")

If the runtime is running but the device is not charging AND battery optimization
is not exempted, verify the card shows **"Server degraded"** with appropriate
warning text below the chip row.

### 4. Probe `/system/stats` for server_readiness

From a laptop or within the device, probe:

```bash
# Over adb forward (from the iMac):
adb -s <serial> forward tcp:37779 tcp:17777
curl -s --insecure https://127.0.0.1:37779/system/stats | python3 -m json.tool

# Or directly against the device's LAN IP:
curl -s --insecure https://<device-ip>:17777/system/stats | python3 -m json.tool
```

Verify the response includes a `server_readiness` block containing:

```json
{
  "runtime_running": true,
  "ports_serving": [17777, 17778],
  "is_charging": true|false|null,
  "charging_source": "ac"|"usb"|"wireless"|null,
  "battery_percent": <int>,
  "battery_temp_c": <float>,
  "battery_optimization_exempt": true|false|null,
  "thermal_status": "none"|"light"|...,
  "app_memory_pss_bytes": <int>,
  "process_cpu_percent": <float>,
  "total_ram_bytes": <int>,
  "network_transport": "wifi"|...,
  "network_ready": true|false,
  "readiness_level": "ready"|"degraded"|"not_ready",
  "readiness_notes": ["..."]
}
```

### 5. Probe `/health` for server_readiness

```bash
curl -s --insecure https://127.0.0.1:37779/health | python3 -m json.tool
```

Verify `/health` also includes the `server_readiness` block with the same schema.

### 6. Check regression on :17777 and :17778

Verify that all pre-existing endpoints still respond correctly:

```bash
# Setup port (HTTP)
curl -s http://127.0.0.1:37780/setup/trust-status | python3 -m json.tool
curl -s http://127.0.0.1:37780/setup/ca.crt | head -1

# Runtime port (HTTPS)
curl -s --insecure https://127.0.0.1:37779/capabilities | python3 -m json.tool
curl -s --insecure https://127.0.0.1:37779/discover | python3 -m json.tool
```

### 7. Test truthfulness

1. **Unplug the device** from power while the runtime is running.
2. Refresh the app screen (switch tabs and back to "This node").
3. Verify the Server Readiness card now shows **"Not charging"** and the
   readiness level changes to **"degraded"**.
4. Probe `/system/stats` again and verify `is_charging` is now `false`.
5. **Plug the device back in** and verify the indicators return to "Charging"
   with the corrected readiness level.

### 8. Test with battery optimization (if applicable)

1. Go to Android **Settings > Apps > iHN Home > Battery > Battery optimization**.
2. If the app is currently "Optimized", the Server Readiness card should show
   **"Not exempted"** and a warning about background restrictions.
3. If possible, switch to "Don't optimize", restart the runtime, and verify the
   card shows **"Exempted"**.

## Expected results

- The **Server Readiness card** appears in the Android UI under "This node" tab
  with truthful charging, network, runtime, and battery optimization indicators.
- `GET /system/stats` includes a `server_readiness` block with `readiness_level`
  and `readiness_notes`.
- `GET /health` includes the same `server_readiness` block.
- `readiness_level` is `ready` when the device is charging, on Wi-Fi, runtime
  serving, and battery optimized.
- `readiness_level` changes to `degraded` when any concern is present (not
  charging, battery not exempted, no LAN, etc.).
- `readiness_level` is `not_ready` when the runtime is stopped or no LAN is
  available.
- No regression in existing endpoints on `:17777` and `:17778`.

## Capture back

- Screenshots of the Server Readiness card in three states:
  1. Device plugged in, runtime running, Wi-Fi connected ("ready")
  2. Device unplugged, runtime running ("degraded" - not charging)
  3. Runtime stopped ("not_ready")
- `/system/stats` excerpt showing the `server_readiness` block
- `/health` excerpt showing the `server_readiness` block
- Device model / Android version
- Any runtime or serving regressions observed

## Pass / fail rule

Pass if:

- the Server Readiness card exists in the Android UI and is understandable
- `/system/stats` and `/health` return a truthful `server_readiness` block
- `is_charging` and `readiness_level` reflect real device state
- the surface helps judge whether the device is ready for semi-headless node duty
- no regression in serving behavior on `:17777` / `:17778`

Fail if:

- the Server Readiness card is missing from the UI
- `server_readiness` is missing from `/system/stats` or `/health`
- charging or readiness data is inaccurate or misleading
- the surface depends on guessed or hardcoded data
- existing endpoints on `:17777` or `:17778` are broken

## Result location

Write the result under:

- `mobile/testing/results/`

Suggested filename:

- `ANDROID_SERVER_PROFILE_SURFACE_RESULTS_2026-05-02.md`

