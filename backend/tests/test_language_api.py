"""iHomeNerd language API contract tests.

Tests the core language endpoints:
  - POST /v1/translate
  - POST /v1/chat
  - POST /v1/summarize

Usage:
    IHN_BASE_URL=https://localhost:17777 pytest backend/tests/test_language_api.py -v
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
# /v1/translate
# ---------------------------------------------------------------------------


async def test_translate_en_to_es(client: httpx.AsyncClient):
    r = await client.post("/v1/translate", json={"text": "Hello, world!", "source": "en", "target": "es"})
    if r.status_code == 503:
        pytest.skip("Ollama not available — translate endpoint unavailable")
    assert r.status_code == 200, f"got {r.status_code}: {r.text[:300]}"
    body = r.json()
    assert isinstance(body.get("translation"), str), f"translation must be str: {body}"
    assert len(body["translation"]) > 0, "translation must not be empty"


async def test_translate_auto_detect_source(client: httpx.AsyncClient):
    r = await client.post("/v1/translate", json={"text": "Bonjour le monde", "target": "en"})
    if r.status_code == 503:
        pytest.skip("Ollama not available")
    assert r.status_code == 200, f"got {r.status_code}: {r.text[:300]}"
    body = r.json()
    assert body.get("source") is not None


async def test_translate_response_shape(client: httpx.AsyncClient):
    r = await client.post("/v1/translate", json={"text": "Test", "target": "fr"})
    if r.status_code == 503:
        pytest.skip("Ollama not available")
    assert r.status_code == 200
    body = r.json()
    for key in ("translation", "source", "target"):
        assert key in body, f"missing key '{key}' in translate response: {list(body.keys())}"


async def test_translate_target_required(client: httpx.AsyncClient):
    r = await client.post("/v1/translate", json={"text": "Test"})
    assert r.status_code in (422, 500, 400), f"expected error for missing target, got {r.status_code}"


# ---------------------------------------------------------------------------
# /v1/chat
# ---------------------------------------------------------------------------


async def test_chat_returns_200(client: httpx.AsyncClient):
    r = await client.post("/v1/chat", json={"messages": [{"role": "user", "content": "Say hello in one word."}]})
    if r.status_code == 503:
        pytest.skip("Ollama not available — chat endpoint unavailable")
    assert r.status_code == 200, f"got {r.status_code}: {r.text[:300]}"


async def test_chat_has_response_field(client: httpx.AsyncClient):
    r = await client.post("/v1/chat", json={"messages": [{"role": "user", "content": "Hi"}]})
    if r.status_code == 503:
        pytest.skip("Ollama not available")
    assert r.status_code == 200
    body = r.json()
    assert "response" in body, f"missing 'response' in chat: {list(body.keys())}"
    assert isinstance(body["response"], str), "response must be str"


async def test_chat_messages_required(client: httpx.AsyncClient):
    r = await client.post("/v1/chat", json={})
    assert r.status_code in (422, 500, 400), f"expected error for missing messages, got {r.status_code}"


# ---------------------------------------------------------------------------
# /v1/summarize
# ---------------------------------------------------------------------------


async def test_summarize_returns_200(client: httpx.AsyncClient):
    r = await client.post("/v1/summarize", json={"text": "The quick brown fox jumps over the lazy dog. " * 10})
    if r.status_code == 503:
        pytest.skip("Ollama not available — summarize endpoint unavailable")
    assert r.status_code == 200, f"got {r.status_code}: {r.text[:300]}"


async def test_summarize_has_summary_field(client: httpx.AsyncClient):
    r = await client.post("/v1/summarize", json={"text": "A long passage. " * 20})
    if r.status_code == 503:
        pytest.skip("Ollama not available")
    assert r.status_code == 200
    body = r.json()
    assert "summary" in body, f"missing 'summary' in response: {list(body.keys())}"
    assert isinstance(body["summary"], str)


async def test_summarize_text_required(client: httpx.AsyncClient):
    r = await client.post("/v1/summarize", json={})
    assert r.status_code in (422, 500, 400), f"expected error for missing text, got {r.status_code}"
