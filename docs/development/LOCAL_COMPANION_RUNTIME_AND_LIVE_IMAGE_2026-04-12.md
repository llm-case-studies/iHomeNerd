# Local Companion Runtime And Live Image Plan

**Status:** working handoff for Claude / Codex
**Date:** 2026-04-12
**Context:** PronunCo integration is live enough to start real local-companion product decisions, not just plugin plumbing.

## 1. What was just verified

- iHomeNerd on the MSI is live and serving the PronunCo contract.
- `gemma4:e2b` is currently selected for `extract_lesson_items`, `chat_persona`, `dialogue_session`, and `dialogue_turn`.
- Real `lesson-extract` requests succeeded against the live MSI service.
- `dialogue-session` and `dialogue-turn` are live, but `dialogue-turn` still needs structured-response cleanup instead of returning raw fenced JSON inside `agentText`.

## 2. Near-term priorities

### P0. Benchmark the right local models

Do not treat `gemma4:e2b` as the final default just because it is currently loaded.

Required tests:

- `gemma4:e2b`
- `gemma4:e4b`
- `gemma3:12b`
- optionally `llama3:8b` as a non-Gemma comparison

Use real payloads:

- PronunCo `lesson-extract`
- short bounded `dialogue-turn`
- one simple document summarization task

Capture:

- latency
- output quality
- structured-response reliability
- VRAM / load behavior

### P1. Introduce runtime abstraction properly

iHomeNerd should not be framed as "an Ollama app."

Target runtime matrix:

- **Ollama** for default text/image local serving
- **Transformers** for Gemma 4 audio experiments and direct multimodal access
- **llama.cpp** for lightweight serving and parallel request experiments

The router should choose by capability:

- `extract_lesson_items`
- `dialogue_turn`
- `transcribe_audio`
- `synthesize_speech`
- `chat_persona`

not by one global backend flag.

### P2. Treat voice as a stack, not one magic model

For PronunCo-style calls or roleplay, the practical architecture is:

`ASR -> dialogue brain -> TTS`

Do not wait for one perfect native-audio model before shipping useful calls.

Immediate tracks:

- **ASR:** Whisper / faster-whisper
- **TTS baseline:** browser TTS
- **Better local TTS:** Kokoro
- **Better English roleplay voice:** Chatterbox

### P3. Keep Gemma 4 audio as an experiment track

Official Gemma 4 cards indicate audio support only on `E2B` and `E4B`.
That matters for PronunCo.

But runtime maturity matters more than raw model capability.

Current assumption:

- use `Transformers` as the first serious Gemma 4 audio path
- do not assume Ollama is the stable audio path yet
- treat `llama.cpp` audio as promising, not yet the default

### P4. Live Companion Image

This is the strongest product/trust idea that came out of the discussion.

Users often do not want to install long-running local services on their day-to-day machine just to try the product.

The Live Companion Image should provide:

- bootable trial environment
- optional persistent storage
- preloaded starter model bundle
- local web UI
- clear path to "install permanently on this box" or "move to dedicated hardware"

### P5. Hardware and bundle direction

Starter bundle candidate for PronunCo-focused live image:

- `gemma4:e2b`
- Kokoro
- Chatterbox if storage/perf budget allows
- Whisper / faster-whisper if feasible

Questions:

- is `gemma4:e4b` still acceptable for trial hardware classes?
- should Chatterbox be a post-install download instead of preloaded?
- which hardware classes get first-class support first?

## 3. Suggested work order

1. Fix `dialogue-turn` structured output cleanup.
2. Pull and benchmark `gemma4:e4b`.
3. Add explicit runtime abstraction layer.
4. Add Whisper/faster-whisper capability.
5. Add Kokoro and Chatterbox experiment notes plus first implementation spike.
6. Draft Live Companion Image boot/persistence plan.

## 4. What not to do yet

- Do not promise end-to-end native-audio local calls as the only path.
- Do not over-optimize for Orange Pi + eGPU type hardware experiments.
- Do not turn the whole product into a full custom Linux distro project.
- Do not assume Mac-first packaging is the only trust story for all regions.

## 5. Missing pieces worth keeping in scope

These came up and should not be forgotten:

- **network story:** localhost vs LAN binding, pairing, and clean remote access
- **trust story:** signed installers, managed updates, and inspectable logs
- **trial story:** browser demo vs live image vs permanent install
- **hardware matrix:** MSI-class laptop, Mac mini/Studio, office workstation, edge gateway
- **starter content:** PronunCo-specific model and voice bundles

## 6. Recommendation summary

If Claude only has time for one serious next sprint:

1. benchmark `gemma4:e4b` vs `gemma4:e2b`
2. fix `dialogue-turn` structure
3. spike `Kokoro`
4. outline the Live Companion Image

