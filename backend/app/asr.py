"""Whisper ASR engine — local speech-to-text via faster-whisper.

Provides audio transcription using CTranslate2-optimized Whisper models.
Runs on CPU (int8) to leave GPU VRAM free for Gemma and other models.
"""

from __future__ import annotations

import io
import logging
import time

from .config import settings

logger = logging.getLogger(__name__)

# Lazy-loaded singleton
_engine: "WhisperEngine | None" = None

# Model preference: small is the sweet spot for accuracy vs speed on CPU
DEFAULT_MODEL = "small"


class WhisperEngine:
    """Wrapper around faster-whisper for iHomeNerd ASR."""

    def __init__(self, model_size: str = DEFAULT_MODEL):
        from faster_whisper import WhisperModel

        t0 = time.time()
        self.model = WhisperModel(model_size, device="cpu", compute_type="int8")
        self.model_size = model_size
        logger.info("Whisper ASR loaded: model=%s in %.1fs", model_size, time.time() - t0)

    def transcribe(
        self,
        audio: bytes | io.BytesIO,
        language: str | None = None,
        task: str = "transcribe",
    ) -> dict:
        """Transcribe audio bytes to text.

        Args:
            audio: WAV/MP3/OGG/etc bytes or BytesIO buffer
            language: BCP-47 or Whisper language code (None = auto-detect)
            task: "transcribe" or "translate" (translate to English)

        Returns dict with text, language, segments, duration.
        """
        if isinstance(audio, bytes):
            audio = io.BytesIO(audio)

        # Map BCP-47 to Whisper codes
        whisper_lang = _normalize_lang(language) if language else None

        t0 = time.time()
        segments, info = self.model.transcribe(
            audio,
            language=whisper_lang,
            task=task,
            beam_size=5,
            vad_filter=True,  # skip silence
        )
        # Force evaluation (segments is a generator)
        segment_list = []
        full_text_parts = []
        for seg in segments:
            segment_list.append({
                "start": round(seg.start, 2),
                "end": round(seg.end, 2),
                "text": seg.text.strip(),
            })
            full_text_parts.append(seg.text.strip())

        elapsed = time.time() - t0
        full_text = " ".join(full_text_parts)

        logger.info(
            "Transcribed: lang=%s, segments=%d, chars=%d, time=%.1fs",
            info.language, len(segment_list), len(full_text), elapsed,
        )

        return {
            "text": full_text,
            "language": info.language,
            "languageProbability": round(info.language_probability, 3),
            "duration": round(info.duration, 2),
            "segments": segment_list,
            "processingTime": round(elapsed, 2),
            "model": self.model_size,
        }


def _normalize_lang(lang: str) -> str | None:
    """Map BCP-47 language tags to Whisper language codes."""
    mapping = {
        "en-US": "en", "en-GB": "en",
        "zh-CN": "zh", "zh-TW": "zh",
        "ja-JP": "ja",
        "ko-KR": "ko",
        "es-ES": "es", "es-MX": "es",
        "fr-FR": "fr",
        "de-DE": "de",
        "it-IT": "it",
        "pt-BR": "pt",
        "ru-RU": "ru",
        "tr-TR": "tr",
        "uk-UA": "uk",
        "hi-IN": "hi",
    }
    if lang in mapping:
        return mapping[lang]
    # Try bare code
    short = lang.split("-")[0].lower()
    return short if len(short) == 2 else None


def get_engine() -> WhisperEngine | None:
    """Get or lazily initialize the Whisper ASR engine."""
    global _engine
    if _engine is not None:
        return _engine

    try:
        _engine = WhisperEngine(DEFAULT_MODEL)
        return _engine
    except Exception as e:
        logger.error("Failed to load Whisper ASR: %s", e)
        return None


def is_available() -> bool:
    """Check if ASR is available (faster-whisper installed)."""
    try:
        import faster_whisper  # noqa: F401
        return True
    except ImportError:
        return False
