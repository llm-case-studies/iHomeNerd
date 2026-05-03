# iPhone Node — OCR Endpoint Test Request

**Date:** 2026-05-01
**Requester:** Gemini 3.1 Pro (Antigravity on Mac mini)
**Target device:** iPhone 12 Pro Max (LAN IP `192.168.0.220`)
**Target role:** iOS node-class host
**Expected branch context:** `mac-mini` / `main` at or after the `gemini-ocr-feature` merge.

---

## 1. What changed since your last run

### 1.1 iOS now supports Vision OCR

We just shipped the `OCREngine` on iOS. The node now exposes a new capability: `analyze_image`.

`/capabilities` `_detail.capabilities` (or just `_detail.analyze_image`) now includes:

```json
{
  "analyze_image": {
    "available": true,
    "ocr_supported": true,
    "recognition_language_count": 30,
    "recognition_languages": ["en-US", "fr-FR", "..."],
    "endpoint": "/v1/vision/ocr",
    "upload_transport": "multipart/form-data",
    "preferred_upload_mime_type": "image/png"
  }
}
```

### 1.2 New Endpoint: `POST /v1/vision/ocr`

The iPhone now accepts multipart image uploads and runs them through Apple's `VNRecognizeTextRequest`.
Returns:
```json
{
  "text": "<recognized text lines>",
  "lineCount": 30,
  "processingTime": 1.23,
  "model": "VNRecognizeTextRequest",
  "backend": "vision_ios"
}
```

---

## 2. What we'd like you to verify

### 2.1 Contract regression (5 min)

Re-run the existing contract pack against the iPhone.
```bash
IHN_BASE_URL=https://192.168.0.220:17777 python3 -m pytest backend/tests/test_contract_api.py -q
```
Expected: All 25/25 tests should still pass. The OCR endpoint is purely additive.

### 2.2 New asserts — please add (15 min)

Extend `backend/tests/test_contract_api.py` with a new test class `TestAnalyzeImageCapability` that asserts (for any node advertising `analyze_image`):

- `_detail.analyze_image.ocr_supported` is `True`.
- `_detail.analyze_image.endpoint` is `"/v1/vision/ocr"`.
- `_detail.analyze_image.recognition_languages` is a non-empty list of strings.

Extend tests to include `POST /v1/vision/ocr` endpoint testing:
- Requires `multipart/form-data` with a `file` part.
- Must return 400 on empty or missing file.
- Must return 200 with `text`, `model`, and `backend` keys on success.

### 2.3 End-to-End OCR smoke test (manual, 5 min)

Push a test image (like an Android emulator screenshot) to the OCR endpoint:
```bash
curl -sk -X POST https://192.168.0.220:17777/v1/vision/ocr \
  -F "file=@./mobile/design/claude/2026-04-24-initial-concepts/screenshots/android-emulator-ihn-home-first-run.png" \
  | python3 -m json.tool
```
Verify that the `text` field contains the readable text from the screenshot.

---

## 3. Hands-off zones (please don't touch)

- `mobile/ios/ihn-home/IhnHome/Runtime/OCREngine.swift`
- `mobile/ios/ihn-home/IhnHome/Runtime/NodeRuntime.swift`
- `mobile/ios/ihn-home/IhnHome/Runtime/CapabilityHost.swift`

You're the contract-test owner. We're the runtime owner.

---

## 4. Reporting back

Push to `testing/results/` with the date in the filename, matching the usual pass/fail format.
