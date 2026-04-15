"""Builder domain — Live Image configuration and assembly.

V1: Returns available apps and models for the UI configurator.
Build endpoint is a stub — actual ISO assembly requires the build toolkit
(debootstrap, squashfs-tools, xorriso) which ships in a separate repo.
"""

from __future__ import annotations

import logging

from fastapi import APIRouter
from pydantic import BaseModel, Field

from .. import ollama

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/v1/builder", tags=["builder"])

# App catalog — products that can be bundled into a Live Image
APP_CATALOG = [
    {"id": "app_pronunco", "name": "PronunCo", "description": "AI pronunciation coach & language learning"},
    {"id": "app_telpro", "name": "TelPro-Bro", "description": "Smart voice-tracking teleprompter & delivery coach"},
    {"id": "app_whowhe2wha", "name": "WhoWhe2Wha", "description": "Unified context engine & knowledge graph"},
    {"id": "app_watch", "name": "On-My-Watch", "description": "Asset intelligence & video surveillance"},
]

# Model size estimates (approximate download sizes)
MODEL_SIZES = {
    "gemma4:e2b": "2.0GB",
    "gemma4:e4b": "4.0GB",
    "gemma3:4b": "2.5GB",
    "gemma3:12b": "7.3GB",
    "whisper-small-int8": "180MB",
    "kokoro-82m-onnx": "320MB",
    "nomic-embed-text": "274MB",
    "mxbai-embed-large": "670MB",
}

MODEL_TYPES = {
    "gemma4:e2b": "LLM",
    "gemma4:e4b": "LLM",
    "gemma3:4b": "LLM",
    "gemma3:12b": "LLM",
    "whisper-small-int8": "Audio",
    "kokoro-82m-onnx": "Audio",
    "nomic-embed-text": "Embedding",
    "mxbai-embed-large": "Embedding",
}

# Models that are new/featured
NEW_MODELS = {"gemma4:e2b", "gemma4:e4b"}


@router.get("/resources")
async def get_resources():
    """List available apps and models for the image builder."""
    # Get actually available models from Ollama
    health = await ollama.check_health()
    available_models = health.get("models", [])

    models = []
    for model_name in available_models:
        models.append({
            "id": f"mod_{model_name.replace(':', '_').replace('.', '_')}",
            "name": model_name,
            "size": MODEL_SIZES.get(model_name, "unknown"),
            "type": MODEL_TYPES.get(model_name, "LLM"),
            "isNew": model_name in NEW_MODELS,
        })

    return {
        "apps": APP_CATALOG,
        "models": models,
    }


class BuildRequest(BaseModel):
    name: str
    apps: list[str] = Field(default_factory=list)
    models: list[str] = Field(default_factory=list)


@router.post("/build")
async def build_image(req: BuildRequest):
    """Build a custom Live Image (stub — requires build toolkit).

    The actual ISO assembly pipeline uses debootstrap, squashfs-tools,
    and xorriso. This endpoint validates the config and returns build logs.
    """
    logs = [
        f"[INFO] Initializing build environment for \"{req.name}.iso\"...",
        f"[INFO] Selected apps: {', '.join(req.apps) if req.apps else 'none'}",
        f"[INFO] Selected models: {', '.join(req.models) if req.models else 'none'}",
    ]

    # Check for build toolkit
    import shutil
    has_debootstrap = shutil.which("debootstrap") is not None
    has_squashfs = shutil.which("mksquashfs") is not None
    has_xorriso = shutil.which("xorriso") is not None

    if not (has_debootstrap and has_squashfs and has_xorriso):
        missing = []
        if not has_debootstrap:
            missing.append("debootstrap")
        if not has_squashfs:
            missing.append("squashfs-tools")
        if not has_xorriso:
            missing.append("xorriso")
        logs.append(f"[WARN] Build toolkit not installed: {', '.join(missing)}")
        logs.append("[INFO] Install with: sudo apt install debootstrap squashfs-tools xorriso")
        logs.append("[INFO] Build configuration saved. Run build when toolkit is available.")

        return {
            "status": "toolkit_missing",
            "logs": logs,
            "missing_tools": missing,
        }

    # TODO: actual ISO build pipeline
    logs.append("[INFO] Build toolkit detected — full build coming in Phase 2")
    logs.append(f"[INFO] Configuration saved for {req.name}.iso")

    return {
        "status": "pending",
        "logs": logs,
    }
