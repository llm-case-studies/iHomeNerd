"""iHomeNerd vision API contract tests.

Tests the vision endpoints:
  - POST /v1/vision/analyze
  - POST /v1/vision/ocr
  - POST /v1/vision/extract/{template}
  - GET  /v1/vision/templates
  - GET  /v1/vision/status

Usage:
    IHN_BASE_URL=https://localhost:17777 pytest backend/tests/test_vision_api.py -v
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


def _minimal_png() -> bytes:
    return (
        b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
        b"\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f"
        b"\x00\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82"
    )


def _minimal_wav() -> bytes:
    header = bytearray(44)
    header[0:4] = b"RIFF"
    header[8:12] = b"WAVE"
    header[12:16] = b"fmt "
    header[16:20] = (16).to_bytes(4, "little")
    header[20:22] = (1).to_bytes(2, "little")
    header[22:24] = (1).to_bytes(2, "little")
    header[24:28] = (16000).to_bytes(4, "little")
    header[28:32] = (32000).to_bytes(4, "little")
    header[32:34] = (2).to_bytes(2, "little")
    header[34:36] = (16).to_bytes(2, "little")
    header[36:40] = b"data"
    return bytes(header)


# ---------------------------------------------------------------------------
# /v1/vision/status
# ---------------------------------------------------------------------------


async def test_vision_status_returns_200(client: httpx.AsyncClient):
    r = await client.get("/v1/vision/status")
    assert r.status_code == 200, f"got {r.status_code}: {r.text[:300]}"


async def test_vision_status_has_required_fields(client: httpx.AsyncClient):
    r = await client.get("/v1/vision/status")
    body = r.json()
    assert "available" in body, "missing 'available'"
    assert isinstance(body["available"], bool), "available must be bool"
    assert "supported_formats" in body or "templates" in body, \
        f"missing format/template info: {list(body.keys())}"


# ---------------------------------------------------------------------------
# /v1/vision/templates
# ---------------------------------------------------------------------------


async def test_vision_templates_returns_200(client: httpx.AsyncClient):
    r = await client.get("/v1/vision/templates")
    if r.status_code == 503:
        pytest.skip("Vision not available")
    assert r.status_code == 200, f"got {r.status_code}: {r.text[:300]}"


async def test_vision_templates_is_list(client: httpx.AsyncClient):
    r = await client.get("/v1/vision/templates")
    if r.status_code == 503:
        pytest.skip("Vision not available")
    assert isinstance(r.json(), list), f"templates must be a list"


async def test_vision_template_items_have_name(client: httpx.AsyncClient):
    r = await client.get("/v1/vision/templates")
    if r.status_code == 503:
        pytest.skip("Vision not available")
    templates = r.json()
    if len(templates) > 0:
        for t in templates:
            assert "name" in t, f"template missing 'name': {t}"
            assert isinstance(t["name"], str)


# ---------------------------------------------------------------------------
# /v1/vision/analyze
# ---------------------------------------------------------------------------


async def test_vision_analyze_requires_file(client: httpx.AsyncClient):
    r = await client.post("/v1/vision/analyze")
    assert r.status_code in (400, 422), f"expected 400/422 for missing file, got {r.status_code}"


async def test_vision_analyze_with_png(client: httpx.AsyncClient):
    r = await client.post("/v1/vision/analyze", files={"file": ("test.png", _minimal_png(), "image/png")})
    if r.status_code == 503:
        pytest.skip("Vision model not available")
    assert r.status_code == 200, f"got {r.status_code}: {r.text[:300]}"


async def test_vision_analyze_response_shape(client: httpx.AsyncClient):
    r = await client.post("/v1/vision/analyze", files={"file": ("test.png", _minimal_png(), "image/png")})
    if r.status_code == 503:
        pytest.skip("Vision model not available")
    assert r.status_code == 200
    body = r.json()
    assert "raw_text" in body, f"missing 'raw_text' in analyze response: {list(body.keys())}"
    assert isinstance(body["raw_text"], str)


async def test_vision_analyze_with_template(client: httpx.AsyncClient):
    r = await client.post(
        "/v1/vision/analyze",
        files={"file": ("test.png", _minimal_png(), "image/png")},
        data={"template": "ocr"},
    )
    if r.status_code == 503:
        pytest.skip("Vision model not available")
    assert r.status_code == 200, f"got {r.status_code}: {r.text[:300]}"


async def test_vision_analyze_bad_template_400(client: httpx.AsyncClient):
    r = await client.post(
        "/v1/vision/analyze",
        files={"file": ("test.png", _minimal_png(), "image/png")},
        data={"template": "nonexistent_template_xyz"},
    )
    assert r.status_code in (400, 422, 503), f"expected 400/422 for unknown template, got {r.status_code}"


# ---------------------------------------------------------------------------
# /v1/vision/ocr
# ---------------------------------------------------------------------------


async def test_vision_ocr_requires_file(client: httpx.AsyncClient):
    r = await client.post("/v1/vision/ocr")
    assert r.status_code in (400, 422), f"expected 400/422 for missing file, got {r.status_code}"


async def test_vision_ocr_with_png(client: httpx.AsyncClient):
    r = await client.post("/v1/vision/ocr", files={"file": ("test.png", _minimal_png(), "image/png")})
    if r.status_code == 503:
        pytest.skip("Vision model not available")
    assert r.status_code == 200, f"got {r.status_code}: {r.text[:300]}"


async def test_vision_ocr_response_shape(client: httpx.AsyncClient):
    r = await client.post("/v1/vision/ocr", files={"file": ("test.png", _minimal_png(), "image/png")})
    if r.status_code == 503:
        pytest.skip("Vision model not available")
    assert r.status_code == 200
    body = r.json()
    assert "text" in body, f"missing 'text' in OCR response: {list(body.keys())}"
    assert isinstance(body["text"], str)
