"""Kokoro TTS engine — local text-to-speech via ONNX runtime.

Provides fast multi-language speech synthesis using Kokoro-82M.
Sits alongside Ollama (LLM) as a separate capability backend.
"""

from __future__ import annotations

import io
import importlib.util
import logging
from pathlib import Path

from .config import settings

logger = logging.getLogger(__name__)

# Lazy-loaded singleton
_engine: "KokoroEngine | None" = None

# Language code mapping: BCP-47 → Kokoro/espeak
LANG_MAP = {
    "en-US": "en-us",
    "en-GB": "en-gb",
    "zh-CN": "cmn",
    "zh-TW": "cmn",
    "ja-JP": "ja",
    "es-ES": "es",
    "es-MX": "es-419",
    "fr-FR": "fr-fr",
    "de-DE": "de",
    "it-IT": "it",
    "pt-BR": "pt-br",
    "hi-IN": "hi",
    "ko-KR": "ko",
    "ru-RU": "ru",
    "tr-TR": "tr",
    "uk-UA": "uk",
}

# Default voice per language prefix
DEFAULT_VOICES = {
    "en": "af_heart",
    "cmn": "zf_xiaobei",
    "ja": "jf_alpha",
    "es": "ef_dora",
    "fr": "ff_siwis",
    "it": "if_sara",
    "pt": "pf_dora",
    "hi": "hf_alpha",
}


class KokoroEngine:
    """Wrapper around kokoro-onnx for iHomeNerd TTS."""

    def __init__(self, model_path: str, voices_path: str):
        from kokoro_onnx import Kokoro

        self.kokoro = Kokoro(model_path, voices_path)
        self._voices = sorted(self.kokoro.get_voices())
        logger.info("Kokoro TTS loaded: %d voices, model=%s", len(self._voices), model_path)

    @property
    def voices(self) -> list[str]:
        return self._voices

    def synthesize(
        self,
        text: str,
        voice: str = "af_heart",
        lang: str = "en-us",
        speed: float = 1.0,
    ) -> tuple[bytes, int]:
        """Synthesize text to WAV bytes.

        Returns (wav_bytes, sample_rate).
        """
        import soundfile as sf

        samples, sample_rate = self.kokoro.create(text, voice=voice, speed=speed, lang=lang)
        buf = io.BytesIO()
        sf.write(buf, samples, sample_rate, format="WAV", subtype="PCM_16")
        return buf.getvalue(), sample_rate


def _find_model_files() -> tuple[str, str] | None:
    """Find Kokoro model files in standard locations."""
    candidates = [
        Path(settings.data_dir) / "models" / "kokoro",
        Path(__file__).parent.parent / "models" / "kokoro",
        Path.home() / ".cache" / "kokoro",
    ]
    for d in candidates:
        model = d / "kokoro-v1.0.onnx"
        voices = d / "voices-v1.0.bin"
        if model.exists() and voices.exists():
            return str(model), str(voices)
    return None


def get_engine() -> KokoroEngine | None:
    """Get or lazily initialize the Kokoro TTS engine."""
    global _engine
    if _engine is not None:
        return _engine

    paths = _find_model_files()
    if paths is None:
        logger.warning("Kokoro model files not found. TTS unavailable.")
        return None

    try:
        _engine = KokoroEngine(paths[0], paths[1])
        return _engine
    except Exception as e:
        logger.error("Failed to load Kokoro TTS: %s", e)
        return None


def resolve_lang(bcp47: str) -> str:
    """Map BCP-47 language tag to Kokoro/espeak language code."""
    if bcp47 in LANG_MAP:
        return LANG_MAP[bcp47]
    # Try prefix match
    prefix = bcp47.split("-")[0].lower()
    for k, v in LANG_MAP.items():
        if k.lower().startswith(prefix):
            return v
    return "en-us"


def resolve_voice(lang_code: str, voice: str | None = None) -> str:
    """Pick a voice for the language, or validate the requested one."""
    if voice:
        return voice
    # Match by language prefix
    for prefix, default in DEFAULT_VOICES.items():
        if lang_code.startswith(prefix):
            return default
    return "af_heart"


def is_available() -> bool:
    """Check if TTS is available without fully loading the engine."""
    if _engine is not None:
        return True
    return (
        _find_model_files() is not None
        and importlib.util.find_spec("kokoro_onnx") is not None
        and importlib.util.find_spec("soundfile") is not None
    )
