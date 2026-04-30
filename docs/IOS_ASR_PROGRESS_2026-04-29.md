# iOS ASR — Progress and Findings, 2026-04-29

**Owner:** Alex
**Co-author:** Claude (Mac mini M1)
**Sister doc:** `docs/MULTILINGUAL_ASR_AND_AZURE_FIXTURES_2026-04-29.md` (vision/spec)

---

## 1. What landed today

Five commits on `main`, in order:

1. `17f235e` — **ASR as a hosted capability.** SFSpeechRecognizer wired in,
   `/capabilities` advertises `speech_to_text` flat-boolean + `_detail`,
   benign tail-event filter (kLSRErrorDomain 301/216/203/1110), Listen tab.
2. `39eea83` — **Spec doc** for tier ladder + Azure tongue-twister fixtures.
3. (next) `c…` — **SpeechTier scaffold.** `single | parallel | whisper`
   selection at runtime startup based on physical RAM and a
   `WhisperBundle.isBundled` probe. New `_detail.speech_to_text` keys:
   `tier`, `candidate_languages`, optional `whisper` sub-object.
4. `2e444ff` — **WhisperKit integration.** `WhisperEngine` actor wrapping
   `openai_whisper-base` (~145MB, MIT, Core ML). Listen tab gains an
   Apple/Whisper segmented picker. Multi-select language sheet. Tier
   flips to `whisper` after first successful Whisper load.
5. (next) `d…` — **Whisper init fix.** Pass `prewarm: true, load: true,
   download: true` so WhisperKit actually loads the model during init
   instead of "succeeding" with nothing loaded. Transcribe now throws a
   clear `WhisperError.notReady` instead of returning `nil` and
   showing "Whisper returned no result."

The corresponding DeepSeek testing request is committed at
`mobile/testing/requests/IPHONE_12PM_ASR_TIERS_AND_WHISPER_TEST_REQUEST_2026-04-29.md`.

---

## 2. What works

### Apple single-locale mode
- 63 supported locales surface from `SFSpeechRecognizer.supportedLocales()`.
- On-device when available, server-assisted otherwise.
- Verified end-to-end on iPhone 12 Pro Max in EN, FR, DE, IT, RU, ZH.
- The benign-error filter cleaned up the bogus 301 "request was cancelled"
  noise. Status line now sticks the real error when something actually
  fails.

### Whisper transcription quality
- iPhone 12 Pro Max loads `openai_whisper-base` in a few seconds after
  the one-time HuggingFace download finishes.
- Transcribed EN, ES, RU, DE clearly across short utterances.
- Auto-detects language correctly per session.

### Capabilities surface
- `_detail.speech_to_text.tier` = `parallel` until Whisper has been
  used at least once, then `whisper` after Node restart.
- New keys do not break the existing pytest contract pack.

---

## 3. What's broken or imperfect

### 3.1 Apple parallel mode is fundamentally fragile (won't fix in stack)

When ≥ 2 locales are selected and the user speaks one of them, the
"wrong-locale" recognizer often produces confidently-wrong gibberish
in *its* locale and wins the scoring race because it's longer and (on
final) just as confident as the right one. Apple's `SFSpeechRecognizer`
exposes no acoustic language ID — there is no public API that tells
us "this audio doesn't sound like Russian." This is a property of
Apple's stack, not our code.

We're keeping parallel mode in the UI as an experimental option but
treating Whisper as the real answer for multilingual.

### 3.2 Whisper transcribes-then-translates everything to English (FIX TOMORROW)

Today's behavior: speak in ES/RU/DE → Whisper produces English text.
Translation quality is reasonable but it's the wrong feature.

Root cause: `WhisperKit.transcribe(audioArray:)` accepts a
`DecodingOptions` argument with a `.task` field. Default is `.translate`
when `language: nil`. We need to either:

- Pass `DecodingOptions(task: .transcribe, language: nil)` to keep
  auto-detect *and* keep the source language in the output, or
- Pass `language: <detected>` after a first auto-detect pass.

The first option is the right call. Single-line change in
`WhisperEngine.transcribe(audio:)` — add a `decodeOptions:` parameter
to the WhisperKit call.

### 3.3 Tier liveness vs. snapshot semantics

`/capabilities` is built once at `NodeRuntime.start()`. So if the user
warms Whisper *after* flipping the Node toggle on, `tier` stays
`parallel` until they restart the Node. This is documented as a
contract in the testing request and matches Android. Not a bug, but
worth being explicit: if you want `tier=whisper` to show, restart the
Node toggle after the first successful Whisper run.

### 3.4 Build path quirks

`xcodebuild` requires running from `mobile/ios/ihn-home/`, not the
repo root. Our `cd` discipline has been spotty — multiple sessions
failed builds because of this. Worth a wrapper script in `mobile/ios/`
at some point so `./build-and-install` Just Works from anywhere.

---

## 4. First move tomorrow

```swift
// mobile/ios/ihn-home/IhnHome/Runtime/WhisperEngine.swift
import WhisperKit

func transcribe(audio: [Float]) async throws -> Result? {
    // ...
    let opts = DecodingOptions(
        task: .transcribe,        // <-- the fix
        language: nil,            // keep auto-detect
        temperatureFallbackCount: 5,
        sampleLength: 224
    )
    let outputs = try await pipe.transcribe(audioArray: audio, decodeOptions: opts)
    // ...
}
```

Test plan after that one-line change:

- [ ] Speak EN → expect English output
- [ ] Speak ES → expect Spanish output
- [ ] Speak RU → expect Russian (Cyrillic) output
- [ ] Speak DE → expect German output
- [ ] Speak a mid-sentence EN→RU switch → expect both languages preserved in their respective scripts (Whisper does support code-switching; this is the test that distinguishes it from Apple's recognizer)

If transcribe-only behaves well across all of those, mark Task #15
completed and move to OCR (Task #12).

---

## 5. Open follow-ups (parking lot)

- **Streaming Whisper.** Today is batch-only (record → stop → transcribe).
  WhisperKit supports streaming via `transcribeAudioStream` /
  `AudioStreamTranscriber`. Worth picking up after OCR lands; mostly a
  UX improvement.
- **Model size dial.** `base` is fine for testing. We may want a setting
  to switch to `tiny` (smaller/faster, lower quality) or `small`
  (better quality at ~485MB) per user preference. Defer until we have
  the Azure tongue-twister fixtures and can measure WER per model.
- **Azure tongue-twister fixtures.** Still parked on the Dell laptop
  where the keys live. Not blocking anything Mac-side. Whoever shows
  up locally on the Dell next picks it up per the spec doc.
- **Apple-engine parallel "experimental" badge.** Today Whisper is the
  default for new users; Apple-parallel is still selectable. Consider
  adding an "experimental" badge on the parallel chip set so users
  understand the caveat without us repeating the bug-report dance.

---

## 6. Status of related tasks (in the IDE task list)

- **#11 ASR as a real iOS capability** — completed.
- **#12 OCR (autonomous)** — pending. First in line after Whisper
  transcribe-only fix.
- **#13 SpeechTier scaffold** — completed.
- **#14 Parallel-recognizer mode** — completed (with §3.1 caveat
  documented in the testing request).
- **#15 Whisper Core ML tier** — in_progress. One-line fix tomorrow
  unblocks completion.
