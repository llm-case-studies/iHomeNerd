"""Ollama client — thin wrapper over the Ollama HTTP API.

Smart model resolution: requests a tier (light/medium/heavy), the client
picks the best available model from what Ollama actually has loaded.
"""

import logging

import httpx

from .config import settings

logger = logging.getLogger(__name__)

# Preferred models per tier, in priority order.
# The client tries each and uses the first one that Ollama has.
TIER_PREFERENCES = {
    "light": ["gemma4:e2b", "gemma4:e4b", "gemma3:4b", "gemma3:1b", "llama3.2:3b", "llama3.2:1b"],
    "medium": ["gemma4:e4b", "gemma4:e2b", "gemma3:12b", "gemma3:4b", "llama3:8b", "llama3.2:3b"],
    "heavy": ["gemma4:26b", "gemma4:31b", "gemma4:e4b", "gemma3:27b", "gemma3:12b"],
    "embedding": ["nomic-embed-text", "mxbai-embed-large"],
    "transcription": ["whisper"],
}

# Cache of available models (refreshed on each health check)
_available_models: set[str] = set()


def _resolve_model(tier: str) -> str | None:
    """Pick the best available model for a tier."""
    for candidate in TIER_PREFERENCES.get(tier, []):
        if candidate in _available_models:
            return candidate
    # Fallback: return the first available model (any tier)
    if _available_models:
        return next(iter(_available_models))
    return None


async def check_health() -> dict:
    """Check if Ollama is reachable and which models are loaded."""
    global _available_models
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"{settings.ollama_url}/api/tags")
            resp.raise_for_status()
            data = resp.json()
            names = [m["name"] for m in data.get("models", [])]
            _available_models = set(names)
            return {"ok": True, "models": names}
    except Exception as e:
        return {"ok": False, "error": str(e), "models": []}


def resolve(tier: str) -> str | None:
    """Resolve a tier to the best available model name. Call check_health first."""
    return _resolve_model(tier)


async def generate(prompt: str, model: str | None = None, system: str | None = None, tier: str = "medium") -> str:
    """Generate a completion from Ollama.

    If model is not specified, resolves from tier using available models.
    """
    if not model:
        model = _resolve_model(tier)
    if not model:
        raise RuntimeError(f"No model available for tier '{tier}'. Available: {_available_models}")

    payload: dict = {"model": model, "prompt": prompt, "stream": False}
    if system:
        payload["system"] = system

    logger.info("generate: model=%s tier=%s prompt_len=%d", model, tier, len(prompt))
    async with httpx.AsyncClient(timeout=120.0) as client:
        resp = await client.post(f"{settings.ollama_url}/api/generate", json=payload)
        resp.raise_for_status()
        return resp.json()["response"]


async def chat(messages: list[dict], model: str | None = None, tier: str = "medium") -> str:
    """Chat completion from Ollama."""
    if not model:
        model = _resolve_model(tier)
    if not model:
        raise RuntimeError(f"No model available for tier '{tier}'. Available: {_available_models}")

    payload = {"model": model, "messages": messages, "stream": False}

    logger.info("chat: model=%s tier=%s turns=%d", model, tier, len(messages))
    async with httpx.AsyncClient(timeout=120.0) as client:
        resp = await client.post(f"{settings.ollama_url}/api/chat", json=payload)
        resp.raise_for_status()
        return resp.json()["message"]["content"]


async def embed(text: str, model: str | None = None) -> list[float]:
    """Get embedding vector for text."""
    if not model:
        model = _resolve_model("embedding")
    if not model:
        raise RuntimeError("No embedding model available.")

    payload = {"model": model, "input": text}

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(f"{settings.ollama_url}/api/embed", json=payload)
        resp.raise_for_status()
        return resp.json()["embeddings"][0]
