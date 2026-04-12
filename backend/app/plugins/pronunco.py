"""PronunCo plugin — lesson extraction, dialogue, and teaching capabilities.

V1 scope: /v1/lesson-extract only.
Band 1 stubs: image-extract, dialogue-session, dialogue-turn (shape visible, not implemented).

Contract source: PronunCo/docs/development/IHOMENERD_PRONUNCO_PLUGIN_V1_2026-04-11.md
"""

from __future__ import annotations

import json
import logging

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from ..ollama import generate, chat as ollama_chat
from .. import sessions

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/v1", tags=["pronunco"])

# ---------------------------------------------------------------------------
# Request / response schemas (matching PronunCo's browser contract exactly)
# ---------------------------------------------------------------------------


class LessonExtractRequest(BaseModel):
    reducedText: str
    lessonNumberHint: int | None = None
    sourceName: str = ""
    targetLang: str = "zh-CN"
    supportLang: str = "en-US"
    materialLang: str = "en-US"
    outputRecipe: str = "mixed_lesson"
    referenceText: str | None = None


class LessonItem(BaseModel):
    hanzi: str  # primary target text (Chinese) or target-lang text (other languages)
    pinyin: str = ""  # reading cue / transliteration / pronunciation aid
    meaning_en: str = ""  # gloss in supportLang
    meaning_ru: str = ""  # note/gloss in materialLang when useful
    notes: str = ""  # teaching note for the learner
    type: str = "phrase"  # word, phrase, tone_rule, phonetic
    confidence: str = "medium"  # high, medium, low


class LessonExtractResponse(BaseModel):
    lessonNumber: int | None = None
    lessonTitle: str
    warnings: list[str] = []
    items: list[LessonItem]


class DialogueSessionRequest(BaseModel):
    scenarioId: str | None = None
    scenarioPrompt: str | None = None
    learnerRole: str = "learner"
    agentRole: str = "agent"
    targetLang: str = "zh-CN"
    supportLang: str = "en-US"
    difficulty: str = "intermediate"
    personaId: str | None = None
    voiceMode: bool = False
    turnBudget: int = 20


class DialogueTurnRequest(BaseModel):
    sessionId: str
    userText: str
    userAudioBase64: str | None = None  # future: audio input


# ---------------------------------------------------------------------------
# V1: Lesson extraction
# ---------------------------------------------------------------------------

LESSON_EXTRACT_SYSTEM = """You are a language teaching assistant for PronunCo.
Your job is to extract drillable lesson items from teacher material.

Rules:
- Return ONLY valid JSON matching the schema. No markdown, no commentary.
- Prefer short, drillable items over broad summaries.
- Keep learner-facing titles short and usable in deck lists.
- Preserve tone marks or reading cues when the target language uses them.
- If extraction is uncertain, add a warning instead of inventing confidence.
- If the lesson is thin, return fewer rows instead of padding with filler.
- referenceText is context only — do NOT automatically turn it into drill items.

For non-Chinese languages, the legacy field names still apply:
- hanzi = primary target text
- pinyin = reading cue, transliteration, or pronunciation aid
- meaning_en = concise gloss in the support language
- meaning_ru = concise note/gloss in the material language when useful

Valid type values: word, phrase, tone_rule, phonetic
Valid confidence values: high, medium, low

Return JSON in this exact shape:
{
  "lessonNumber": <number or null>,
  "lessonTitle": "<short title>",
  "warnings": ["<optional warning strings>"],
  "items": [
    {
      "hanzi": "...",
      "pinyin": "...",
      "meaning_en": "...",
      "meaning_ru": "...",
      "notes": "...",
      "type": "word|phrase|tone_rule|phonetic",
      "confidence": "high|medium|low"
    }
  ]
}"""


@router.post("/lesson-extract", response_model=LessonExtractResponse)
async def lesson_extract(request: LessonExtractRequest):
    """Turn reduced lesson text into a PronunCo lesson pack draft.

    This is the only local AI route PronunCo's browser currently calls
    for Lesson Companion generation.
    """
    # Build the user prompt
    parts = [
        f"Source: {request.sourceName}" if request.sourceName else None,
        f"Lesson number hint: {request.lessonNumberHint}" if request.lessonNumberHint else None,
        f"Target language: {request.targetLang}",
        f"Support language: {request.supportLang}",
        f"Material language: {request.materialLang}",
        f"Output recipe: {request.outputRecipe}",
        "",
        "=== Drill-candidate lines (extract from these) ===",
        request.reducedText,
    ]
    if request.referenceText:
        parts.extend([
            "",
            "=== Reference context only (do NOT turn into drills) ===",
            request.referenceText,
        ])

    user_prompt = "\n".join(p for p in parts if p is not None)

    try:
        raw = await generate(
            prompt=user_prompt,
            tier="medium",
            system=LESSON_EXTRACT_SYSTEM,
        )
    except Exception as e:
        logger.error("Ollama generation failed: %s", e)
        raise HTTPException(status_code=503, detail="Lesson extraction model is not available yet.")

    # Parse and validate JSON
    try:
        # Strip markdown fences if model wraps output
        cleaned = raw.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[1] if "\n" in cleaned else cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[: cleaned.rfind("```")]
        cleaned = cleaned.strip()

        data = json.loads(cleaned)
    except json.JSONDecodeError as e:
        logger.warning("Model returned invalid JSON: %s", e)
        raise HTTPException(status_code=502, detail=f"Model returned invalid JSON: {e}")

    # Coerce null fields to empty strings / defaults before validation
    for item in data.get("items", []):
        for field in ("hanzi", "pinyin", "meaning_en", "meaning_ru", "notes"):
            if item.get(field) is None:
                item[field] = ""
        if item.get("type") is None:
            item["type"] = "phrase"
        if item.get("confidence") is None:
            item["confidence"] = "medium"

    # Validate against schema
    try:
        response = LessonExtractResponse(**data)
    except Exception as e:
        logger.warning("Model output failed schema validation: %s", e)
        raise HTTPException(status_code=502, detail=f"Model output failed validation: {e}")

    # Validate enum values
    valid_types = {"word", "phrase", "tone_rule", "phonetic"}
    valid_confidences = {"high", "medium", "low"}
    for item in response.items:
        if item.type not in valid_types:
            item.type = "phrase"  # safe default
        if item.confidence not in valid_confidences:
            item.confidence = "medium"

    return response


# ---------------------------------------------------------------------------
# Band 1 stubs — shape visible, not implemented
# ---------------------------------------------------------------------------


@router.post("/image-extract")
async def image_extract(request: dict):
    """Extract teaching content from lesson images (articulation diagrams, worksheets).

    NOT IMPLEMENTED in V1. Returns 501.
    """
    raise HTTPException(status_code=501, detail="Image extraction is not available yet.")


@router.post("/dialogue-session")
async def dialogue_session(request: DialogueSessionRequest):
    """Start a bounded scenario rehearsal session.

    Creates a short-lived session for turn-based dialogue practice.
    """
    session = sessions.create(
        app="pronunco",
        purpose="dialogue",
        config={
            "scenarioId": request.scenarioId,
            "scenarioPrompt": request.scenarioPrompt,
            "learnerRole": request.learnerRole,
            "agentRole": request.agentRole,
            "targetLang": request.targetLang,
            "supportLang": request.supportLang,
            "difficulty": request.difficulty,
            "personaId": request.personaId,
            "voiceMode": request.voiceMode,
            "turnBudget": request.turnBudget,
        },
    )

    # Set up the scenario as the system message
    scenario_desc = request.scenarioPrompt or f"Scenario: {request.scenarioId or 'general conversation'}"
    system_msg = (
        f"You are playing the role of '{request.agentRole}' in a language practice scenario.\n"
        f"The learner plays '{request.learnerRole}'.\n"
        f"Target language: {request.targetLang}. Support language: {request.supportLang}.\n"
        f"Difficulty: {request.difficulty}.\n"
        f"Scenario: {scenario_desc}\n\n"
        f"Rules:\n"
        f"- Stay in character and in the scenario.\n"
        f"- Keep responses appropriate for {request.difficulty} level.\n"
        f"- Use {request.targetLang} for dialogue, with {request.supportLang} hints when needed.\n"
        f"- Limit the exchange to about {request.turnBudget} turns.\n"
        f"- Return JSON with fields: agentText, acceptableIntents, repairOptions, "
        f"pronunciationTargets, difficulty, canEnd, turnId"
    )
    session.add_turn("system", system_msg)

    return {
        "sessionId": session.id,
        "expiresAt": session.expires_at,
        "agentRole": request.agentRole,
        "learnerRole": request.learnerRole,
        "status": "ready",
    }


@router.post("/dialogue-turn")
async def dialogue_turn(request: DialogueTurnRequest):
    """Advance one turn in a dialogue scenario.

    Returns the agent's response with teaching structure.
    """
    session = sessions.get(request.sessionId)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found or expired.")

    if session.closed:
        raise HTTPException(status_code=410, detail="Session is closed.")

    turn_budget = session.config.get("turnBudget", 20)
    user_turns = sum(1 for t in session.turns if t.role == "user")

    session.add_turn("user", request.userText)

    try:
        raw = await ollama_chat(session.messages_for_llm(), tier="medium")
    except Exception as e:
        logger.error("Dialogue generation failed: %s", e)
        raise HTTPException(status_code=503, detail="Dialogue model is not available.")

    session.add_turn("agent", raw)

    can_end = user_turns + 1 >= turn_budget

    return {
        "agentText": raw,
        "turnId": len(session.turns),
        "turnsUsed": user_turns + 1,
        "turnBudget": turn_budget,
        "canEnd": can_end,
        "sessionId": session.id,
    }


# ---------------------------------------------------------------------------
# Future stubs
# ---------------------------------------------------------------------------


@router.post("/transcribe-audio")
async def transcribe_audio(request: dict):
    """Transcribe learner audio for dialogue or assessment. NOT IMPLEMENTED in V1."""
    raise HTTPException(status_code=501, detail="Audio transcription is not available yet.")


@router.post("/synthesize-speech")
async def synthesize_speech(request: dict):
    """Generate speech for agent turns or reference lines. NOT IMPLEMENTED in V1."""
    raise HTTPException(status_code=501, detail="Speech synthesis is not available yet.")


@router.post("/score-explain")
async def score_explain(request: dict):
    """Explain a pronunciation score with coaching guidance. NOT IMPLEMENTED in V1."""
    raise HTTPException(status_code=501, detail="Score explanation is not available yet.")


@router.post("/drill-generate")
async def drill_generate(request: dict):
    """Generate repair drills from weak spots. NOT IMPLEMENTED in V1."""
    raise HTTPException(status_code=501, detail="Drill generation is not available yet.")
