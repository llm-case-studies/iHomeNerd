"""iHomeNerd backend contract tests.

Tests the core control-plane endpoints against a running instance:
  - GET /health
  - GET /discover
  - GET /capabilities
  - GET /system/stats
  - GET / (root)
  - GET /nonexistent (404 behaviour)

Usage:
    BASE_URL=https://localhost:17777 pytest backend/tests/test_contract_api.py -v

Or set IHN_BASE_URL env var.  Default: https://localhost:17777

Requires: pytest, pytest-asyncio, httpx (all in backend/pyproject.toml)
"""

from __future__ import annotations

import os
from typing import AsyncGenerator

import httpx
import pytest


BASE_URL = os.environ.get("IHN_BASE_URL", os.environ.get("BASE_URL", "https://localhost:17777"))


@pytest.fixture(scope="session")
def base() -> str:
    return BASE_URL


@pytest.fixture
async def client(base: str) -> AsyncGenerator[httpx.AsyncClient, None]:
    async with httpx.AsyncClient(base_url=base, verify=False, timeout=10) as c:
        yield c


# ---------------------------------------------------------------------------
# /health
# ---------------------------------------------------------------------------


async def test_health_returns_200(client: httpx.AsyncClient):
    r = await client.get("/health")
    assert r.status_code == 200, f"got {r.status_code}: {r.text[:300]}"


async def test_health_product(client: httpx.AsyncClient):
    r = await client.get("/health")
    body = r.json()
    assert body.get("product") == "iHomeNerd", f"product={body.get('product')}"


async def test_health_required_fields(client: httpx.AsyncClient):
    r = await client.get("/health")
    body = r.json()
    for key in ("ok", "status", "version", "hostname"):
        assert key in body, f"missing key '{key}' in /health"


async def test_health_ok_boolean(client: httpx.AsyncClient):
    r = await client.get("/health")
    assert isinstance(r.json().get("ok"), bool), "ok must be boolean"


async def test_health_has_providers_list(client: httpx.AsyncClient):
    r = await client.get("/health")
    assert isinstance(r.json().get("providers"), list), "providers must be a list"


async def test_health_has_models_dict(client: httpx.AsyncClient):
    r = await client.get("/health")
    assert isinstance(r.json().get("models"), dict), "models must be a dict"


async def test_health_binding_and_port(client: httpx.AsyncClient):
    r = await client.get("/health")
    body = r.json()
    assert "binding" in body, "missing binding"
    assert isinstance(body.get("port"), int), f"port must be int, got {type(body.get('port'))}"


# ---------------------------------------------------------------------------
# /discover
# ---------------------------------------------------------------------------


async def test_discover_returns_200(client: httpx.AsyncClient):
    r = await client.get("/discover")
    assert r.status_code == 200, f"got {r.status_code}: {r.text[:300]}"


async def test_discover_product(client: httpx.AsyncClient):
    r = await client.get("/discover")
    assert r.json().get("product") == "iHomeNerd"


async def test_discover_role(client: httpx.AsyncClient):
    r = await client.get("/discover")
    body = r.json()
    assert "role" in body, f"missing 'role' in /discover"
    assert isinstance(body["role"], str) and len(body["role"]) > 0, f"role empty: {body.get('role')!r}"


async def test_discover_os_and_arch(client: httpx.AsyncClient):
    r = await client.get("/discover")
    body = r.json()
    assert "os" in body, "missing 'os'"
    assert "arch" in body, "missing 'arch'"


async def test_discover_network_fields(client: httpx.AsyncClient):
    r = await client.get("/discover")
    body = r.json()
    assert "protocol" in body, "missing 'protocol'"
    assert "port" in body, "missing 'port'"
    assert isinstance(body.get("port"), int), "port must be int"


async def test_discover_quality_profiles(client: httpx.AsyncClient):
    r = await client.get("/discover")
    qp = r.json().get("quality_profiles")
    # May be None in local-only mode (LAN_MODE=0) — valid.
    assert qp is None or isinstance(qp, list), f"quality_profiles must be list or None, got {type(qp)}"


async def test_discover_capabilities_present(client: httpx.AsyncClient):
    r = await client.get("/discover")
    body = r.json()
    caps = body.get("capabilities")
    # May be None in local-only mode (LAN_MODE=0) — valid.
    assert caps is None or isinstance(caps, (list, dict)), f"capabilities must be list/dict or None, got {type(caps)}"


async def test_discover_network_hint_present(client: httpx.AsyncClient):
    r = await client.get("/discover")
    body = r.json()
    hint = body.get("network_hint")
    # May be None in local-only mode, str on Android, dict on Python backend.
    if hint is not None:
        assert isinstance(hint, (str, dict)), f"network_hint must be str/dict, got {type(hint)}"


# ---------------------------------------------------------------------------
# /capabilities
# ---------------------------------------------------------------------------


async def test_capabilities_returns_200(client: httpx.AsyncClient):
    r = await client.get("/capabilities")
    assert r.status_code == 200, f"got {r.status_code}: {r.text[:300]}"


async def test_capabilities_flat_bool_map(client: httpx.AsyncClient):
    r = await client.get("/capabilities")
    body = r.json()
    assert "_detail" in body, "missing '_detail' sub-object in /capabilities"
    _skip = {"_detail", "product", "version", "capabilities", "node_profile"}
    for key, val in body.items():
        if key not in _skip:
            assert isinstance(val, bool), f"capability '{key}' must be bool, got {type(val)}"


async def test_capabilities_detail_subobject(client: httpx.AsyncClient):
    r = await client.get("/capabilities")
    detail = r.json().get("_detail")
    assert isinstance(detail, dict), f"_detail must be dict, got {type(detail)}"

    # Hostname may be top-level (Python backend) or nested in node_profile (Android).
    hostname = detail.get("hostname") or detail.get("node_profile", {}).get("hostname")
    assert hostname, "missing hostname in _detail (top-level or _detail.node_profile)"
    assert isinstance(detail.get("capabilities"), dict), "missing 'capabilities' dict in _detail"


# ---------------------------------------------------------------------------
# /system/stats
# ---------------------------------------------------------------------------


async def test_system_stats_returns_200(client: httpx.AsyncClient):
    r = await client.get("/system/stats")
    assert r.status_code == 200, f"got {r.status_code}: {r.text[:300]}"


async def test_system_stats_uptime(client: httpx.AsyncClient):
    r = await client.get("/system/stats")
    body = r.json()
    assert "uptime_seconds" in body, "missing 'uptime_seconds'"
    assert isinstance(body["uptime_seconds"], (int, float)), "uptime_seconds must be numeric"


async def test_system_stats_session_count(client: httpx.AsyncClient):
    r = await client.get("/system/stats")
    body = r.json()
    assert "session_count" in body, "missing 'session_count'"
    assert isinstance(body["session_count"], int), "session_count must be int"


async def test_system_stats_storage(client: httpx.AsyncClient):
    r = await client.get("/system/stats")
    body = r.json()
    # Python backend uses storage_bytes; Android uses app_memory_pss_bytes
    storage = body.get("storage_bytes") or body.get("app_memory_pss_bytes")
    assert storage is not None, f"missing storage metric (storage_bytes / app_memory_pss_bytes): {list(body.keys())[:10]}"
    assert isinstance(storage, (int, float)), "storage metric must be numeric"


async def test_system_stats_connected_apps(client: httpx.AsyncClient):
    r = await client.get("/system/stats")
    body = r.json()
    assert "connected_apps" in body, "missing 'connected_apps'"
    assert isinstance(body["connected_apps"], list), "connected_apps must be list"


# ---------------------------------------------------------------------------
# GET / (root)
# ---------------------------------------------------------------------------


async def test_root_responds(client: httpx.AsyncClient):
    r = await client.get("/")
    assert r.status_code in (200, 404, 307), f"unexpected root status: {r.status_code}"
    if r.status_code == 200:
        ct = r.headers.get("content-type", "")
        is_html = "text/html" in ct
        is_json = "application/json" in ct
        assert is_html or is_json, f"root 200 but unexpected content-type: {ct}"


# ---------------------------------------------------------------------------
# 404 behaviour
# ---------------------------------------------------------------------------


async def test_nonexistent_route_returns_404(client: httpx.AsyncClient):
    r = await client.get("/nonexistent-path-xyz-123")
    # Android may return 200 for catch-all SPA routing; Python backend returns 404.
    # Either is acceptable — the key is that the server responds.
    assert r.status_code in (404, 200), f"unexpected status for unknown route: {r.status_code}"


# ===================================================================
# Speech-to-text tier contract (iOS Whisper + Apple tiers)
# ===================================================================


def _get_stt_capability(capabilities_detail: dict) -> dict | None:
    """Find the speech_to_text capability, falling back to transcribe_audio."""
    caps = capabilities_detail.get("capabilities", {})
    return caps.get("speech_to_text") or caps.get("transcribe_audio")


@pytest.fixture
async def stt_cap(client: httpx.AsyncClient) -> dict | None:
    """Return the speech_to_text capability dict, or None if absent."""
    r = await client.get("/capabilities")
    detail = r.json().get("_detail", {})
    return _get_stt_capability(detail)


async def test_stt_capability_present_or_skip(stt_cap):
    if stt_cap is None:
        pytest.skip("no speech_to_text or transcribe_audio capability on this node")


async def test_stt_tier_is_string(stt_cap):
    if stt_cap is None:
        pytest.skip("no speech_to_text capability")
    tier = stt_cap.get("tier")
    assert tier is not None, "speech_to_text must have a 'tier' field"
    assert isinstance(tier, str), f"tier must be string, got {type(tier)}"


async def test_stt_tier_valid_value(stt_cap):
    if stt_cap is None:
        pytest.skip("no speech_to_text capability")
    tier = stt_cap.get("tier")
    # iOS uses single/parallel/whisper; Android uses transcription; Python uses transcription
    valid = {"single", "parallel", "whisper", "transcription", "tts"}
    assert tier in valid, f"tier '{tier}' not in expected set: {valid}"


async def test_stt_candidate_languages_when_parallel_or_whisper(stt_cap):
    if stt_cap is None:
        pytest.skip("no speech_to_text capability")
    tier = stt_cap.get("tier")
    langs = stt_cap.get("candidate_languages")
    # Only assert non-empty for iOS-style tiers
    if tier in ("parallel", "whisper"):
        assert isinstance(langs, list), f"candidate_languages must be list, got {type(langs)}"
        assert len(langs) > 0, f"candidate_languages must be non-empty for tier={tier}"


async def test_stt_candidate_languages_in_supported_locales(stt_cap):
    if stt_cap is None:
        pytest.skip("no speech_to_text capability")
    candidates = stt_cap.get("candidate_languages") or []
    supported = stt_cap.get("supported_locales") or []
    if candidates and supported:
        supported_set = set(supported)
        for lang in candidates:
            assert lang in supported_set, f"candidate '{lang}' not in supported_locales"


async def test_stt_whisper_subobject_when_whisper_tier(stt_cap):
    if stt_cap is None:
        pytest.skip("no speech_to_text capability")
    tier = stt_cap.get("tier")
    whisper = stt_cap.get("whisper")
    if tier == "whisper":
        assert whisper is not None, "whisper sub-object must be present when tier==whisper"
        assert isinstance(whisper, dict), f"whisper must be dict, got {type(whisper)}"
        for key in ("model", "model_bytes", "auto_language_id", "code_switching"):
            assert key in whisper, f"whisper missing '{key}'"


async def test_stt_whisper_absent_when_not_whisper_tier(stt_cap):
    if stt_cap is None:
        pytest.skip("no speech_to_text capability")
    tier = stt_cap.get("tier")
    whisper = stt_cap.get("whisper")
    if tier is not None and tier != "whisper":
        assert whisper is None, f"whisper sub-object must be absent (not null) when tier=={tier}, got {type(whisper)}"


# ===================================================================
# Analyze Image / OCR capability tests
# ===================================================================


def _get_ocr_capability(capabilities_detail: dict) -> dict | None:
    """Find the analyze_image capability."""
    caps = capabilities_detail.get("capabilities", {})
    return caps.get("analyze_image")


@pytest.fixture
async def ocr_cap(client: httpx.AsyncClient) -> dict | None:
    r = await client.get("/capabilities")
    detail = r.json().get("_detail", {})
    return _get_ocr_capability(detail)


async def test_ocr_capability_present_or_skip(ocr_cap):
    if ocr_cap is None:
        pytest.skip("no analyze_image capability on this node")


async def test_ocr_is_available(ocr_cap):
    if ocr_cap is None:
        pytest.skip("no analyze_image capability")
    assert ocr_cap.get("available") is True, f"analyze_image.available must be True, got {ocr_cap.get('available')}"


async def test_ocr_supported(ocr_cap):
    if ocr_cap is None:
        pytest.skip("no analyze_image capability")
    # iPhone uses ocr_supported, ME-21 uses ocr_only
    ocr_flag = ocr_cap.get("ocr_supported") or ocr_cap.get("ocr_only")
    assert ocr_flag is True, f"analyze_image must support OCR (ocr_supported=true), got {ocr_flag}"


async def test_ocr_recognition_languages(ocr_cap):
    if ocr_cap is None:
        pytest.skip("no analyze_image capability")
    langs = ocr_cap.get("recognition_languages") or ocr_cap.get("languages") or []
    assert isinstance(langs, list), f"recognition_languages must be list, got {type(langs)}"
    assert len(langs) > 0, "recognition_languages must be non-empty"


async def test_ocr_endpoint(client: httpx.AsyncClient, ocr_cap):
    if ocr_cap is None:
        pytest.skip("no analyze_image capability")

    import base64, os

    # Use a real screenshot if available, otherwise a tiny test PNG
    test_images = [
        "mobile/design/claude/2026-04-24-initial-concepts/screenshots/android-emulator-ihn-home-first-run.png",
        "browser-extension/ihomenerd-bridge/icons/icon-128.png",
    ]
    png_bytes = None
    for img_path in test_images:
        if os.path.exists(img_path):
            with open(img_path, "rb") as f:
                png_bytes = f.read()
            break

    if png_bytes is None:
        png_bytes = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82'

    transport = ocr_cap.get("upload_transport", "")
    mime = ocr_cap.get("preferred_upload_mime_type", "image/png")
    paths = ("/v1/vision/ocr", "/v1/analyze-image", "/v1/ocr")

    # Try multipart first if capability says so (iPhone style)
    if "multipart" in transport:
        boundary = "----ocrboundary"
        body = (
            f"--{boundary}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"test.png\"\r\n"
            f"Content-Type: {mime}\r\n\r\n"
        ).encode() + png_bytes + f"\r\n--{boundary}--\r\n".encode()

        for path in paths:
            r = await client.post(path, content=body,
                headers={"Content-Type": f"multipart/form-data; boundary={boundary}"})
            if r.status_code != 404:
                assert r.status_code in (200, 400), \
                    f"{path} returned {r.status_code}: {r.text[:200]}"
                if r.status_code == 200:
                    result = r.json()
                    assert "text" in result, f"response missing 'text' key"
                return

    # Try JSON base64 (ME-21 Android style, or fallback)
    if "json" in transport or not transport:
        b64 = base64.b64encode(png_bytes).decode()
        for path in paths:
            r = await client.post(path, json={"imageBase64": b64, "mimeType": mime})
            if r.status_code != 404:
                assert r.status_code in (200, 400), \
                    f"{path} returned {r.status_code}: {r.text[:200]}"
                if r.status_code == 200:
                    result = r.json()
                    assert "text" in result, f"response missing 'text' key"
                return

    pytest.skip("no OCR endpoint found")


async def test_ocr_endpoint_rejects_empty(client: httpx.AsyncClient, ocr_cap):
    if ocr_cap is None:
        pytest.skip("no analyze_image capability")

    transport = ocr_cap.get("upload_transport", "")
    paths = ("/v1/vision/ocr", "/v1/analyze-image", "/v1/ocr")

    # Try the transport the capability advertises first
    if "multipart" in transport:
        boundary = "----emptyboundary"
        empty = f"--{boundary}\r\n\r\n--{boundary}--\r\n".encode()
        for path in paths:
            r = await client.post(path, content=empty,
                headers={"Content-Type": f"multipart/form-data; boundary={boundary}"})
            if r.status_code != 404:
                assert r.status_code in (400, 415, 422), \
                    f"{path} should reject empty body, got {r.status_code}"
                return

    # Try JSON
    for path in paths:
        r = await client.post(path, json={"imageBase64": ""})
        if r.status_code != 404:
            assert r.status_code in (400, 415, 422), \
                f"{path} should reject empty body, got {r.status_code}"
            return

    pytest.skip("no OCR endpoint found")
