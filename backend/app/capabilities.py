"""Capability registry — what this Nerd can do.

Two response formats:
- /capabilities (full): detailed model info, tiers, core flag — for system integrators
- /capabilities (PronunCo-compatible): simple name→boolean — for browser apps

The full format is the canonical one. PronunCo reads the boolean availability
from the same structure (capability.available).
"""

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

    has_light = any(m for m in models if "4b" in m or "gemma" in m.lower())
    has_medium = any(m for m in models if "12b" in m or "8b" in m)
    has_embedding = any(m for m in models if "embed" in m or "nomic" in m)

    # Core capabilities
    caps = [
        Capability(name="translate_text", available=has_light, tier="light",
                   model=next((m for m in models if "4b" in m), None), core=True),
        Capability(name="chat", available=has_light or has_medium, tier="medium" if has_medium else "light",
                   model=next((m for m in models if "12b" in m), next((m for m in models if "4b" in m), None)),
                   core=True),
        Capability(name="summarize_document", available=has_medium or has_light,
                   tier="medium" if has_medium else "light",
                   model=next((m for m in models if "12b" in m), next((m for m in models if "4b" in m), None)),
                   core=True),
    ]

    # PronunCo plugin capabilities
    caps.extend([
        Capability(name="extract_lesson_items", available=has_medium or has_light,
                   tier="medium" if has_medium else "light",
                   model=next((m for m in models if "12b" in m), next((m for m in models if "4b" in m), None)),
                   core=True),
        Capability(name="chat_persona", available=has_medium or has_light,
                   tier="medium" if has_medium else "light",
                   model=next((m for m in models if "12b" in m), next((m for m in models if "4b" in m), None)),
                   core=True),
        Capability(name="dialogue_session", available=has_medium or has_light,
                   tier="medium" if has_medium else "light",
                   model=next((m for m in models if "12b" in m), next((m for m in models if "4b" in m), None)),
                   core=True),
        Capability(name="dialogue_turn", available=has_medium or has_light,
                   tier="medium" if has_medium else "light",
                   model=next((m for m in models if "12b" in m), next((m for m in models if "4b" in m), None)),
                   core=True),
        # Not yet available
        Capability(name="generate_drill", available=False, tier="light", core=True),
        Capability(name="explain_score", available=False, tier="medium", core=True),
        Capability(name="transcribe_audio", available=False, tier="transcription", core=True),
        Capability(name="synthesize_speech", available=False, tier="medium", core=True),
        Capability(name="analyze_image_material", available=False, tier="heavy", core=True),
        Capability(name="score_pronunciation", available=False, tier="heavy", core=True),
    ])

    return caps


async def capabilities_response() -> dict:
    """Build the /capabilities JSON response.

    Returns both the detailed format and a flat boolean map
    that PronunCo's browser can read directly.
    """
    caps = await discover()
    ollama_health = await ollama.check_health()

    return {
        "product": "iHomeNerd",
        "version": "0.1.0",
        "api_version": 1,
        "hostname": socket.gethostname(),
        "ollama": ollama_health["ok"],
        # Detailed capability info (for system integrators)
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


async def pronunco_capabilities() -> dict:
    """Flat boolean map matching PronunCo's expected /capabilities shape."""
    caps = await discover()
    return {c.name: c.available for c in caps}
