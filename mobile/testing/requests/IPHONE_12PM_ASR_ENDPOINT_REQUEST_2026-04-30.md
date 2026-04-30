# iPhone 12 PM — REST Transcribe Endpoint Request

**Date:** 2026-04-30
**Requester:** DeepSeek (wip/testing, iMac-Debian)
**Target:** iPhone 12 Pro Max NodeRuntime
**Priority:** HIGH — blocks automated ASR testing

---

## 1. Problem

Every iPhone ASR test today requires Alex to manually:
1. Open the iHomeNerd app
2. Navigate to the Listen tab
3. Switch to Whisper/Apple mode
4. Tap Record, speak a phrase, tap Stop
5. Wait for transcription
6. Toggle Node off, wait, toggle Node on (for tier checks)

This is the single biggest bottleneck in the cross-platform test pipeline.
Contrast with ME-21: `POST /v1/transcribe-audio` with `audioBase64` JSON
payload — fully automated, 100 clips in 3 minutes, no human needed.

Alex is slow, unreliable, and not good at following directions (his words,
not ours). We need to remove him from the ASR test loop.

## 2. Proposed solution

Add a `POST /v1/transcribe-audio` endpoint to the iPhone NodeRuntime that
accepts the same contract as ME-21's Android endpoint:

**Request:**
```json
POST /v1/transcribe-audio
Content-Type: application/json

{
  "audioBase64": "<base64-encoded WAV PCM 16kHz mono 16-bit>",
  "format": "wav",
  "backend": "apple",
  "language": "en-US"
}
```

**Response:**
```json
{
  "text": "Hello, how are you today?",
  "language": "en-US",
  "backend": "apple",
  "duration_ms": 450
}
```

**Backend values:**
- `"apple"` — routes through `SFSpeechRecognizer` (single or parallel mode)
- `"whisper"` — routes through `WhisperEngine.transcribe(audio:)`

The endpoint should decode the base64 WAV, convert to the float array
WhisperEngine expects, and return the transcript.

## 3. Impact

| Before | After |
|--------|-------|
| Alex manually speaks every test phrase | 100 Azure fixture clips auto-injected |
| 1-2 locales testable per session | All 10 locales in 3 minutes |
| No word-error-rate baselines possible | Full accuracy comparison: iPhone vs ME-21 vs Python |
| Tier flip testing needs human | Automated: warm Whisper, hit endpoint, check tier |
| Alex is the bottleneck | Alex is out of the loop |

## 4. Implementation notes

- The endpoint already works on ME-21 (`sherpa_onnx_moonshine`). Mirror the
  contract exactly — same JSON shape, same field names.
- For Apple backend: `SFSpeechRecognizer` needs an audio file, not a buffer.
  Write the decoded WAV to a temp file, run recognition, return result.
- For Whisper backend: `WhisperEngine.transcribe(audio: [Float])` already
  accepts a float array. The WAV→[Float] conversion is straightforward (16-bit
  PCM samples → normalized floats).
- Add `upload_transport: "json-base64"` and `preferred_upload_mime_type: "audio/wav"`
  to the `speech_to_text` capability in `CapabilityHost.swift` so the harness
  can discover the endpoint programmatically.

## 5. Success criteria

The following should work:
```bash
curl -sk -X POST https://192.168.0.220:17777/v1/transcribe-audio \
  -H "Content-Type: application/json" \
  -d '{"audioBase64":"'$(base64 fixture.wav)'","format":"wav","backend":"apple","language":"en-US"}'
# → {"text": "...", "language": "en-US", ...}
```

After deployment, `testing/results/IPHONE_APPLE_ASR_BASELINE_2026-04-30.md`
can be re-run: 100 Azure fixture clips auto-injected, producing the first
cross-platform word-error-rate comparison.

---

## 6. Cross-reference

- ME-21 endpoint contract: `_detail.capabilities.transcribe_audio` on ME-21's `/capabilities`
- Current iPhone capabilities: `speech_to_text` has no `upload_transport` field
- ME-21 baseline: `mobile/testing/results/ME21_MULTILINGUAL_ASR_BASELINE_2026-04-30.md`
