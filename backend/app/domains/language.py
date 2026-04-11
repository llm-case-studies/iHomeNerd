"""Language domain — translate, chat, summarize.

Transcription (Whisper) deferred to Phase 2.
"""

from fastapi import APIRouter

from ..ollama import generate, chat as ollama_chat, MODELS

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
    result = await generate(prompt, model=MODELS["light"])
    return {"translation": result.strip(), "source": source, "target": target}


@router.post("/chat")
async def chat_endpoint(request: dict) -> dict:
    """General-purpose local chat.

    Body: { "messages": [{"role": "user", "content": "..."}] }
    """
    messages = request["messages"]
    result = await ollama_chat(messages)
    return {"response": result}


@router.post("/summarize")
async def summarize(request: dict) -> dict:
    """Summarize a text passage.

    Body: { "text": "...", "max_length": 200 }
    """
    text = request["text"]
    max_length = request.get("max_length", 200)

    prompt = f"Summarize the following text in at most {max_length} words. Be concise and factual.\n\n{text}"
    result = await generate(prompt)
    return {"summary": result.strip()}
