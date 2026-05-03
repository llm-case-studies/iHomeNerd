# Android Model Catalog Test Request

**Date:** 2026-05-02  
**Requester:** Alex / OpenCode  
**Target branch:** `feature/android-model-catalog`  
**Validation lane:** `wip/testing`  
**Primary build/deploy host:** `iMac-macOS`

## Goal

Validate the first honest Android model-catalog surface for the local runtime.

This sprint is expected to expose a runtime-facing catalog such as
`GET /v1/models` and to align the native `Models` tab more closely with that
catalog.

The important truth to validate is not "how pretty is the tab?" but:

- does the Android node report local packs/models honestly?
- does it distinguish loaded vs loadable vs unavailable/experimental?
- can a tester or client map capabilities to actual local packs/backends?

## Pre-smoke status (OpenCode, 2026-05-02)

The following was already validated during implementation:

- **Build**: `./gradlew assembleDebug` succeeded on iMac-macOS (36 tasks, 6s)
- **Install**: APK installed successfully on Motorola Edge 2021 (ZY22GQPKG6)
- **Launch**: App launched with local runtime, no crash
- **Runtime**: Both :17777 and :17778 serving confirmed

### Pre-validated endpoint results

| Endpoint | Status | Notes |
|---|---|---|
| `GET /v1/models` | 200 OK | 6 entries, 5 packs, truthful load_state/backend/experimental |
| `GET /health` | 200 OK | `ok: true`, 5 capabilities, `server_readiness` present |
| `GET /capabilities` | 200 OK | 5 true, 1 false (translate_text) |
| `GET /discover` | 200 OK | role: brain, 4 models listed |
| `GET /setup/trust-status` (:17778) | 200 OK | `status: trusted` |

### `/v1/models` summary from smoke

```json
{
  "total_packs": 5,
  "loaded_packs": 4,
  "loadable_packs": 1,
  "experimental_packs": 1,
  "summary": {
    "loaded": ["PronunCo Pinyin Tools", "Android TTS Local", "Android Gemma Chat Local", "Android ASR Local"],
    "loadable": ["Translate Small (preview)"],
    "unavailable": [],
    "experimental": ["Android Gemma Chat Local"],
    "capability_map": {
      "chat": "android_gemma_local",
      "compare_pinyin": "kotlin_local",
      "normalize_pinyin": "kotlin_local",
      "synthesize_speech": "android_tts_service",
      "transcribe_audio": "sherpa_onnx_moonshine"
    }
  }
}
```

**Note**: The branch commit exists locally on both Acer-HL and iMac-macOS but could not be pushed to origin (no GitHub auth on either machine). The next validator should either:
1. Push the branch from a machine with GitHub credentials, or
2. Rebuild from the synced source files on iMac-macOS (already committed there as `8ab5671`)

## Candidate devices

- `Galaxy Z Fold6`
- `Moto-Razr`
- fallback / comparison: `M-E-21` (Motorola Edge 2021, ZY22GQPKG6) — **already smoke-tested**

## Preconditions

- target branch is available on the Android build/deploy host (or source files are synced on iMac-macOS)
- device is attached and visible through `adb`
- app can be rebuilt and reinstalled from `iMac-macOS`

Reference:

- `docs/ANDROID_BUILD_HOST_IMAC_MACOS_2026-04-28.md`

## Build / deploy path

```bash
ssh iMac-macOS
source ~/.local/share/ihomenerd-android/env.sh
cd ~/Projects/iHomeNerd/mobile/android/ihn-home
git fetch origin
git checkout feature/android-model-catalog
./gradlew assembleDebug
adb devices
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

If the branch is not yet pushed to origin, the commit `8ab5671` already exists on the iMac's local checkout.

If multiple devices are connected, use serial-targeted installs.

## Exact steps

### 1. Build and install

Build the APK from `feature/android-model-catalog` and install it on at least
one target Android device.

### 2. Launch the app and start the runtime

1. Open the app on the device.
2. Start the Android local runtime if it is not already running.
3. Confirm existing serving still works on `:17777` / `:17778`.

### 3. Probe the model catalog endpoint

Probe the new runtime surface directly.

If the sprint implemented `GET /v1/models`, use:

```bash
adb -s <serial> forward tcp:37779 tcp:17777
curl -s --insecure https://127.0.0.1:37779/v1/models | python3 -m json.tool
```

Or probe over LAN:

```bash
curl -s --insecure https://<device-ip>:17777/v1/models | python3 -m json.tool
```

Verify the response is truthful and stable. At minimum it should let you tell:

- which Android-local packs/models exist
- which are loaded now
- which are loadable but inactive
- which capabilities each pack/model supports
- which backend / implementation is being used

### 4. Cross-check against existing surfaces

Compare the model catalog with:

- `GET /health`
- `GET /discover`
- `GET /capabilities`
- `GET /v1/mobile/model-packs` if still present

The new catalog should not disagree with those surfaces in obvious ways.

### 5. Check the native Models tab

In the app, open the `Models` tab and verify:

- the tab reflects the same model/pack truth as the runtime surface
- loaded vs loadable state is understandable
- experimental packs are not presented as fully ready if they are not
- the tab remains useful when connected to the local Android runtime
- a "Runtime model catalog" card shows the `GET /v1/models` URL when runtime is running

### 6. Smoke-test load/unload if applicable

If the sprint touched local pack load/unload behavior:

1. load a pack that is supposed to be loadable (e.g., `translate-small-preview`)
2. refresh the model catalog
3. confirm the state changed truthfully
4. unload it again and verify reversal

Do not invent new test semantics if the sprint did not touch this area.

### 7. Regression check on existing endpoints

Verify existing runtime endpoints still respond correctly:

```bash
curl -s --insecure https://127.0.0.1:37779/health | python3 -m json.tool
curl -s --insecure https://127.0.0.1:37779/discover | python3 -m json.tool
curl -s --insecure https://127.0.0.1:37779/capabilities | python3 -m json.tool
curl -s http://127.0.0.1:37780/setup/trust-status | python3 -m json.tool
```

## Expected results

- Android exposes a clear model catalog surface
- the catalog is specific to Android-local runtime truth, not generic wishlist data
- loaded/loadable/experimental state is understandable
- capability bindings are inspectable
- native `Models` tab is aligned with the runtime catalog
- no regression to serving behavior on `:17777` / `:17778`

## Capture back

- `/v1/models` excerpt
- comparison notes against `/health`, `/discover`, and `/capabilities`
- screenshots of the native `Models` tab if it changed materially
- device model / Android version
- any runtime or serving regressions

## Pass / fail rule

Pass if:

- the model catalog surface exists
- it is understandable
- it reflects real Android-local pack/model state
- it helps a tester understand what this node can actually run
- it does not break existing runtime endpoints

Fail if:

- the model catalog is missing
- it is misleading or inconsistent with other runtime surfaces
- it presents speculative model state as real
- or it breaks serving/runtime behavior

## Result location

Write the result under:

- `mobile/testing/results/`

Suggested filename:

- `ANDROID_MODEL_CATALOG_RESULTS_2026-05-02.md`
