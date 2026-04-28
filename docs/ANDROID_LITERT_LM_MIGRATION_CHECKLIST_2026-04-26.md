# Android LiteRT-LM Migration Checklist

**Status:** next-step implementation checklist  
**Date:** 2026-04-26  
**Scope:** replace the failed deprecated MediaPipe Android Gemma path with the supported LiteRT-LM Android runtime

---

## 1. Why this doc exists

The first real on-device Gemma experiment on the Motorola Edge 2021 was worth doing because it answered the right question:

- the phone can store and read a real `gemma-4-E2B-it.litertlm` model
- the current blocker is not storage or APK packaging
- the current blocker is the deprecated MediaPipe `LlmInference` runtime path crashing natively on this device

That means the next move is not "give up on local Gemma on Android."

The next move is:
- keep the Android node stable
- keep the model sideload path
- migrate the Android chat runtime to `LiteRT-LM`

Official references:
- `https://ai.google.dev/edge/litert-lm/android`
- `https://github.com/google-ai-edge/LiteRT-LM`
- `https://github.com/google-ai-edge/gallery`

---

## 2. Current known-good baseline

The Motorola Edge 2021 (`ZY22GQPKG6`) is currently healthy as an Android iHN travel node with:

- real hosted Command Center on `https://<phone-ip>:17777`
- real Android TTS
- real Sherpa Moonshine ASR for `en-US` and `es-ES`
- capability-gated web UI
- live node-load metrics in `System`

The intentionally disabled local Gemma scaffold is in:

- [AndroidChatEngine.kt](/media/alex/LargeStorage/Projects/iHomeNerd/mobile/android/ihn-home/app/src/main/java/com/ihomenerd/home/runtime/AndroidChatEngine.kt)
- [LocalNodeRuntime.kt](/media/alex/LargeStorage/Projects/iHomeNerd/mobile/android/ihn-home/app/src/main/java/com/ihomenerd/home/runtime/LocalNodeRuntime.kt)
- [push_android_llm_model.sh](/media/alex/LargeStorage/Projects/iHomeNerd/mobile/android/ihn-home/scripts/push_android_llm_model.sh)

Current safety rule:
- do **not** re-enable the deprecated MediaPipe runtime in production builds
- only re-enable `chat` after a real LiteRT-LM-backed prompt succeeds on the Motorola

---

## 3. What failed

The first Android Gemma experiment used:

- `com.google.mediapipe:tasks-genai`
- `com.google.mediapipe.tasks.genai.llminference.LlmInference`
- a real `gemma-4-E2B-it.litertlm` model pushed onto the Motorola

Observed failure:

- native crash while creating the inference engine
- crash path went through `libllm_inference_engine_jni.so`
- the crash happened during `LlmInference.createFromOptions(...)`

Practical conclusion:

- the deprecated MediaPipe Android LLM runtime is the wrong integration target for this Android node
- the supported path to try next is `LiteRT-LM`

---

## 4. Target runtime shape

The supported Android path should be based on the LiteRT-LM Kotlin API shape:

- Gradle package: `com.google.ai.edge.litertlm:litertlm-android`
- `Engine`
- `EngineConfig`
- `Conversation`

The official Android guide also makes these operational points relevant to iHN:

- engine initialization should happen off the main thread
- backend choice is part of engine config
- GPU is the fast default for Android where supported
- CPU fallback should exist

For iHN, the right shape is:

- `AndroidChatEngine` becomes a thin LiteRT-LM adapter
- `LocalNodeRuntime` remains the HTTP/API/capability layer
- model files remain external to the APK
- capability gating stays truthful until runtime success is proven

---

## 5. Preconditions before code migration

Before touching the runtime path again:

1. Keep the current app installable and stable on the Motorola.
2. Keep `chat` reported as unavailable by default.
3. Keep the current sideloaded model location:
   - `/sdcard/Android/data/com.ihomenerd.home/files/llm/`
4. Keep `push_android_llm_model.sh` as the operator path for real-device testing.
5. Preserve existing `/system/stats` chat-performance fields so LiteRT-LM results can be compared against future variants.

Nice-to-have before the first LiteRT-LM attempt:

- record one known-good local model artifact to target first
- keep the generic `gemma-4-E2B-it.litertlm` as the first checkpoint model
- if needed later, compare it to device-specific Qualcomm variants from the LiteRT-LM model repo

---

## 6. Concrete migration tasks

### 6.1 Replace the dependency

1. Remove the deprecated `tasks-genai` dependency from the Android app module.
2. Add the supported LiteRT-LM Android dependency.
3. Pin the version explicitly in `libs.versions.toml`.

Success condition:
- Gradle resolves the LiteRT-LM Android package cleanly

### 6.2 Rewrite `AndroidChatEngine`

1. Remove `LlmInference` usage.
2. Replace it with LiteRT-LM engine lifecycle code.
3. Initialize the engine lazily, not during app startup.
4. Keep model lookup logic and operator-facing error messages.

Success condition:
- model discovery works without starting inference eagerly

### 6.3 Add controlled backend selection

Start with a simple policy:

- try `GPU` first on the Motorola
- fall back to `CPU`
- leave `NPU` as a later experiment unless LiteRT-LM proves it simple on this device

Implementation rule:
- backend choice should be explicit in code and emitted in `/system/stats`

Success condition:
- the user can tell whether a response came from GPU or CPU

### 6.4 Make model loading observable

Add explicit runtime logging and stats for:

- chosen model path
- backend choice
- engine init success/failure
- first prompt latency
- generation duration
- prompt chars
- reply chars

Success condition:
- a failed LiteRT-LM initialization is visible in logs and in API error messages

### 6.5 Re-enable `chat` only after a real proof

Do not mark `chat` as available when:

- only the model file exists
- only the pack is loaded
- only the engine object was created

Mark `chat` available only after:

- LiteRT-LM engine initializes successfully
- a simple local prompt returns a non-empty answer

Success condition:
- `/capabilities` becomes truthful again instead of optimistic

### 6.6 Restore the user-facing path

After runtime proof:

1. Re-enable `POST /v1/chat`.
2. Re-enable `Ask Nerd` in the web `Chat` panel.
3. Re-enable `Ask Nerd & Speak` in `Talk`.
4. Keep reply/TTS gating separate so failures remain specific.

Success condition:
- `Talk` can run `ASR -> chat -> TTS` using the Motorola alone

---

## 7. First-device test sequence

Run this exact progression on the Motorola Edge 2021:

1. App starts with no model file present.
2. App starts with model file present, but chat pack unloaded.
3. Load `android-gemma-chat-local` pack.
4. Hit `POST /v1/chat` with:
   - `Hello. Answer in one short sentence.`
5. Verify:
   - no crash
   - non-empty response
   - `/system/stats` records chat timing and backend
6. Try a slightly longer prompt:
   - `Summarize why local Android chat is useful for iHomeNerd in two short sentences.`
7. Try `Talk` full loop:
   - speak short English phrase
   - ASR transcript appears
   - chat answer appears
   - Android TTS speaks the answer

If any step fails:

- keep `chat` disabled
- keep the node stable
- record failure mode in this doc or the Android handoff note before trying another runtime tweak

---

## 8. What to measure

For each LiteRT-LM run on the Motorola, record:

- model file name
- backend used
- first response latency
- total generation time
- app memory (PSS)
- battery temp
- thermal status
- whether the app stays responsive after several prompts

Minimum benchmark cases:

- one short English reply
- one short Spanish reply
- one 2-3 sentence reply
- one PronunCo-style coaching reply

---

## 9. What counts as success

### Phase 1 success

- no native crash
- model initializes through LiteRT-LM
- `/v1/chat` returns a real answer
- `chat` becomes truthfully available in `/capabilities`

### Phase 2 success

- `Talk` completes `ASR -> chat -> TTS`
- latency is acceptable for interactive use on the Motorola
- node-load metrics remain readable and stable

### Phase 3 success

- the Motorola is useful as a real offline light-dialogue node
- we can compare:
  - `Motorola local Gemma`
  - `MSI remote Gemma`
  - future stronger Android and iPhone-class devices

---

## 10. Immediate next move

The next actual implementation task should be:

1. replace the Android chat dependency/runtime with LiteRT-LM
2. keep the existing model sideload path
3. test `gemma-4-E2B-it.litertlm` first
4. only then revisit higher-level features like:
   - local PronunCo dialogue
   - tool use
   - OCR + vision reasoning
   - richer multilingual mobile coaching
