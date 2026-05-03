# Error Taxonomy Unification — Research & Design Plan

**Date:** 2026-05-01
**Author:** Qwen (via opencode)
**Status:** Draft — pending team review before implementation

---

## Problem

Six independent error enums across the iOS runtime, zero shared taxonomy. HTTP error responses are freeform strings — contract tests can only assert on substrings. Python backend uses granular status codes (503, 500, 422); iOS collapses everything into 400/502.

### Current Error Enums

| File | Enum | Cases | HTTP Status Used |
|---|---|---|---|
| `Runtime/MLXEngine.swift` | `MLXError` | `modelLoadFailed(String)`, `inferenceFailed(String)`, `outOfMemory` | 502 |
| `Runtime/WhisperEngine.swift` | `WhisperError` | `notReady(String)` | 502 |
| `Runtime/OCREngine.swift` | `OCRError` | `decodeFailed(String)`, `recognitionFailed(String)` | 502 |
| `Runtime/WAVDecoder.swift` | `DecodeError` | `writeFailed`, `openFailed`, `readFailed`, `convertFailed`, `empty` | 400 (mapped at handler) |
| `Runtime/NodeIdentity.swift` | `NodeIdentityError` | `keyGenerationFailed`, `certEncodingFailed`, `keychainFailed`, `identityLookupFailed` | N/A (internal) |
| `Networking/IhnAPI.swift` | `IhnAPIError` | `invalidResponse`, `decoding`, `transport`, `http` | N/A (outbound client) |

### Current HTTP Error Responses

All use `{"detail": "freeform string"}`. Status codes:

| Condition | Status | Detail Example |
|---|---|---|
| Missing input | 400 | `"expected JSON with 'prompt' key"` |
| WAV decode fail | 400 | `"decode failed: <underlying error>"` |
| Transcription fail | 502 | `"transcription failed: <underlying error>"` |
| OCR fail | 502 | `"OCR failed: <underlying error>"` |
| MLX inference fail | 502 | `"MLX inference failed: <underlying error>"` |
| Unknown route | 404 | `"Not found\n"` (plain text) |

### Contract Tests That Assert on Errors

`backend/tests/test_chat_contract.py`:
- `test_chat_missing_prompt_returns_400` — asserts `"prompt" in body["detail"].lower()`
- `test_chat_valid_prompt_response_shape` — on 502, asserts `"detail" in body`, checks for `"model not loaded"` or `"inference failed"` in detail

---

## Goal

One `IhnError` enum for the three inference engines (MLX, Whisper, OCR), with structured error codes and proper HTTP status mapping. Backward-compatible with existing contract tests.

### Scope Decisions

**In scope:**
- `MLXError` → `IhnError`
- `WhisperError` → `IhnError`
- `OCRError` → `IhnError`
- NodeRuntime handler error mapping
- New `HTTPResponse.error(_:)` factory

**Out of scope (deliberately):**
- `WAVDecoder.DecodeError` — internal decoder, mapped at handler boundary
- `NodeIdentityError` — cert/identity infra, not an inference engine
- `IhnAPIError` — outbound client errors, different concern
- `LoadState.failed` in WhisperEngine — internal state, not thrown

---

## Design

### `IhnError` Enum

```swift
enum IhnError: Error, LocalizedError {
    enum EngineCategory: String, Sendable {
        case mlx, whisper, ocr
    }

    // 400 — client input
    case invalidRequest(String)
    case decodeFailed(String)

    // 503 — engine not ready (model not loaded, pipeline not warm)
    case engineNotReady(EngineCategory, detail: String)

    // 502 — engine tried but failed
    case engineFailed(EngineCategory, detail: String)

    // 503 — resource constraint
    case outOfMemory(EngineCategory, detail: String)

    // 500 — unexpected
    case internalError(String)
}
```

### Error Code Mapping

| Case | `code` | `httpStatus` |
|---|---|---|
| `.invalidRequest(msg)` | `"invalid_request"` | 400 |
| `.decodeFailed(msg)` | `"decode_failed"` | 400 |
| `.engineNotReady(.mlx, msg)` | `"mlx.engine_not_ready"` | 503 |
| `.engineNotReady(.whisper, msg)` | `"whisper.engine_not_ready"` | 503 |
| `.engineFailed(.mlx, msg)` | `"mlx.engine_failed"` | 502 |
| `.engineFailed(.ocr, msg)` | `"ocr.engine_failed"` | 502 |
| `.outOfMemory(.mlx, msg)` | `"mlx.out_of_memory"` | 503 |
| `.internalError(msg)` | `"internal_error"` | 500 |

### HTTP Response Shape (new)

```json
{
  "code": "mlx.engine_failed",
  "category": "mlx",
  "detail": "Model not loaded."
}
```

- `code` — machine-readable, dot-qualified (`<category>.<type>`)
- `category` — `"mlx" | "whisper" | "ocr" | null` (null for non-engine errors)
- `detail` — human-readable, backward-compatible with existing substring tests

---

## Engine Migration Map

### MLXEngine

| Old | New |
|---|---|
| `MLXError.modelLoadFailed(msg)` | `IhnError.engineNotReady(.mlx, detail: msg)` |
| `MLXError.inferenceFailed(msg)` | `IhnError.engineFailed(.mlx, detail: msg)` |
| `MLXError.outOfMemory` | `IhnError.outOfMemory(.mlx, detail: "Model too large for this device.")` |

Delete `MLXError` enum entirely.

### WhisperEngine

| Old | New |
|---|---|
| `WhisperError.notReady(msg)` | `IhnError.engineNotReady(.whisper, detail: msg)` |

Delete `WhisperError` enum entirely.

### OCREngine

| Old | New |
|---|---|
| `OCRError.decodeFailed(msg)` | `IhnError.decodeFailed(msg)` |
| `OCRError.recognitionFailed(msg)` | `IhnError.engineFailed(.ocr, detail: msg)` |

Delete `OCRError` enum entirely.

### NodeRuntime Handlers

All three handlers (`handleTranscribeAudio`, `handleOCR`, `handleChat`) switch from manual `HTTPResponse.json(["detail": ...], status: NNN)` to `HTTPResponse.error(error)`. `WAVDecoder.DecodeError` mapped at the handler boundary into `IhnError.decodeFailed`.

---

## Backward Compatibility

| Contract Test | Current Assertion | After Migration | Risk |
|---|---|---|---|
| Missing prompt → 400 | `"prompt" in body["detail"].lower()` | Unchanged (still 400, detail contains "prompt") | None |
| 502 response has `"detail"` | `"detail" in body` | Still present | None |
| Detail contains `"model not loaded"` | Substring match (lowercased) | Detail: `"Model not loaded."` — matches when lowercased | None |
| Detail contains `"inference failed"` | Substring match | **Breaks** — prefix dropped | Medium |

### Mitigation for `"inference failed"` break

Keep the prefix on `.engineFailed` detail strings:
- `detail: "Inference failed: \(msg)"` instead of just `msg`
- `detail: "Transcription failed: \(msg)"` for Whisper
- `detail: "OCR failed: \(msg)"` for OCR

This preserves all existing substring assertions while adding the structured `code` field.

---

## Files Changed (5 of 13 Runtime files)

| File | Change | Risk |
|---|---|---|
| **NEW** `Runtime/IhnError.swift` | Unified enum + `HTTPResponse.error(_:)` factory | None |
| `Runtime/MLXEngine.swift` | Replace `MLXError` → `IhnError` | Medium |
| `Runtime/WhisperEngine.swift` | Replace `WhisperError` → `IhnError` | Low |
| `Runtime/OCREngine.swift` | Replace `OCRError` → `IhnError` | Low |
| `Runtime/NodeRuntime.swift` | Handlers use `IhnError` for responses | Medium |

---

## Open Questions for Team Review

### 1. Detail string prefixes

Should `.engineFailed` keep the `"Inference failed:"` / `"OCR failed:"` prefix for backward compat with contract tests, or should tests be updated to use the new `code` field?

**Recommendation:** Keep prefixes — zero-risk migration, tests pass immediately.

### 2. Status code divergence from Python

Python uses 503 for "engine not ready" but iOS currently uses 502 for everything. Should we adopt 503 for `.engineNotReady` and `.outOfMemory`, or keep 502 for all engine failures?

**Recommendation:** Adopt 503 — it's more semantic and the only consumer is DeepSeek's contract tests, which should handle it.

### 3. `IhnError` file location

Should it live in `Runtime/` alongside the engines, or in a separate `Common/` or `Networking/` group?

**Recommendation:** `Runtime/` — co-located with its consumers, all engines already live there.

### 4. `NodeIdentityError` and `IhnAPIError`

These are outside the engine trio. Should they eventually join the unified taxonomy?

**Recommendation:** Not in this pass. `NodeIdentityError` is cert/identity infra (different lifecycle). `IhnAPIError` is outbound client-side (opposite direction). Both can be evaluated in a future pass.
