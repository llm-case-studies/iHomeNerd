# iPhone OCR Endpoint Test — ME-21 Results

**Date:** 2026-05-01
**Tester:** DeepSeek (wip/testing, iMac-Debian)
**Target tested:** Motorola Edge 2021 (192.168.0.246 — iPhone unavailable)
**Request:** `mobile/testing/requests/IPHONE_12PM_OCR_TEST_REQUEST_2026-05-01.md`

---

## 1. iPhone Status

iPhone 12 PM not reachable (Connection refused). §2.1 (contract regression)
and §2.3 (manual OCR smoke test against iPhone) are blocked until the
device is powered on. Tests below run against ME-21 as the only live
node with `analyze_image` capability.

---

## 2. OCR Contract Tests (§2.2) — 6/6 PASS

| Test | Result | Detail |
|------|:------:|--------|
| `test_ocr_capability_present_or_skip` | ✅ | `analyze_image` capability detected |
| `test_ocr_is_available` | ✅ | `available: true` |
| `test_ocr_supported` | ✅ | `ocr_only: true` (ME-21) / `ocr_supported: true` (iPhone expected) |
| `test_ocr_recognition_languages` | ✅ | 4 languages on ME-21 (non-empty) |
| `test_ocr_endpoint` | ✅ | `/v1/vision/ocr` accepts imageBase64+mimeType JSON, returns text |
| `test_ocr_endpoint_rejects_empty` | ✅ | Returns 400/415 on empty body |

**OCR contract tests written and passing.** Tests are platform-flexible:
- Accept `ocr_only` (ME-21) or `ocr_supported` (iPhone) OCR flag
- Accept `languages` or `recognition_languages` field name
- Try JSON base64 transport first (ME-21), fall back to multipart (iPhone)
- Accept 400/415/422 as valid rejection codes

---

## 3. OCR Endpoint Verification (§2.3 — on ME-21)

Endpoint: `POST /v1/vision/ocr`
Transport: `application/json` with `imageBase64` + `mimeType`
Test image: `android-emulator-ihn-home-first-run.png` (real Android screenshot)

**Result:** OCR successfully extracted text:

```
iHN Node
Portable node host
Travel
Hosting Command Center
pixel-travel-node
Hosted URL — https://192.168.49.1:17777
2 clients
SoC — Tensor G4, 42°C nominal
Battery — 78% Charging
3 models online
```

Model: `mlkit_text_recognition_latin`
Backend: `android_mlkit_text_recognition`

---

## 4. Full Contract Sweep (ME-21)

38/51 overall:
- 32/32 contract tests (health, discover, capabilities, system/stats, tier, OCR) ✅
- 6/6 OCR tests ✅
- 0/13 bootstrap tests ❌ (ME-21 bootstrap port issue — not OCR-related)

---

## 5. iPhone Pending

| § | Task | Status |
|---|------|--------|
| 2.1 | Contract regression | Blocked — iPhone offline |
| 2.2 | OCR contract tests | **Done** — 6/6 against ME-21 |
| 2.3 | OCR smoke test (iPhone) | Blocked — iPhone offline |
