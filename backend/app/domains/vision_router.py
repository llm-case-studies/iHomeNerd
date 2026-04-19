"""Vision domain — image understanding via multimodal LLM.

Exposes image analysis, OCR, and structured extraction via REST endpoints.
Supports receipt/invoice/dish/medical bill/tax form/screenshot templates,
plus custom prompts for any image task.

Spec: docs/ECOSYSTEM_INTEGRATION_2026-04-18.md §3.2
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel, Field

from .. import vision

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/v1/vision", tags=["vision"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


class AnalyzeResponse(BaseModel):
    raw_text: str
    structured: Optional[Dict[str, Any]] = None
    model: str = ""
    template: str = ""
    parse_error: Optional[str] = None


class OcrResponse(BaseModel):
    text: str
    model: str = ""


class TemplateInfo(BaseModel):
    name: str
    description: str
    returns_json: bool


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_image(
    file: UploadFile = File(...),
    template: str = Form("general"),
    prompt: Optional[str] = Form(None),
):
    """Analyze an image using a vision-capable model.

    Upload an image and optionally specify a template (receipt, invoice, dish,
    medical_bill, tax_form, screenshot, ocr, general) or a custom prompt.

    Templates return structured JSON; 'ocr' and 'general' return plain text.
    """
    if not vision.is_available():
        raise HTTPException(
            status_code=503,
            detail="No vision-capable model available. Install one with: ollama pull gemma3:4b",
        )

    image_bytes = await file.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="Empty file uploaded")

    # Validate template name
    if template not in vision.PROMPTS and prompt is None:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown template '{template}'. Available: {list(vision.PROMPTS.keys())}",
        )

    try:
        result = await vision.analyze_image(
            image_bytes=image_bytes,
            template=template if prompt is None else None,
            prompt=prompt,
        )
    except Exception as e:
        logger.error("Vision analysis failed: %s", e)
        raise HTTPException(status_code=500, detail=f"Vision analysis failed: {e}")

    return AnalyzeResponse(
        raw_text=result.raw_text,
        structured=result.structured,
        model=result.model,
        template=result.prompt_template,
        parse_error=result.parse_error,
    )


@router.post("/ocr", response_model=OcrResponse)
async def ocr_image(file: UploadFile = File(...)):
    """Extract text from an image (OCR).

    Returns plain text extracted from the image. For structured extraction
    (receipts, invoices, etc.), use /analyze with a template instead.
    """
    if not vision.is_available():
        raise HTTPException(
            status_code=503,
            detail="No vision-capable model available. Install one with: ollama pull gemma3:4b",
        )

    image_bytes = await file.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="Empty file uploaded")

    try:
        text = await vision.ocr(image_bytes=image_bytes)
    except Exception as e:
        logger.error("OCR failed: %s", e)
        raise HTTPException(status_code=500, detail=f"OCR failed: {e}")

    return OcrResponse(text=text, model=vision.available_model() or "")


@router.post("/extract/{template}")
async def extract_structured(
    template: str,
    file: UploadFile = File(...),
):
    """Extract structured data from an image using a named template.

    Shorthand for /analyze with a specific template. Returns the parsed
    JSON directly (not wrapped in an AnalyzeResponse).

    Available templates: receipt, invoice, dish, medical_bill, tax_form, screenshot
    """
    if template not in vision.PROMPTS:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown template '{template}'. Available: {list(vision.PROMPTS.keys())}",
        )

    if not vision.is_available():
        raise HTTPException(
            status_code=503,
            detail="No vision-capable model available.",
        )

    image_bytes = await file.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="Empty file uploaded")

    try:
        data = await vision.extract_structured(
            image_bytes=image_bytes,
            template=template,
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.error("Structured extraction failed: %s", e)
        raise HTTPException(status_code=500, detail=f"Extraction failed: {e}")

    return data


@router.get("/templates", response_model=List[TemplateInfo])
async def list_templates():
    """List available prompt templates for image analysis."""
    json_templates = {"receipt", "invoice", "dish", "medical_bill", "tax_form", "screenshot"}
    return [
        TemplateInfo(
            name=name,
            description=prompt[:80] + "..." if len(prompt) > 80 else prompt,
            returns_json=name in json_templates,
        )
        for name, prompt in vision.PROMPTS.items()
    ]


@router.get("/status")
async def vision_status():
    """Check if vision capability is available and which model is loaded."""
    model = vision.available_model()
    return {
        "available": model is not None,
        "model": model,
        "supported_formats": sorted(vision.IMAGE_EXTENSIONS),
        "templates": list(vision.PROMPTS.keys()),
    }
