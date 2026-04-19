"""Capability registry — what this Nerd can do.

Probes Ollama for available models and maps them to capabilities
using tier-based resolution.
"""

from __future__ import annotations

import socket
from dataclasses import dataclass, field

from . import ollama, tts, asr, vision


@dataclass
class Capability:
    name: str
    available: bool
    tier: str
    model: str | None = None
    core: bool = True
    extra: dict = field(default_factory=dict)


async def discover() -> list[Capability]:
    """Probe Ollama and build the capability list based on available models."""
    await ollama.check_health()

    def _cap(name: str, tier: str, core: bool = True) -> Capability:
        model = ollama.resolve(tier)
        return Capability(name=name, available=model is not None, tier=tier, model=model, core=core)

    return [
        # Core capabilities
        _cap("translate_text", "light"),
        _cap("chat", "medium"),
        _cap("summarize_document", "medium"),
        # PronunCo plugin
        _cap("extract_lesson_items", "medium"),
        _cap("chat_persona", "medium"),
        _cap("dialogue_session", "medium"),
        _cap("dialogue_turn", "medium"),
        # Document RAG
        _cap("query_documents", "medium"),
        Capability(name="ingest_folder", available=True, tier="system", model=None, core=True),
        # Investigate
        Capability(name="investigate_network", available=True, tier="system", model=None, core=True),
        Capability(name="investigate_scan", available=True, tier="system", model=None, core=True),
        Capability(name="evaluate_rules", available=True, tier="system", model=None, core=True),
        # Not yet implemented (stubs)
        Capability(name="generate_drill", available=False, tier="light", core=True),
        Capability(name="explain_score", available=False, tier="medium", core=True),
        Capability(
            name="transcribe_audio",
            available=asr.is_available(),
            tier="transcription",
            model="whisper-small-int8" if asr.is_available() else None,
        ),
        Capability(
            name="synthesize_speech",
            available=tts.is_available(),
            tier="tts",
            model="kokoro-82m-onnx" if tts.is_available() else None,
            extra={"voices": len(tts.get_engine().voices) if tts.get_engine() else 0},
        ),
        Capability(
            name="analyze_image",
            available=vision.is_available(),
            tier="vision",
            model=vision.available_model(),
            core=True,
        ),
        Capability(name="score_pronunciation", available=False, tier="heavy", core=True),
    ]


async def capabilities_response() -> dict:
    """Build the /capabilities JSON response."""
    caps = await discover()
    ollama_health = await ollama.check_health()

    return {
        "product": "iHomeNerd",
        "version": "0.1.0",
        "api_version": 1,
        "hostname": socket.gethostname(),
        "ollama": ollama_health["ok"],
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
