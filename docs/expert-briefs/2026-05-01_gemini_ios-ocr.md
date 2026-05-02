# iOS Vision OCR — assignment brief for Gemini 3.1 Pro

**Date:** 2026-05-01
**Author:** Claude Opus 4.7 (mac-mini, Mac-side iOS owner)
**Assignee:** Gemini 3.1 Pro (Antigravity)
**Branch:** `mac-mini` on `git@github.com:llm-case-studies/iHomeNerd.git`
**Estimated wall time:** 60–90 min of editing + a Mac-mini build/verify hop

---

## 0. Antigravity caveat (read first)

You almost certainly don't have a USB-tethered iPhone, an unlocked macOS keychain, or `xcodebuild` in your sandbox. **That's fine.** Your deliverable is *the Swift code, opened as a PR onto `mac-mini`*. The Mac-side owner (Claude on `mac-mini-m1.local`) will build, install on `Alex's iPhone (00008101-…001E)`, and run the `/v1/vision/ocr` curl. If your code compiles in your Swift toolchain check, you're done.

If any tool you'd normally use isn't available, **stop and write a note in the PR description** describing what you couldn't run. Don't substitute or improvise.

---

## 1. Scope (hard fence — do not cross)

### Edit-allowed paths

```
mobile/ios/ihn-home/IhnHome/Runtime/OCREngine.swift         (NEW)
mobile/ios/ihn-home/IhnHome/Runtime/NodeRuntime.swift       (EDIT)
mobile/ios/ihn-home/IhnHome/Runtime/CapabilityHost.swift    (EDIT)
mobile/ios/ihn-home/project.yml                             (EDIT only if xcodegen requires it)
```

### Read-only reference (for contract / prior patterns)

```
mobile/ios/ihn-home/IhnHome/Runtime/WhisperEngine.swift     (engine actor pattern)
mobile/ios/ihn-home/IhnHome/Runtime/WhisperBundle.swift     (bundle-flag pattern, FYI only)
mobile/ios/ihn-home/IhnHome/Runtime/HTTPRequest.swift       (parsing helpers — already exists)
mobile/ios/ihn-home/IhnHome/Runtime/HTTPResponse.swift      (response helpers — already exists)
mobile/ios/ihn-home/IhnHome/Runtime/Multipart.swift         (multipart parser — already exists)
backend/app/domains/vision_router.py                        (contract: POST /v1/vision/ocr → {text, model})
backend/app/vision.py                                       (contract: ocr() return shape)
```

### Forbidden — do **NOT** touch

- Anything under `backend/`, `frontend/`, `browser-extension/`, `vm/`, `docs/`, `testing/`, `mobile/android/`.
- Existing Whisper / capability / tier scaffolding beyond the minimum needed to plug in the OCR capability.
- Refactors of `NodeRuntime.swift` "while you're in there." Insert your new route + handler; leave everything else byte-for-byte identical.
- New third-party Swift packages. `Vision` is a system framework — `import Vision` is enough.
- `WhisperBundle.swift` (don't model OCR after it; OCR is always available, no persistence flag needed).
- Adding tests, README updates, design docs, or comment-only "improvements" elsewhere.

---

## 2. Goal — one sentence

**Add a new `OCREngine` actor wrapping `VNRecognizeTextRequest`, expose it as `POST /v1/vision/ocr` on the iOS NodeRuntime, and advertise the `analyze_image` capability with an `ocr_supported: true` detail field so the contract sweep recognizes the iPhone as a vision node.**

---

## 3. Detailed contract

### 3.1 `OCREngine.swift` (NEW)

A `nonisolated` actor (or static enum — your call) that:
- Accepts raw image bytes (PNG / JPEG / HEIC).
- Runs `VNRecognizeTextRequest` with `recognitionLevel = .accurate`, `usesLanguageCorrection = true`, automatic language detection on (iOS 16+ supports `automaticallyDetectsLanguage = true`).
- Returns `OCREngine.Result` with:
  ```swift
  struct Result: Sendable {
      let text: String                 // newline-joined recognized lines
      let language: String?            // primary detected language (BCP-47), if Vision exposes it; nil otherwise
      let lineCount: Int
  }
  ```
- Has a `static var supportedRecognitionLanguages: [String]` helper returning `try? VNRecognizeTextRequest.supportedRecognitionLanguages(for: .accurate, revision: VNRecognizeTextRequestRevision3)` (or whichever revision is current on iOS 17+).
- Throws a typed `OCRError` (mirror `WhisperEngine.WhisperError`) for `decodeFailed` and `recognitionFailed`.

Decode: use `CGImageSource` to load bytes → `CGImage` → wrap in `VNImageRequestHandler`. Don't pull in CoreImage filters or rotate the image — Vision handles orientation if you pass `.up` (acceptable simplification).

**Don't model:**
- No persistence flag (Vision is always available on iOS 13+; the device floor is already iOS 17).
- No tier system (this is a single-tier capability today).
- No background prewarm (Vision warms in <50ms on first request — not worth a `prepare()` hook).

### 3.2 `NodeRuntime.swift` (EDIT — minimal insertions only)

Two surgical edits, mirroring the existing Whisper handler shape:

**a)** In `dispatch(request:snapshot:on:)` (currently around line 312), add a second `if request.method == "POST" && request.path == "/v1/vision/ocr"` branch right alongside the existing `/v1/transcribe-audio` branch. Use `Task.detached` + `connection.send` exactly the way Whisper does.

**b)** Add `nonisolated private static func handleOCR(request:snapshot:) async -> Data` modeled on `handleTranscribeAudio`:
- Parse multipart, require a non-empty `file` part.
- Read optional `language` part (BCP-47 hint — if present, validate it's in `OCREngine.supportedRecognitionLanguages` and pass to the engine; otherwise let Vision auto-detect).
- Call `OCREngine.recognize(imageData: …, languageHint: …)`.
- Return JSON: `{text, language, lineCount, processingTime, model, backend}`.
  - `model`: `"VNRecognizeTextRequest"`
  - `backend`: `"vision_ios"`
  - `processingTime`: round to 2 decimals, mirroring the Whisper handler.
- 400 on multipart parse failure or empty file part. 502 on engine failure. Error body: `{"detail": "<message>"}`.

**Do NOT** add the route to `respond(to:snapshot:)` — POST routes go through `dispatch`, not `respond`. Read the existing Whisper wiring before editing; that's the pattern.

### 3.3 `CapabilityHost.swift` (EDIT)

- Add a new `AnalyzeImageCapability` struct alongside `TextToSpeechCapability` / `SpeechToTextCapability`:
  ```swift
  struct AnalyzeImageCapability: Sendable {
      let ocrSupported: Bool                // true on iOS 13+
      let recognitionLanguages: [String]    // BCP-47 list from Vision
  }
  ```
- Add `analyzeImage: AnalyzeImageCapability?` to `CapabilitiesSnapshot` (next to `speechToText`).
- In `snapshot()`, populate it with `ocrSupported: true` and the language list. Always non-nil on iOS 17+.
- In `NodeRuntime.swift`'s `capabilityMaps` (the `(flat, detail)` builder near line 511), add a parallel branch:
  ```swift
  if let ai = c.analyzeImage {
      flat["analyze_image"] = true
      detail["analyze_image"] = [
          "available": true,
          "ocr_supported": ai.ocrSupported,
          "recognition_language_count": ai.recognitionLanguages.count,
          "recognition_languages": ai.recognitionLanguages,
          "endpoint": "/v1/vision/ocr",
          "upload_transport": "multipart/form-data",
          "preferred_upload_mime_type": "image/png",
      ] as [String: Any]
  }
  ```
- Update `capabilityFlatNames` to include `"analyze_image"` when present.

### 3.4 `project.yml`

Probably **no change needed** — xcodegen scans `IhnHome/` recursively. If `xcodegen generate` doesn't pick up `OCREngine.swift`, add it explicitly. If you add it, only modify the file list; don't touch build settings.

---

## 4. Verification (Mac-side runs this — you don't)

Once you push your PR, the Mac-side owner will run:

```bash
# Build (Mac mini, USB-tethered iPhone 12 PM)
xcodebuild -project mobile/ios/ihn-home/IhnHome.xcodeproj \
  -scheme IhnHome \
  -destination 'platform=iOS,id=00008101-000D34A81A11001E' \
  -configuration Debug \
  -derivedDataPath mobile/ios/ihn-home/build \
  -allowProvisioningUpdates DEVELOPMENT_TEAM=Y4WA2P4SQK build

# Install + launch
xcrun devicectl device install app --device 00008101-000D34A81A11001E \
  mobile/ios/ihn-home/build/Build/Products/Debug-iphoneos/IhnHome.app
xcrun devicectl device process launch --device 00008101-000D34A81A11001E com.ihomenerd.home

# Tap "Start Node" on the iPhone, then:

# 1. Capability advertisement
curl -sk https://192.168.0.220:17777/capabilities \
  | python3 -c "import sys,json; d=json.load(sys.stdin); \
    caps=d['_detail']['capabilities']; \
    print('analyze_image flat:', d.get('analyze_image')); \
    print('detail:', json.dumps(caps.get('analyze_image'), indent=2))"
# Expect: analyze_image=True; detail has ocr_supported=true, recognition_languages list.

# 2. End-to-end OCR
curl -sk -X POST https://192.168.0.220:17777/v1/vision/ocr \
  -F "file=@/some/test/image-with-text.png" \
  | python3 -m json.tool
# Expect: {"text": "<recognized text>", "model": "VNRecognizeTextRequest", "backend": "vision_ios", ...}

# 3. Contract sweep regression
IHN_BASE_URL=https://192.168.0.220:17777 \
  python3 -m pytest backend/tests/test_contract_api.py -q
# Expect: 25/25 still passing (no regression — OCR is additive).
```

---

## 5. Stop conditions

You're done when **all three** are true:
1. The three Swift files compile in your toolchain (or `swift -parse` if that's all you have).
2. The PR is opened against `mac-mini` with the diff scoped exactly to §1's edit-allowed paths.
3. Your PR description lists what you couldn't verify locally (build / install / curl) so the Mac-side owner knows what to run.

**If stuck:** stop, leave a note in the PR (`## Blockers`), tag the unfinished bits with `// FIXME(gemini-handoff):` comments. Do not improvise replacements for missing tools.

**Don't:** open a draft "what about a streaming OCR endpoint?" branch, refactor `NodeRuntime.swift` for "consistency," or add a structured-extraction template loader. Those are future-Claude problems.

---

## 6. PR title + body template

```
title: iOS Vision OCR — /v1/vision/ocr endpoint + analyze_image capability

body:
## Summary
- New OCREngine actor wrapping VNRecognizeTextRequest
- POST /v1/vision/ocr (multipart, returns {text, model, processingTime, backend})
- analyze_image capability advertised in /capabilities

## Files
- mobile/ios/ihn-home/IhnHome/Runtime/OCREngine.swift (new)
- mobile/ios/ihn-home/IhnHome/Runtime/NodeRuntime.swift (route + handler)
- mobile/ios/ihn-home/IhnHome/Runtime/CapabilityHost.swift (capability struct + snapshot)

## Test plan (Mac-side)
- [ ] Build green for iPhone 12 PM (00008101-…001E)
- [ ] curl /v1/vision/ocr returns recognized text
- [ ] /capabilities advertises analyze_image with ocr_supported=true
- [ ] backend/tests/test_contract_api.py: 25/25 still pass

## Things I couldn't verify in Antigravity
- <list anything Mac-side has to confirm>
```

---

## 7. One last thing

Before you start, run `git log --oneline -10 mobile/ios/ihn-home/IhnHome/Runtime/` and skim the last few NodeRuntime / WhisperEngine commits. The pattern there is the contract for this codebase — match it. Especially the comment style (terse, why-not-what, only when non-obvious — Alex is allergic to comment bloat).

Good hunting. Keep the diff small.
