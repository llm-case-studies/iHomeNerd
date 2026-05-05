"""Speech domain — generic transcription and synthesis capabilities."""

from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Response
from pydantic import BaseModel

from .. import asr, tts

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/v1", tags=["speech"])


@router.post("/transcribe-audio")
async def transcribe_audio(
    file: UploadFile = File(...),
    language: str | None = Form(None),
    task: str = Form("transcribe"),
):
    """Transcribe learner audio for dialogue or assessment.

    Accepts audio as multipart file upload (WAV, MP3, OGG, WebM, etc).
    Optionally specify language (BCP-47) and task (transcribe/translate).
    """
    engine = asr.get_engine()
    if engine is None:
        raise HTTPException(status_code=503, detail="ASR engine is not available.")

    audio_bytes = await file.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Empty audio file.")

    try:
        result = engine.transcribe(audio=audio_bytes, language=language, task=task)
    except Exception as e:
        logger.error("Transcription failed: %s", e)
        raise HTTPException(status_code=502, detail=f"Transcription failed: {e}")

    return result


class SynthesizeSpeechRequest(BaseModel):
    text: str
    targetLang: str = "en-US"
    voice: str | None = None  # Kokoro voice name (e.g. "af_heart", "zf_xiaobei")
    speed: float = 1.0


@router.post("/synthesize-speech")
async def synthesize_speech(request: SynthesizeSpeechRequest):
    """Generate speech audio from text using Kokoro TTS.

    Returns WAV audio as a binary response.
    """
    engine = tts.get_engine()
    if engine is None:
        raise HTTPException(status_code=503, detail="TTS engine is not available. Kokoro model files not found.")

    lang_code = tts.resolve_lang(request.targetLang)
    voice = tts.resolve_voice(lang_code, request.voice)

    if voice not in engine.voices:
        raise HTTPException(status_code=400, detail=f"Unknown voice '{voice}'. Available: {engine.voices}")

    try:
        wav_bytes, sample_rate = engine.synthesize(
            text=request.text,
            voice=voice,
            lang=lang_code,
            speed=request.speed,
        )
    except Exception as e:
        logger.error("TTS synthesis failed: %s", e)
        raise HTTPException(status_code=502, detail=f"Speech synthesis failed: {e}")

    return Response(
        content=wav_bytes,
        media_type="audio/wav",
        headers={
            "X-Voice": voice,
            "X-Lang": lang_code,
            "X-Sample-Rate": str(sample_rate),
        },
    )


@router.get("/voices")
async def list_voices():
    """List available TTS voices."""
    engine = tts.get_engine()
    if engine is None:
        return {"available": False, "voices": []}
    return {"available": True, "voices": engine.voices}
