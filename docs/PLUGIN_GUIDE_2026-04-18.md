# iHomeNerd Plugin Development Guide

**Date:** 2026-04-18
**Status:** Architecture Specification
**Audience:** Teams building iHomeNerd plugins (iMedisys, Tax, Kitchen, ScamHunter)

---

## 1. What Is a Plugin?

A plugin extends iHomeNerd with **domain-specific intelligence** that goes beyond the horizontal capabilities (chat, docs, investigate, agents). Plugins live in `backend/app/plugins/` and register as FastAPI routers.

**When you need a plugin:**
- Your app requires domain-specific rules, prompts, or data models
- You need specialized endpoints beyond generic chat/docs/investigate
- Your domain has unique validation, scoring, or workflow logic

**When you do NOT need a plugin:**
- Your app just needs "ask questions about my documents" → use `/v1/docs/ask`
- Your app just needs translation or summarization → use `/v1/translate` or `/v1/summarize`
- Your app just needs network scanning → use `/v1/investigate/`

---

## 2. Plugin File Structure

```
backend/app/plugins/
├── __init__.py
├── pronunco.py          ← reference implementation (exists)
├── imedisys.py          ← medical coding & Medicare (new)
├── tax.py               ← tax/compliance copilot (new)
├── kitchen.py           ← restaurant receipt/dish (new)
└── scamhunter.py        ← investigation pipeline (new)
```

Each plugin is a single Python file containing:
1. A FastAPI `APIRouter` with a unique prefix
2. Pydantic request/response models
3. Domain-specific logic calling shared services

---

## 3. Reference: PronunCo Plugin

The PronunCo plugin (`plugins/pronunco.py`) is the existing reference implementation:

```python
from fastapi import APIRouter
from pydantic import BaseModel
from ..ollama import generate, chat as ollama_chat
from .. import sessions, tts, asr

router = APIRouter(prefix="/v1", tags=["pronunco"])

class LessonExtractRequest(BaseModel):
    reducedText: str
    targetLang: str = "zh-CN"
    # ... other fields

class LessonExtractResponse(BaseModel):
    items: list[LessonItem]
    # ... other fields

@router.post("/lesson-extract", response_model=LessonExtractResponse)
async def lesson_extract(req: LessonExtractRequest):
    # Build domain-specific prompt
    prompt = f"Extract vocabulary from: {req.reducedText}..."
    # Call shared LLM service
    result = await generate(prompt, tier="medium")
    # Parse and return domain-specific response
    return LessonExtractResponse(items=parse_items(result))
```

**Key patterns:**
- Router prefix: `/v1` (all plugins share the `/v1` namespace)
- Tags: plugin name (for OpenAPI docs grouping)
- Uses shared services via imports (`..ollama`, `..tts`, `..asr`)
- Domain-specific Pydantic models for request/response
- Domain-specific prompt engineering

---

## 4. Registration

Plugins register in `main.py` with a single import + `include_router`:

```python
# main.py
from .plugins.pronunco import router as pronunco_router
from .plugins.imedisys import router as imedisys_router  # new

app.include_router(pronunco_router)
app.include_router(imedisys_router)  # new
```

No configuration files, no plugin registry, no dynamic loading. Simple Python imports.

---

## 5. Shared Services Available to Plugins

### 5.1 LLM (`ollama.py`)

```python
from ..ollama import generate, chat, embed

# Generate text (single prompt → response)
result = await generate(prompt, tier="medium")

# Multi-turn chat
result = await chat(messages=[
    {"role": "system", "content": "You are a medical coding expert."},
    {"role": "user", "content": user_question}
], tier="medium")

# Embed text for vector search
vector = await embed(text)
```

Tier-based model resolution automatically picks the best available model:
- `light`: Fast, simple tasks (gemma4:e2b)
- `medium`: Standard reasoning (gemma4:e4b or e2b depending on VRAM)
- `heavy`: Complex analysis (gemma4:26b+ if available)
- `embedding`: Vector embeddings (nomic-embed-text)

### 5.2 Document Store (`docstore.py`)

```python
from ..docstore import DocStore

store = DocStore()

# Ingest documents from a folder
await store.ingest(collection_id="tax-2026", folder_path="/path/to/tax/docs")

# Semantic search with citations
results = await store.search(
    collection_id="tax-2026",
    query="What is the standard deduction for married filing jointly?",
    k=5,
    min_score=0.7
)
```

### 5.3 Rules Engine (`rules.py`) — NEW

```python
from ..rules import evaluate, load_rules, validate_rules

# Evaluate rules against user facts
result = evaluate(domain="medicare", facts={
    "age": 67,
    "state": "NJ",
    "current_plan_type": "MA",
    "current_plan_start_date": "2025-08-15"
})

# result.outcomes → list of Outcome with severity, message, deadline
# result.trace → audit trail of which rules fired and why
```

### 5.4 Vision Service (`vision.py`) — NEW

```python
from ..vision import analyze_image

# OCR a receipt
result = await analyze_image(
    image_path="/path/to/receipt.jpg",
    prompt="Extract all line items, totals, tax, and vendor name as JSON",
    tier="medium"
)

# Recognize a dish
result = await analyze_image(
    image_bytes=uploaded_file.read(),
    prompt="Identify this dish. Return name, likely ingredients, cuisine type.",
    tier="medium"
)
```

### 5.5 Voice (`asr.py`, `tts.py`)

```python
from .. import asr, tts

# Transcribe audio
transcript = await asr.transcribe(audio_bytes, language="en")

# Synthesize speech
wav_bytes = await tts.synthesize("Your trial right expires in 90 days.", voice="en-us-1")
```

---

## 6. Plugin Template

Minimal plugin skeleton:

```python
"""MyDomain plugin — one-line description.

Contract source: MyApp/docs/IHOMENERD_PLUGIN_SPEC.md
"""

from __future__ import annotations

import logging
from fastapi import APIRouter
from pydantic import BaseModel, Field
from ..ollama import generate

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/v1", tags=["mydomain"])

# ---------------------------------------------------------------------------
# Request / response schemas
# ---------------------------------------------------------------------------

class MyRequest(BaseModel):
    input_text: str
    option: str = "default"

class MyResponse(BaseModel):
    result: str
    confidence: float

# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/mydomain/analyze", response_model=MyResponse)
async def analyze(req: MyRequest):
    """Analyze input using domain-specific logic."""

    # 1. Build domain-specific prompt
    prompt = f"""You are a {domain} expert. Analyze the following:
    {req.input_text}
    Return JSON: {{"result": "...", "confidence": 0.0-1.0}}"""

    # 2. Call shared LLM service
    raw = await generate(prompt, tier="medium")

    # 3. Parse and validate domain-specific response
    parsed = _parse_response(raw)

    return MyResponse(**parsed)
```

---

## 7. Planned Plugins

### 7.1 iMedisys Plugin (`plugins/imedisys.py`)

```
POST /v1/medical/analyze          — Clinical text → ICD-10/CPT codes + gaps
POST /v1/medical/medicare-compare — User profile → MA vs Medigap recommendation
POST /v1/medical/bill-explain     — EOB/bill → plain-English breakdown
GET  /v1/medical/rules/{topic}    — Deterministic rule lookup (no LLM)
```

Uses: `ollama` (clinical reasoning), `rules` (Medicare/payer logic), `vision` (bill OCR), `docstore` (plan document RAG)

See: iMedisys `docs/IHOMENERD_MIGRATION_PLAN.md`

### 7.2 Tax Plugin (`plugins/tax.py`)

```
POST /v1/tax/analyze              — Tax document → extracted data + computation
POST /v1/tax/estimate             — User profile → tax estimate with four-layer explanation
POST /v1/tax/deduction-check      — Expense → deductibility assessment with authority citation
```

Uses: `ollama` (narration), `rules` (tax brackets, deductions), `vision` (W-2/1099 OCR), `docstore` (IRS publication RAG)

### 7.3 Kitchen Plugin (`plugins/kitchen.py`)

```
POST /v1/kitchen/receipt          — Receipt photo → structured line items
POST /v1/kitchen/invoice          — Invoice photo → PO, terms, items
POST /v1/kitchen/dish             — Dish photo → name, ingredients, cost estimate
POST /v1/kitchen/inventory-query  — "How much did I spend on produce this month?"
```

Uses: `vision` (receipt/invoice/dish OCR), `docstore` (searchable archive), `ollama` (cost analysis)

### 7.4 ScamHunter Plugin (`plugins/scamhunter.py`)

```
POST /v1/scamhunter/investigate   — URL/wallet/domain → risk assessment
POST /v1/scamhunter/evidence      — Screenshot → extracted text + metadata
POST /v1/scamhunter/report        — Case collection → investigation report
POST /v1/scamhunter/publish       — Report → Markdown for Crypto-Fakes blog
```

Uses: `vision` (screenshot analysis), `docstore` (evidence RAG), `agents` (investigation workflow), `ollama` (report generation)

See: iScamHunter `docs/IHOMENERD_INTEGRATION.md`

---

## 8. Best Practices

1. **Prompts are your domain expertise.** The shared LLM is generic; your prompt makes it a specialist. Invest in prompt engineering and version your prompts.

2. **Use rules for deterministic logic.** If the answer can be computed from structured data (tax brackets, enrollment windows, coding rules), use the rules engine. Reserve the LLM for explanation and narration.

3. **Type your contracts.** Pydantic models are documentation and validation in one. Match your app's frontend contract exactly.

4. **Log domain events.** Use `logger.info()` for successful operations and `logger.warning()` for unusual inputs. The System dashboard aggregates these.

5. **Handle missing capabilities gracefully.** Not every iHomeNerd instance has vision or heavy-tier models. Check `/capabilities` and degrade gracefully.

```python
from ..capabilities import get_capabilities

caps = get_capabilities()
if not caps.get("analyze_image"):
    raise HTTPException(503, "Vision not available — requires Gemma 4 multimodal model")
```

6. **Keep plugins focused.** One plugin per domain. Don't combine tax and medical in one file. Each plugin should be independently deployable and testable.
