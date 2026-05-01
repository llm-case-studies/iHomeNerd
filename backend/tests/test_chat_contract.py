"""iHomeNerd chat endpoint tests.

Tests the MLX chat endpoint and capability reporting for nodes that support chat.

Usage:
    IHN_BASE_URL=https://IPHONE_LAN_IP:17777 IHN_RUN_LIVE_CHAT=1 pytest backend/tests/test_chat_contract.py -v
"""

from __future__ import annotations

import os
from typing import AsyncGenerator

import httpx
import pytest

BASE_URL = os.environ.get("IHN_BASE_URL", "https://localhost:17777")
RUN_LIVE_CHAT = os.environ.get("IHN_RUN_LIVE_CHAT", "0") == "1"

@pytest.fixture(scope="session")
def base() -> str:
    return BASE_URL

@pytest.fixture
async def client(base: str) -> AsyncGenerator[httpx.AsyncClient, None]:
    async with httpx.AsyncClient(base_url=base, verify=False, timeout=60) as c:
        yield c

# ---------------------------------------------------------------------------
# /capabilities chat contract
# ---------------------------------------------------------------------------

async def test_chat_capability_shape(client: httpx.AsyncClient):
    """Test that if chat is advertised, it follows the contract shape."""
    r = await client.get("/capabilities")
    body = r.json()
    
    # If the node doesn't advertise chat, we skip these assertions.
    if not body.get("chat"):
        pytest.skip("Node does not advertise 'chat' capability.")

    assert isinstance(body.get("chat"), bool), "'chat' in flat map must be boolean"
    
    detail = body.get("_detail", {})
    chat_detail = detail.get("chat")
    
    # For iOS, capabilities are nested inside _detail.capabilities
    if "capabilities" in detail and "chat" in detail["capabilities"]:
        chat_detail = detail["capabilities"]["chat"]

    assert isinstance(chat_detail, dict), "chat detail must be a dict"
    assert isinstance(chat_detail.get("available"), bool), "'available' must be boolean"
    assert isinstance(chat_detail.get("backend"), str), "'backend' must be string"
    assert chat_detail.get("endpoint") == "/v1/chat", "'endpoint' must be '/v1/chat'"
    
    if "loaded_pack_name" in chat_detail and chat_detail["loaded_pack_name"] is not None:
        assert chat_detail["loaded_pack_name"] in [
            "mlx-community/Qwen2.5-1.5B-Instruct-4bit",
            "mlx-community/gemma-4-e2b-it-4bit"
        ], f"Unexpected loaded_pack_name: {chat_detail['loaded_pack_name']}"

# ---------------------------------------------------------------------------
# /v1/chat endpoint shape
# ---------------------------------------------------------------------------

@pytest.mark.skipif(not RUN_LIVE_CHAT, reason="Requires IHN_RUN_LIVE_CHAT=1")
async def test_chat_missing_prompt_returns_400(client: httpx.AsyncClient):
    r = await client.post("/v1/chat", json={})
    assert r.status_code == 400, f"Expected 400 for missing prompt, got {r.status_code}"
    body = r.json()
    assert "detail" in body, "Response must include 'detail' key"
    assert "prompt" in body["detail"].lower(), "Detail must mention 'prompt'"

@pytest.mark.skipif(not RUN_LIVE_CHAT, reason="Requires IHN_RUN_LIVE_CHAT=1")
async def test_chat_malformed_json_handled(client: httpx.AsyncClient):
    r = await client.post(
        "/v1/chat", 
        content="not valid json", 
        headers={"Content-Type": "application/json"}
    )
    assert r.status_code != 200, "Malformed JSON should not return 200"
    # Ensure it didn't crash by fetching health
    health = await client.get("/health")
    assert health.status_code == 200

@pytest.mark.skipif(not RUN_LIVE_CHAT, reason="Requires IHN_RUN_LIVE_CHAT=1")
async def test_chat_valid_prompt_response_shape(client: httpx.AsyncClient):
    """
    Test a valid prompt. 
    Note: If no model is loaded, this might return 502. We handle both cases.
    """
    r = await client.post("/v1/chat", json={"prompt": "In one short sentence, say what device you are running on."})
    
    if r.status_code == 502:
        body = r.json()
        assert "detail" in body
        detail = body["detail"].lower()
        assert "model not loaded" in detail or "inference failed" in detail, f"Unexpected 502 detail: {detail}"
        pytest.skip("Model not loaded on device, skipping successful response checks.")
        
    assert r.status_code == 200, f"Expected 200 (or 502 if not loaded), got {r.status_code}: {r.text[:200]}"
    body = r.json()
    
    assert isinstance(body.get("text"), str) and len(body["text"]) > 0, "'text' must be a non-empty string"
    assert isinstance(body.get("processingTime"), (int, float)) and body["processingTime"] > 0, "'processingTime' must be > 0"
    assert isinstance(body.get("tokensPerSecond"), (int, float)) and body["tokensPerSecond"] >= 0, "'tokensPerSecond' must be >= 0"
    assert body.get("backend") == "mlx_ios", "backend must be 'mlx_ios'"
    assert body.get("model") in [
        "mlx-community/Qwen2.5-1.5B-Instruct-4bit",
        "mlx-community/gemma-4-e2b-it-4bit"
    ], f"Unexpected model in response: {body.get('model')}"
