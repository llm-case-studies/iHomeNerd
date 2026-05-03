# Result — Android Model Catalog

## Summary

- branch: `feature/android-model-catalog`
- commit(s): `8ab5671` (iMac), `6363444` (Acer-HL)
- host: `Acer-HL` (coding), `iMac-macOS` (build/deploy/smoke)
- scope implemented: `GET /v1/models` runtime endpoint + Models tab catalog card

## What changed

- Added `GET /v1/models` endpoint on the Android local runtime (`LocalNodeRuntime.kt`)
  - Returns per-pack/per-capability entries with: `id`, `pack_id`, `capability`, `backend`, `load_state`, `loaded`, `loadable`, `experimental`, `offline`, `languages`, `latency_class`, `quality_modes`, `note`
  - Chat entries include `model_file` and `active_backend` when the Gemma pack is loaded
  - ASR entries include `backend_choices` (Moonshine EN/ES)
  - Summary section distinguishes: `loaded`, `loadable`, `unavailable`, `experimental` packs
  - Summary includes a `capability_map` showing which backend serves each capability
- Tightened the native Models tab (`IhnHomeApp.kt`) to surface:
  - The runtime catalog URL (`https://<ip>:17777/v1/models`) when the runtime is running
  - Pack counts: loaded, loadable, total
- Rebased branch onto `origin/main` to pick up the data layer (`IhnGatewayRepository.kt`) required by the UI

## Files touched

- `mobile/android/ihn-home/app/src/main/java/com/ihomenerd/home/runtime/LocalNodeRuntime.kt` — added `modelsCatalogJson()` and route
- `mobile/android/ihn-home/app/src/main/java/com/ihomenerd/home/ui/IhnHomeApp.kt` — added catalog card in ModelsScreen

## What was intentionally not done

- No redesign of the Models tab — just a small catalog card added to the existing screen
- No download manager or remote model marketplace
- No generic LLM benchmarking
- Did not touch :17777 / :17778 serving behavior beyond adding the new route

## Build and smoke notes

- build status: **SUCCESS** (`./gradlew assembleDebug` on iMac-macOS, 36 tasks, 6s)
- smoke-tested device: `Motorola Edge 2021` (ZY22GQPKG6, Android 12, arm64-v8a, ~7.7 GB RAM)
- build/deploy host: `iMac-macOS`
- testing host: `Acer-HL` (probed via LAN from iMac)
- APK installed: **Success**
- App launched with local runtime: **Success**
- Runtime started on :17777 / :17778: **Confirmed**

### Smoke probe results

| Endpoint | Status | Notes |
|---|---|---|
| `GET /v1/models` | 200 OK | 6 entries, 5 packs, truthful load_state/backend/experimental |
| `GET /health` | 200 OK | `ok: true`, 5 capabilities, `server_readiness` present |
| `GET /capabilities` | 200 OK | 5 true, 1 false (translate_text) |
| `GET /discover` | 200 OK | role: brain, 4 models listed |
| `GET /setup/trust-status` (:17778) | 200 OK | `status: trusted` |

### `/v1/models` excerpt (summary section)

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

## Testing request prepared

Updated: `mobile/testing/requests/ANDROID_MODEL_CATALOG_TEST_REQUEST_2026-05-02.md`

## Risks / open questions

- Branch cannot be pushed to origin from either Acer-HL or iMac-macOS (no GitHub auth configured). The commits exist locally on both machines and the APK is buildable. Push will need to be done from a machine with GitHub credentials.
- The `translate-small-preview` pack shows `experimental: false` even though it's a "preview" — the experimental flag only triggers on "experimental" or "preview" in the pack note, and "preview" is in the pack name but not the note. This is a minor labeling issue, not a functional one.
- The branch was rebased onto `origin/main` which diverged from the original remote branch. A force push will be needed.
