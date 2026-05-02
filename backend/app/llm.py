"""Provider-neutral local LLM client.

The first backend only knew how to talk to Ollama. Apple Silicon Macs can
instead run an MLX-LM sidecar that exposes an OpenAI-compatible chat API, so
text generation goes through this module while embeddings and vision stay on
the existing Ollama implementation for now.
"""

from __future__ import annotations

import logging
from typing import Any

import httpx

from . import ollama
from .config import settings

logger = logging.getLogger(__name__)

TEXT_TIERS = {"light", "medium", "heavy"}
MLX_PROVIDER_NAMES = {"mlx", "mlx_macos", "mlx-lm", "mlx_lm"}

_mlx_ready = False
_mlx_models: set[str] = set()


def _active_provider() -> str:
    provider = settings.llm_provider.strip().lower()
    if provider in MLX_PROVIDER_NAMES:
        return "mlx"
    return "ollama"


def provider_name() -> str:
    """Return the configured text-generation provider."""
    return _active_provider()


def backend_name() -> str:
    """Return a user-facing backend name for capability payloads."""
    return "mlx_macos" if _active_provider() == "mlx" else "ollama"


def _mlx_base_url() -> str:
    return settings.mlx_server_url.rstrip("/")


def _configured_mlx_model() -> str:
    return settings.mlx_model.strip()


def _model_names_from_openai_payload(data: Any) -> list[str]:
    """Extract model IDs from common OpenAI-compatible /v1/models shapes."""
    items: Any
    if isinstance(data, dict):
        items = data.get("data", data.get("models", []))
    else:
        items = data

    names: list[str] = []
    if isinstance(items, list):
        for item in items:
            if isinstance(item, dict):
                name = item.get("id") or item.get("name")
            else:
                name = item
            if isinstance(name, str) and name:
                names.append(name)
    return names


async def _check_mlx_health() -> dict:
    global _mlx_ready, _mlx_models

    configured_model = _configured_mlx_model()
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"{_mlx_base_url()}/v1/models")
            resp.raise_for_status()
            names = _model_names_from_openai_payload(resp.json())
            if not names and configured_model:
                names = [configured_model]

            _mlx_ready = True
            _mlx_models = set(names)
            model = resolve("medium")
            return {
                "ok": True,
                "provider": "mlx",
                "backend": "mlx_macos",
                "models": names,
                "chatModel": model,
                "mlx": {
                    "ok": True,
                    "url": _mlx_base_url(),
                    "model": model,
                    "models": names,
                },
                "ollama": {"ok": False, "models": []},
            }
    except Exception as exc:
        _mlx_ready = False
        _mlx_models = set()
        return {
            "ok": False,
            "provider": "mlx",
            "backend": "mlx_macos",
            "models": [],
            "chatModel": None,
            "error": str(exc),
            "mlx": {
                "ok": False,
                "url": _mlx_base_url(),
                "model": configured_model or None,
                "models": [],
                "error": str(exc),
            },
            "ollama": {"ok": False, "models": []},
        }


async def check_health() -> dict:
    """Check the configured text-generation provider."""
    if _active_provider() == "mlx":
        return await _check_mlx_health()

    health = await ollama.check_health()
    model = ollama.resolve("medium")
    return {
        **health,
        "provider": "ollama",
        "backend": "ollama",
        "chatModel": model,
        "ollama": health,
        "mlx": {"ok": False, "models": []},
    }


def resolve(tier: str) -> str | None:
    """Resolve a capability tier to the active provider's best model."""
    if _active_provider() == "mlx" and tier in TEXT_TIERS:
        if not _mlx_ready:
            return None
        configured_model = _configured_mlx_model()
        if configured_model and (not _mlx_models or configured_model in _mlx_models):
            return configured_model
        if _mlx_models:
            return next(iter(_mlx_models))
        return None

    return ollama.resolve(tier)


def _content_text(content: Any) -> str | None:
    """Normalize OpenAI content fields into plain text."""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts: list[str] = []
        for part in content:
            if isinstance(part, str):
                parts.append(part)
            elif isinstance(part, dict):
                text = part.get("text")
                if isinstance(text, str):
                    parts.append(text)
        return "".join(parts) if parts else None
    return None


async def _mlx_chat(messages: list[dict], model: str | None = None, tier: str = "medium") -> str:
    if not model:
        model = resolve(tier)
    if not model:
        await check_health()
        model = resolve(tier)
    if not model:
        raise RuntimeError(f"No MLX model available for tier '{tier}'.")

    payload = {"model": model, "messages": messages, "stream": False}

    logger.info("mlx_chat: model=%s tier=%s turns=%d", model, tier, len(messages))
    async with httpx.AsyncClient(timeout=120.0) as client:
        resp = await client.post(f"{_mlx_base_url()}/v1/chat/completions", json=payload)
        resp.raise_for_status()
        data = resp.json()

    choices = data.get("choices", [])
    if not choices:
        raise RuntimeError("MLX chat response did not include any choices.")

    first = choices[0]
    if isinstance(first, dict):
        message = first.get("message", {})
        if isinstance(message, dict):
            text = _content_text(message.get("content"))
            if text is not None:
                return text
        text = _content_text(first.get("text"))
        if text is not None:
            return text

    raise RuntimeError("MLX chat response did not include assistant text.")


async def generate(prompt: str, model: str | None = None, system: str | None = None, tier: str = "medium") -> str:
    """Generate a text completion using the configured provider."""
    if _active_provider() != "mlx":
        return await ollama.generate(prompt, model=model, system=system, tier=tier)

    messages: list[dict] = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})
    return await _mlx_chat(messages, model=model, tier=tier)


async def chat(messages: list[dict], model: str | None = None, tier: str = "medium") -> str:
    """Chat completion using the configured provider."""
    if _active_provider() != "mlx":
        return await ollama.chat(messages, model=model, tier=tier)
    return await _mlx_chat(messages, model=model, tier=tier)


async def embed(text: str, model: str | None = None) -> list[float]:
    """Get an embedding vector.

    MLX chat sidecars do not provide the embedding contract in this first pass,
    so document RAG keeps using Ollama's embedding endpoint.
    """
    if model is None and ollama.resolve("embedding") is None:
        await ollama.check_health()
    return await ollama.embed(text, model=model)
