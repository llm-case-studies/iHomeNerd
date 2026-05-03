"""Language domain — translate, chat, summarize.

Transcription (Whisper) deferred to Phase 2.
"""

from fastapi import APIRouter, HTTPException

from ..llm import (
    generate,
    chat as llm_chat,
    provider_name,
    backend_name,
    resolve,
)

router = APIRouter(prefix="/v1", tags=["language"])


@router.post("/translate")
async def translate(request: dict) -> dict:
    """Translate text between languages.

    Body: { "text": "...", "source": "en", "target": "es" }
    """
    text = request["text"]
    source = request.get("source", "auto")
    target = request["target"]

    prompt = f"Translate the following from {source} to {target}. Return ONLY the translation, nothing else.\n\n{text}"
    result = await generate(prompt, tier="light")
    return {"translation": result.strip(), "source": source, "target": target}


@router.post("/chat")
async def chat_endpoint(request: dict) -> dict:
    """General-purpose local chat.

    Body: { "prompt": "..." } or { "messages": [{"role": "user", "content": "..."}] }
    """
    prompt = request.get("prompt")
    messages = request.get("messages")

    if prompt and isinstance(prompt, str) and prompt.strip():
        messages = [{"role": "user", "content": prompt}]
    elif not messages:
        raise HTTPException(
            status_code=400,
            detail="Request must include a non-empty 'prompt' string or 'messages' array.",
        )

    try:
        result = await llm_chat(messages, tier="medium")
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    model = resolve("medium")
    return {
        "role": "assistant",
        "content": result,
        "response": result,
        "text": result,
        "model": model,
        "backend": backend_name(),
        "provider": provider_name(),
    }


@router.post("/summarize")
async def summarize(request: dict) -> dict:
    """Summarize a text passage.

    Body: { "text": "...", "max_length": 200 }
    """
    text = request["text"]
    max_length = request.get("max_length", 200)

    prompt = f"Summarize the following text in at most {max_length} words. Be concise and factual.\n\n{text}"
    result = await generate(prompt, tier="medium")
    return {"summary": result.strip()}
