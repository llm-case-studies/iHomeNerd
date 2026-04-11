"""Capability registry — what this Nerd can do."""

from __future__ import annotations

import socket
from dataclasses import dataclass, field

from . import ollama


@dataclass
class Capability:
    name: str
    available: bool
    tier: str  # light, medium, heavy, embedding, detection, transcription
    model: str | None = None
    core: bool = True  # True = portable across companions, False = iHomeNerd extension
    extra: dict = field(default_factory=dict)


async def discover() -> list[Capability]:
    """Probe Ollama and build the capability list based on loaded models."""
    health = await ollama.check_health()
    models = set(health.get("models", []))

    # Determine which tiers are available based on loaded models
    has_light = any(m for m in models if "4b" in m or "gemma" in m.lower())
    has_medium = any(m for m in models if "12b" in m or "8b" in m)
    has_embedding = any(m for m in models if "embed" in m or "nomic" in m)

    caps = [
        Capability(
            name="translate_text",
            available=has_light,
            tier="light",
            model=next((m for m in models if "4b" in m), None),
            core=True,
        ),
        Capability(
            name="chat",
            available=has_light or has_medium,
            tier="medium" if has_medium else "light",
            model=next((m for m in models if "12b" in m), next((m for m in models if "4b" in m), None)),
            core=True,
        ),
        Capability(
            name="summarize_document",
            available=has_medium or has_light,
            tier="medium" if has_medium else "light",
            model=next((m for m in models if "12b" in m), next((m for m in models if "4b" in m), None)),
            core=True,
        ),
    ]
    return caps


async def capabilities_response() -> dict:
    """Build the /capabilities JSON response."""
    caps = await discover()
    return {
        "product": "iHomeNerd",
        "version": "0.1.0",
        "api_version": 1,
        "hostname": socket.gethostname(),
        "ollama": (await ollama.check_health())["ok"],
        "capabilities": {
            c.name: {
                "available": c.available,
                "model": c.model,
                "tier": c.tier,
                "core": c.core,
                **c.extra,
            }
            for c in caps
        },
    }
