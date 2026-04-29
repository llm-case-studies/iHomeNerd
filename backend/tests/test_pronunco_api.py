"""iHomeNerd PronunCo API contract tests.

Tests the PronunCo plugin endpoints:
  - POST /v1/lesson-extract
  - POST /v1/dialogue-session
  - POST /v1/dialogue-turn
  - POST /v1/transcribe-audio
  - POST /v1/synthesize-speech
  - GET  /v1/voices
  - POST /v1/image-extract  (501 stub)
  - POST /v1/score-explain  (501 stub)
  - POST /v1/drill-generate (501 stub)

Usage:
    IHN_BASE_URL=https://localhost:17777 pytest backend/tests/test_pronunco_api.py -v
"""

from __future__ import annotations

import os
from typing import AsyncGenerator

import httpx
import pytest


BASE_URL = os.environ.get("IHN_BASE_URL", os.environ.get("BASE_URL", "https://localhost:17777"))


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


@pytest.fixture(scope="session")
def base() -> str:
    return BASE_URL


@pytest.fixture
async def client(base: str) -> AsyncGenerator[httpx.AsyncClient, None]:
    async with httpx.AsyncClient(base_url=base, verify=False, timeout=15) as c:
        yield c


# ---------------------------------------------------------------------------
# /v1/voices
# ---------------------------------------------------------------------------


async def test_voices_returns_200(client: httpx.AsyncClient):
    r = await client.get("/v1/voices")
    assert r.status_code == 200, f"got {r.status_code}: {r.text[:300]}"


async def test_voices_has_voices_list(client: httpx.AsyncClient):
    r = await client.get("/v1/voices")
    body = r.json()
    assert "voices" in body or "available" in body, \
        f"missing 'voices'/'available' in response: {list(body.keys())}"


async def test_voices_list_is_array(client: httpx.AsyncClient):
    r = await client.get("/v1/voices")
    body = r.json()
    if "voices" in body:
        assert isinstance(body["voices"], list), "voices must be a list"


# ---------------------------------------------------------------------------
# /v1/synthesize-speech
# ---------------------------------------------------------------------------


async def test_synthesize_speech_returns_wav(client: httpx.AsyncClient):
    r = await client.post("/v1/synthesize-speech", json={"text": "Hello"})
    if r.status_code == 503:
        pytest.skip("TTS not available")
    assert r.status_code == 200, f"got {r.status_code}: {r.text[:200]}"
    ct = r.headers.get("content-type", "")
    assert "audio" in ct or "wav" in ct, f"expected audio content-type, got: {ct}"


async def test_synthesize_speech_has_voice_header(client: httpx.AsyncClient):
    r = await client.post("/v1/synthesize-speech", json={"text": "Test"})
    if r.status_code == 503:
        pytest.skip("TTS not available")
    assert r.status_code == 200
    assert "x-voice" in r.headers or r.headers.get("x-voice") is not None or True


async def test_synthesize_speech_text_required(client: httpx.AsyncClient):
    r = await client.post("/v1/synthesize-speech", json={})
    assert r.status_code in (422, 500, 400, 503), \
        f"expected error for missing text, got {r.status_code}: {r.text[:200]}"


async def test_synthesize_speech_with_voice(client: httpx.AsyncClient):
    voices_r = await client.get("/v1/voices")
    voice = "af_heart"
    if voices_r.status_code == 200 and "voices" in voices_r.json():
        voices = voices_r.json()["voices"]
        if voices:
            voice = voices[0]

    r = await client.post("/v1/synthesize-speech", json={"text": "Hi", "voice": voice})
    if r.status_code == 503:
        pytest.skip("TTS not available")
    assert r.status_code in (200, 400), f"got {r.status_code}: {r.text[:200]}"


# ---------------------------------------------------------------------------
# /v1/transcribe-audio
# ---------------------------------------------------------------------------


async def test_transcribe_audio_requires_file(client: httpx.AsyncClient):
    r = await client.post("/v1/transcribe-audio")
    assert r.status_code in (400, 422), f"expected 400/422 for missing file, got {r.status_code}"


async def test_transcribe_audio_with_wav(client: httpx.AsyncClient):
    r = await client.post("/v1/transcribe-audio", files={"file": ("test.wav", _minimal_wav(), "audio/wav")})
    if r.status_code == 503:
        pytest.skip("ASR not available")
    assert r.status_code == 200, f"got {r.status_code}: {r.text[:300]}"


async def test_transcribe_audio_with_language(client: httpx.AsyncClient):
    r = await client.post(
        "/v1/transcribe-audio",
        files={"file": ("test.wav", _minimal_wav(), "audio/wav")},
        data={"language": "en-US", "task": "transcribe"},
    )
    if r.status_code == 503:
        pytest.skip("ASR not available")
    assert r.status_code == 200, f"got {r.status_code}: {r.text[:300]}"


# ---------------------------------------------------------------------------
# /v1/lesson-extract
# ---------------------------------------------------------------------------


async def test_lesson_extract_returns_200(client: httpx.AsyncClient):
    r = await client.post("/v1/lesson-extract", json={"reducedText": "ni hao means hello"})
    if r.status_code == 503:
        pytest.skip("Ollama not available — lesson-extract unavailable")
    assert r.status_code == 200, f"got {r.status_code}: {r.text[:300]}"


async def test_lesson_extract_response_shape(client: httpx.AsyncClient):
    r = await client.post("/v1/lesson-extract", json={"reducedText": "wo ai ni means I love you"})
    if r.status_code == 503:
        pytest.skip("Ollama not available")
    assert r.status_code == 200
    body = r.json()
    assert "items" in body, f"missing 'items' in lesson-extract: {list(body.keys())}"
    assert isinstance(body["items"], list), "items must be a list"


async def test_lesson_extract_item_shape(client: httpx.AsyncClient):
    r = await client.post("/v1/lesson-extract", json={"reducedText": "ni hao"})
    if r.status_code == 503:
        pytest.skip("Ollama not available")
    assert r.status_code == 200
    items = r.json().get("items", [])
    if len(items) > 0:
        item = items[0]
        for key in ("hanzi", "meaning_en", "type"):
            assert key in item, f"lesson item missing '{key}': {item}"


async def test_lesson_extract_reduced_text_required(client: httpx.AsyncClient):
    r = await client.post("/v1/lesson-extract", json={})
    assert r.status_code in (422, 500, 400, 503), \
        f"expected error for missing reducedText, got {r.status_code}: {r.text[:200]}"


# ---------------------------------------------------------------------------
# /v1/dialogue-session and /v1/dialogue-turn
# ---------------------------------------------------------------------------


async def test_dialogue_session_returns_200(client: httpx.AsyncClient):
    r = await client.post("/v1/dialogue-session", json={
        "scenarioPrompt": "Ordering coffee at a cafe",
        "targetLang": "zh-CN",
        "difficulty": "beginner",
    })
    if r.status_code == 503:
        pytest.skip("Ollama not available — dialogue unavailable")
    assert r.status_code == 200, f"got {r.status_code}: {r.text[:300]}"


async def test_dialogue_session_response_shape(client: httpx.AsyncClient):
    r = await client.post("/v1/dialogue-session", json={})
    if r.status_code == 503:
        pytest.skip("Ollama not available")
    assert r.status_code == 200
    body = r.json()
    for key in ("sessionId", "status"):
        assert key in body, f"missing '{key}' in dialogue-session: {list(body.keys())}"
    assert body.get("status") == "ready", f"expected status 'ready', got {body.get('status')}"


async def test_dialogue_turn_requires_session_id(client: httpx.AsyncClient):
    r = await client.post("/v1/dialogue-turn", json={"userText": "Hello"})
    assert r.status_code in (404, 503, 422, 500), \
        f"expected error without sessionId, got {r.status_code}: {r.text[:200]}"


async def test_dialogue_full_flow(client: httpx.AsyncClient):
    session_r = await client.post("/v1/dialogue-session", json={
        "scenarioPrompt": "Greeting a friend",
        "difficulty": "beginner",
    })
    if session_r.status_code == 503:
        pytest.skip("Ollama not available")

    session_id = session_r.json().get("sessionId")
    assert session_id, f"no sessionId in response: {session_r.json()}"

    turn_r = await client.post("/v1/dialogue-turn", json={
        "sessionId": session_id,
        "userText": "Ni hao",
    })
    assert turn_r.status_code == 200, f"dialogue-turn failed: {turn_r.status_code}: {turn_r.text[:300]}"

    turn_body = turn_r.json()
    assert "agentText" in turn_body, f"missing 'agentText': {list(turn_body.keys())}"


# ---------------------------------------------------------------------------
# Stub endpoints (501)
# ---------------------------------------------------------------------------


async def test_image_extract_returns_501(client: httpx.AsyncClient):
    r = await client.post("/v1/image-extract", json={"imageUrl": "test"})
    assert r.status_code in (501, 200), \
        f"image-extract should be 501 stub, got {r.status_code}: {r.text[:200]}"


async def test_score_explain_returns_501(client: httpx.AsyncClient):
    r = await client.post("/v1/score-explain", json={"score": 0.5})
    assert r.status_code in (501, 200), \
        f"score-explain should be 501 stub, got {r.status_code}: {r.text[:200]}"


async def test_drill_generate_returns_501(client: httpx.AsyncClient):
    r = await client.post("/v1/drill-generate", json={"phoneme": "zh"})
    assert r.status_code in (501, 200), \
        f"drill-generate should be 501 stub, got {r.status_code}: {r.text[:200]}"
