# iOS Capability Benchmark Plan

**Status:** working draft
**Date:** 2026-04-25
**Owner:** Alex
**Scope:** session-hosted local inference on iPhone (Pro Max class)

---

## 1. Why this doc exists

The iOS controller-class app does not need any local inference to ship. But
the *next* product question after "controller works" is **"can this iPhone
do real session-hosted ASR + dialogue + TTS at usable latency?"** — i.e.
the question Codex framed.

That question has to be answered with measurements, not assumptions. This
doc is the methodology — what to bench, on which devices, with which
runtimes, against which thresholds.

It also keeps Codex's framing alive in the repo so future-Alex (or future-
Claude) doesn't drift back to "ship pretty screens" mode.

## 2. The framing (Codex 2026-04-25)

The question is not "can phone X run Gemma" in the abstract. It is:

- can this device do **ASR**
- can it do **dialogue**
- can it do **TTS**
- can it do the full **mic → transcript → reply → spoken audio loop**
  fast enough to feel good

Latency thresholds, mic-stop to first spoken reply:

| Latency | Verdict |
|---|---|
| < 1.5 s | strong (Lily-from-Duolingo class) |
| 1.5–2.5 s | usable |
| > 3 s | starts feeling sluggish |

## 3. Stack to bench

| Layer | Primary candidate | Fallback |
|---|---|---|
| ASR | Whisper.cpp tiny / base via Core ML | LiteRT / ONNX Runtime |
| Dialogue (small) | Apple Foundation Models (A17 Pro+) or Gemma 3n via Core ML | LiteRT |
| Dialogue (better) | Larger Gemma / Llama via Core ML, or remote-to-gateway | — |
| TTS | Kokoro (Core ML conversion) | system AVSpeechSynthesizer (browser-TTS-class baseline only — not the serious target) |

Browser TTS / `AVSpeechSynthesizer` is a fallback baseline, not the
product-quality target. Per the existing repo docs, Kokoro is the real
local-TTS path:

- `docs/ECOSYSTEM_INTEGRATION_2026-04-18.md`
- `docs/UI_CONTRACT_2026-04-13.md`
- `docs/WEB_PRICING_AND_LAUNCH_PLAN_2026-04-10.md`

## 4. Runtime choices

For iPhone, in priority order:

1. **Core ML** — Apple's first-class on-device path. Best perf when the
   model converts cleanly. Tooling: `coremltools` for conversion.
2. **LiteRT (formerly TensorFlow Lite)** — Google's mobile runtime, good
   coverage of Gemma family. iOS support is documented but less polished
   than Android.
3. **ONNX Runtime** — third option when neither of the above maps. iOS
   support exists and includes a Core ML execution provider for hybrid
   acceleration.

Sources (collected 2026-04-25):
- Apple Core ML: https://developer.apple.com/machine-learning/core-ml/
- Apple background processing: https://developer.apple.com/documentation/BackgroundTasks/performing-long-running-tasks-on-ios-and-ipados
- Gemma 3n: https://ai.google.dev/gemma/docs/gemma-3n
- Gemma 4 launch: https://blog.google/innovation-and-ai/technology/developers-tools/gemma-4/
- Gemma audio: https://ai.google.dev/gemma/docs/capabilities/audio
- LiteRT iOS: https://ai.google.dev/edge/litert/ios/quickstart
- ONNX Runtime mobile/iOS: https://onnxruntime.ai/docs/get-started/with-mobile.html
- ONNX Runtime Core ML EP: https://onnxruntime.ai/docs/execution-providers/CoreML-ExecutionProvider.html

## 5. Background note: BGContinuedProcessingTask

Apple's newer `BGContinuedProcessingTask` (iOS 18+) lets a foreground task
continue briefly into background. This makes "start in foreground, finish
in background" plausible for the kind of inference work we want — not
"always-on" (iPhone is not the right shape for that), but "the user
started this turn, let it finish even if they swipe away briefly."

Bench plan should record whether this changes the perceived latency
profile vs strict-foreground.

## 6. What to instrument

For each (device, runtime, model) triple, record:

| Metric | Why |
|---|---|
| Cold-start model load time | First-tap latency, very visible |
| Warm-call first-token latency (dialogue) | Feels like "is it thinking" |
| Sustained tokens/sec (dialogue) | Reading-speed match |
| ASR processing time per second of audio | Real-time factor |
| First audio sample latency (TTS) | Feels like "is it talking back" |
| End-to-end mic-stop to first spoken reply | The Lily threshold |
| Battery drop per 10 turns | Sustainability |
| Thermal state transitions | Throttle behavior |
| Peak memory | Crash risk |

## 7. Devices to bench

| Tier | Device available | Plan |
|---|---|---|
| Strong native (A17 Pro) | iPhone 15 Pro Max | Full bench — Whisper, dialogue, Kokoro, end-to-end |
| Mid native (A14) | iPhone 12 Pro Max | Whisper-tiny only; document where dialogue falls off |
| Floor native (A13) | iPhone 11 Pro Max | Confirm controller-only; ASR floor probe |
| Strong native (A18 / A19) | not in fleet | Gap to source |

## 8. Out of scope for first bench pass

- Custom model fine-tunes
- Speech-to-speech models (Apple's, Gemma audio, etc.) until baseline ASR + dialogue + TTS is measured
- Multi-modal (vision + voice)
- iPad / Mac variants

## 9. Output

Each bench run produces a row in
`mobile/testing/results/IOS_BENCHMARK_RESULTS_2026-MM-DD.md` (one file per session,
not amended in-place). The result file links back here for methodology.

The summary across runs becomes a small table the landing copy can quote
when we say "Lily-class voice on iPhone 15 Pro Max."

## 10. Bottom line

> Don't ask "can iPhone run AI?" Ask "can THIS iPhone do THIS turn in
> THIS time, with THIS battery cost, while feeling like a real
> assistant?" Answer that for each device, then ship the tier story
> honestly.
