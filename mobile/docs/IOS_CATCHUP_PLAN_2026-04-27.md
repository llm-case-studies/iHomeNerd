# iOS Catch-Up Plan

**Status:** active plan
**Date:** 2026-04-27
**Owner:** Alex

---

## 1. Why this doc exists

The iOS app started as a slim controller-class scaffold (HANDOFF
2026-04-26). The Android app shipped further: it already serves the full
Command Center on `https://:17777`, hosts a local Gemma 4 chat backend,
local TTS, local ASR, generates its own Home CA, and advertises over mDNS.

A 2026-04-27 course correction retracted the earlier "iOS = controller
only, Android = node host" split. iOS targets the same surface where the
silicon measures up — capability gates features, not OS class. iPhone 12
Pro Max (A14) has been measured running Gemma 4 2B responsively, matching
what the Motorola Edge 2021 already does.

This doc is the iOS catch-up priority list to reach UX parity with the
Android implementation, plus a reading list for the open-source
references that translate directly.

See also:
- `docs/MOBILE_STRATEGY_2026-04-24.md` (calibrated 2026-04-27)
- `mobile/docs/IOS_TIER_TABLE_2026-04-25.md`
- `mobile/docs/IOS_BENCHMARK_PLAN_2026-04-25.md`
- `mobile/ios/ihn-home/HANDOFF_2026-04-26.md`
- Android reference: `mobile/android/ihn-home/`

---

## 2. Where the gap is

| Surface | Android (ref) | iOS (today) |
|---|---|---|
| Snapshot fetch (6 endpoints, parallel) | done | done |
| "Served by" banner with live LAN data | done | done |
| Tab nav: `Node` / `Trust` / `Models` / `Session` | done | 6 mismatched screens (`Home` / `Pair` / `Trust` / `Travel` / `Alerts` / `Repair`) |
| Bonjour live discovery wired into state | done | code exists, not wired |
| Settings UI for endpoint switch | done | recompile required |
| Honest capability gating on `_detail.capabilities.*` | done | snapshot consumer only |
| Models tab with pack browse and load state | done | missing |
| Trust health (CA fingerprint, per-node cert state) | done | stub screen |
| `.mobileconfig` Home CA install flow | done | permissive `URLSession` delegate (dev hack) |
| Travel/Session view with telemetry + mode switch | done | stub |
| Local TTS demo | `AndroidTtsEngine` | missing (`AVSpeechSynthesizer` planned) |
| Local ASR demo | Sherpa Moonshine via Android | missing (`SFSpeechRecognizer` or Sherpa iOS planned) |
| Local LLM dialogue | MediaPipe LLM Inference + Gemma | missing |
| HTTPS Command Center server on `:17777` | Ktor/NanoHTTPD | missing |
| On-device Home CA generation | BouncyCastle | missing |
| mDNS advertise `_ihomenerd._tcp` | `NsdManager` | not yet (browser only) |

---

## 3. Priority order

Sequenced so each step works against the running iHN gateway and the
previous step's surface.

1. **iOS bring-up verified** (sim + device) — done 2026-04-27. Sim:
   iPhone 17 Pro (iOS 26.4.1). Device: iPhone 12 Pro Max (iOS via Wi-Fi
   pairing, CoreDevice `D46E3DE5-3D7A-5091-BBEC-009330C30B6D`). Both
   build → install → launch through `make run` / `make device-launch`.
2. **Strip controller-only language from docs.** Done 2026-04-27 for
   `mobile/README.md`, `mobile/ios/ihn-home/README.md`, and
   `docs/MOBILE_STRATEGY_2026-04-24.md`. HANDOFF kept as historical.
3. **Tab nav restructure** to mirror Android: `Node` / `Trust` /
   `Models` / `Session`. Existing `Home`/`Pair`/`Travel`/`Alerts`/`Repair`
   screens fold into flows inside those four tabs.
4. **Wire Bonjour into `AppState`** — drop the hardcoded `192.168.0.229`
   default. `BonjourBrowser.swift` already exists in `Networking/`.
5. **Settings UI** for endpoint switch without recompile (UserDefaults
   path is already there in `AppState.init()`).
6. **Honest capability gating** consuming `_detail.capabilities.*`.
   Tabs and feature affordances hide instead of faking.
7. **Local TTS proof** (`AVSpeechSynthesizer`) — first "no cloud"
   narrative beat. One screen, mic-free. Mirrors Android's
   `AndroidTtsEngine` UX.
8. **Local ASR proof** (`SFSpeechRecognizer`) — mic-to-transcript on
   device. Mic permission flow needed.
9. **Remote `compare_pinyin` round-trip** from iOS to a node — first
   cross-device API call.
10. **Models tab** — render pack list and load state from snapshot
    `/v1/mobile/model-packs`. Match the Android Models screen.
11. **Local LLM dialogue via MediaPipe LLM Inference iOS** — load the
    same Gemma 4 2B `.task` Android already uses. Run on iPhone 12 Pro
    Max first, capture latency / memory / thermal numbers per
    `IOS_BENCHMARK_PLAN`. This is where iOS becomes a node-class app.
12. **Trust tab**: CA fingerprint, per-node cert chain state, recovery
    actions. Match Android's Trust screen.
13. **`.mobileconfig` Home CA install flow** to replace the permissive
    `URLSession` delegate.
14. **Embedded HTTPS server** on `:17777` serving the bundled Command
    Center. The packaged web bundle is the same one the FastAPI backend
    serves from `backend/app/static/` and Android packages.
15. **On-device Home CA generation** via `Security.framework`, `:17778`
    setup port mirroring the Android setup endpoint.
16. **mDNS advertise** `_ihomenerd._tcp` via `NWListener` once the local
    runtime is alive.
17. **Travel/Session tab** with live telemetry, hotspot guidance, and
    take-home handoff flow.

Items 1–10 are the controller surface. Items 11–17 are the node-host
surface. The split is sequencing, not a permanent boundary.

---

## 4. Implementation references

### 4.1 LLM on iOS — primary path

**MediaPipe LLM Inference iOS** is the most direct mirror of the
Android implementation. The same `.task` / `.litertlm` Gemma weights
the `AndroidChatEngine` already loads work unchanged on iOS. No
re-quantization, no model conversion.

- API surface: `MPPLlmInference` Swift class, mirrors
  `LlmInference` Java/Kotlin
- Model loading: same `LiteRtLlmInferenceOptions` style with
  `modelPath`, `maxTokens`, `randomSeed`, etc.
- Threading: foreground-session inference is the supported path;
  long-running background inference is not — matches Android's
  foreground-service model

### 4.2 LLM on iOS — native alternative

**Apple MLX** (`apple/mlx-swift`) is the native ML framework. Has
Gemma examples in `apple/mlx-swift-examples`. Strengths: tighter Apple
integration, Metal-direct, smaller footprint. Costs: different model
format (MLX-native), separate quantization path from the Android-side
LiteRT pipeline. Defer until measured against MediaPipe iOS.

### 4.3 ASR on iOS

Two options:
- **`SFSpeechRecognizer`** — Apple's built-in. Free, offline-capable
  on supported locales, strict per-app limits. Good for the first
  proof.
- **Sherpa ONNX Moonshine** — same models the Android side runs.
  Available via `sherpa-onnx`'s iOS Swift wrapper. Gives identical
  transcripts across iOS and Android nodes.

### 4.4 TTS on iOS

`AVSpeechSynthesizer` is the obvious answer — system voices, free,
works back to iOS 7. Match the AndroidTtsEngine UX: voice picker, last
synth metrics in `/system/stats`.

### 4.5 HTTPS server on iOS

For `:17777` serving:
- **Swift-NIO** + `nio-http` — robust, future-proof, big dependency
- **GCDWebServer** — battle-tested embedded HTTP, Objective-C with
  clean Swift bridging. Lighter and matches the "tiny embedded
  server" feel of NanoHTTPD on Android
- **`Network.framework`** raw — most control, most work

GCDWebServer is the lowest-friction starting point for iHN's needs.

### 4.6 Open-source references to clone or read

- `google-ai-edge/gallery` — Google's Kotlin LLM gallery app. Reference
  for model picker, chat UX, performance reporting. Patterns translate
  directly to Swift/SwiftUI.
- `googlesamples/mediapipe` `examples/llm_inference/ios` — MediaPipe's
  own iOS LLM sample. Smallest viable reference for getting Gemma
  running in a Swift app.
- `apple/mlx-swift-examples` — if the MediaPipe path hits a wall, this
  is the fallback to study.
- `tensorflow/sherpa-onnx` `swift-api-examples` — for Sherpa-iOS ASR.

---

## 5. Test devices and tier expectations

Per `IOS_TIER_TABLE_2026-04-25.md` (calibrated 2026-04-26):

| Device | Tier | Expected role | Test priority |
|---|---|---|---|
| iPhone 12 Pro Max (A14, 6 GB) | Capable native | Controller + Gemma 4 2B + Whisper-tiny | First — already in fleet, A14 baseline |
| iPhone 15 Pro Max (A17 Pro, 8 GB) | Strong native | Full voice loop + 4B-class | Second — full benchmark target |
| iPhone 11 Pro Max (A13, 4 GB) | Floor native | Controller + light helpers | Third — establishes the floor |
| iPhone 7 (A10) | Web only | Safari client, no native install | Validation |

The plan does not target installing the native node-host build on web-only
devices.

---

## 6. What success looks like

iOS reaches functional parity with the Android implementation across
controller surface (steps 1–10) within a few iterations.

Node-host parity (steps 11–17) is gated by measurement on the iPhone 12
Pro Max in particular. Success there is:
- Gemma 4 2B inference running in foreground at responsive latency on iOS
- Local TTS / ASR / LLM all callable through the same `/v1/*` HTTP
  surface the Android node already exposes
- Command Center web bundle served from the iPhone over HTTPS on the LAN
- mDNS-advertised, browser-discoverable as a peer iHN node

When that lands, the household has a second node-host platform — and
the "iOS = controller only" framing is fully retired.
