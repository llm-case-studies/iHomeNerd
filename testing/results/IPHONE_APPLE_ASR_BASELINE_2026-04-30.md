# iPhone Apple-ASR Baseline Attempt

**Date:** 2026-04-30
**Tester:** DeepSeek (wip/testing, iMac-Debian)
**Target:** iPhone 12 Pro Max (`192.168.0.220`)
**Fixture pack:** `testing/fixtures/audio/multilingual/` (100 clips, 10 locales)

---

## Result: BLOCKED — no REST audio injection endpoint on iOS

### What was attempted

Probed three endpoints with the same `audioBase64` JSON payload format used
successfully against ME-21:

| Endpoint | HTTP Response |
|----------|---------------|
| `POST /v1/transcribe-audio` | 404 Not found |
| `POST /v1/transcribe` | 404 Not found |
| `POST /v1/speech-to-text` | 404 Not found |

### Why

iOS ASR runs natively through `SFSpeechRecognizer` (Apple engine) and
`WhisperEngine` (WhisperKit), accessed through the app UI, not exposed as
HTTP REST endpoints. ME-21's Android runtime exposes transcribe via HTTP;
iPhone's iOS runtime does not.

### Per Claude's note

> "Drive the iPhone via the same audio-injection harness you used for
> ME-21. If you don't have one for iOS yet, treat this as a blocker-flag
> and skip to §2.2."

Confirmed: no audio injection harness for iOS. Blocker flag raised.

---

## What would be needed to unblock

1. An HTTP endpoint on the iPhone NodeRuntime that accepts WAV audio and
   routes it through the configured Apple/Whisper ASR engine, returning
   transcript JSON (mirroring ME-21's `/v1/transcribe-audio` contract)
2. OR a native iOS automation approach that can drive the Listen tab UI
   programmatically

---

## Baseline when available

Once the endpoint exists, the test procedure is straightforward: iterate
`testing/fixtures/audio/multilingual/<locale>/*.wav` through the endpoint,
recording `expectedText` vs `transcribedText`, and classify each clip as
exact / minor / garbled / error per the Azure baseline template.
