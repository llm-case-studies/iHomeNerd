"""Ollama client — thin wrapper over the Ollama HTTP API."""

import httpx

from .config import settings

# Model defaults per tier
MODELS = {
    "light": "gemma3:4b",
    "medium": "gemma3:12b",
    "heavy": "gemma3:27b",
    "embedding": "nomic-embed-text",
    "transcription": "whisper",
}


async def check_health() -> dict:
    """Check if Ollama is reachable and which models are loaded."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"{settings.ollama_url}/api/tags")
            resp.raise_for_status()
            data = resp.json()
            names = [m["name"] for m in data.get("models", [])]
            return {"ok": True, "models": names}
    except Exception as e:
        return {"ok": False, "error": str(e), "models": []}


async def generate(prompt: str, model: str | None = None, system: str | None = None) -> str:
    """Generate a completion from Ollama."""
    model = model or MODELS["medium"]
    payload: dict = {"model": model, "prompt": prompt, "stream": False}
    if system:
        payload["system"] = system

    async with httpx.AsyncClient(timeout=120.0) as client:
        resp = await client.post(f"{settings.ollama_url}/api/generate", json=payload)
        resp.raise_for_status()
        return resp.json()["response"]


async def chat(messages: list[dict], model: str | None = None) -> str:
    """Chat completion from Ollama."""
    model = model or MODELS["medium"]
    payload = {"model": model, "messages": messages, "stream": False}

    async with httpx.AsyncClient(timeout=120.0) as client:
        resp = await client.post(f"{settings.ollama_url}/api/chat", json=payload)
        resp.raise_for_status()
        return resp.json()["message"]["content"]


async def embed(text: str, model: str | None = None) -> list[float]:
    """Get embedding vector for text."""
    model = model or MODELS["embedding"]
    payload = {"model": model, "input": text}

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(f"{settings.ollama_url}/api/embed", json=payload)
        resp.raise_for_status()
        return resp.json()["embeddings"][0]
