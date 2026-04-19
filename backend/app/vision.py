"""Vision service — image understanding via Ollama multimodal models.

Provides OCR, document extraction, dish recognition, and general image
analysis through Gemma 3/LLaVA/Moondream vision models.

One service, many consumers:
  - Kitchen plugin: receipt OCR, invoice parsing, dish recognition
  - iMedisys plugin: bill/EOB OCR, medication label reading
  - Tax plugin: W-2/1099 form extraction
  - ScamHunter plugin: screenshot evidence extraction
  - Docs domain: ocr=true branch in ingest pipeline

Spec: docs/ECOSYSTEM_INTEGRATION_2026-04-18.md §3.2
"""

from __future__ import annotations

import base64
import json
import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Optional

import httpx

from .config import settings
from . import ollama

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Prompt templates for common vision tasks
# ---------------------------------------------------------------------------

PROMPTS = {
    "receipt": (
        "Extract all information from this receipt image as JSON. Include:\n"
        '- "vendor": store/restaurant name\n'
        '- "date": transaction date\n'
        '- "items": array of {"name": item name, "qty": quantity, "price": unit price}\n'
        '- "subtotal": subtotal before tax\n'
        '- "tax": tax amount\n'
        '- "total": total amount\n'
        '- "payment_method": if visible (cash, card last 4 digits)\n'
        "Return ONLY valid JSON, no markdown fences."
    ),
    "invoice": (
        "Extract all information from this invoice image as JSON. Include:\n"
        '- "vendor": company name\n'
        '- "invoice_number": invoice/PO number\n'
        '- "date": invoice date\n'
        '- "due_date": payment due date\n'
        '- "line_items": array of {"description", "quantity", "unit_price", "total"}\n'
        '- "subtotal": subtotal\n'
        '- "tax": tax amount\n'
        '- "total": total due\n'
        '- "payment_terms": e.g. "Net 30"\n'
        "Return ONLY valid JSON, no markdown fences."
    ),
    "dish": (
        "Identify the dish in this photo. Return JSON with:\n"
        '- "dish_name": most likely name of the dish\n'
        '- "cuisine": cuisine type (Italian, Chinese, Mexican, etc.)\n'
        '- "ingredients": array of likely ingredients\n'
        '- "estimated_cost_usd": rough restaurant price range "low"/"medium"/"high"\n'
        '- "dietary_notes": any notable dietary info (vegetarian, contains nuts, etc.)\n'
        '- "confidence": your confidence 0.0-1.0\n'
        "Return ONLY valid JSON, no markdown fences."
    ),
    "medical_bill": (
        "Extract all information from this medical bill or EOB image as JSON. Include:\n"
        '- "provider": healthcare provider name\n'
        '- "patient_name": if visible (note: may be redacted)\n'
        '- "date_of_service": service date\n'
        '- "procedures": array of {"cpt_code", "description", "billed_amount", "allowed_amount", "patient_responsibility"}\n'
        '- "total_billed": total billed amount\n'
        '- "insurance_paid": amount insurance covered\n'
        '- "patient_owes": patient responsibility\n'
        '- "plan_name": insurance plan if visible\n'
        "Return ONLY valid JSON, no markdown fences."
    ),
    "tax_form": (
        "Extract all box values from this tax form (W-2, 1099, etc.) as JSON. Include:\n"
        '- "form_type": "W-2", "1099-MISC", "1099-NEC", "1099-INT", etc.\n'
        '- "tax_year": year\n'
        '- "payer": employer/payer name and EIN if visible\n'
        '- "recipient": recipient name and SSN last 4 if visible\n'
        '- "boxes": object mapping box numbers/labels to values, e.g. {"1": 52000, "2": 8500}\n'
        "Return ONLY valid JSON, no markdown fences."
    ),
    "screenshot": (
        "Extract all visible information from this screenshot. Return JSON with:\n"
        '- "text": all visible text, preserving layout\n'
        '- "urls": any URLs or domains visible\n'
        '- "emails": any email addresses\n'
        '- "phone_numbers": any phone numbers\n'
        '- "crypto_addresses": any cryptocurrency wallet addresses\n'
        '- "dollar_amounts": any monetary amounts\n'
        '- "red_flags": any suspicious elements (spelling errors, urgency language, suspicious domains)\n'
        '- "platform": detected platform (email client, WhatsApp, Telegram, browser, etc.)\n'
        "Return ONLY valid JSON, no markdown fences."
    ),
    "ocr": (
        "Extract all text from this image. Preserve the original layout and formatting "
        "as much as possible. Include headers, paragraphs, tables, and any visible text. "
        "Return the extracted text as plain text, not JSON."
    ),
    "general": (
        "Describe what you see in this image in detail. "
        "Include any text, objects, people, settings, and notable features."
    ),
}


# ---------------------------------------------------------------------------
# Data types
# ---------------------------------------------------------------------------


@dataclass
class VisionResult:
    """Result of an image analysis."""
    raw_text: str                          # Raw model output
    structured: Optional[dict] = None      # Parsed JSON if the prompt requested it
    model: str = ""                        # Which model was used
    prompt_template: str = ""              # Which template was used
    parse_error: Optional[str] = None      # JSON parse error if structured extraction failed


# ---------------------------------------------------------------------------
# Core functions
# ---------------------------------------------------------------------------


def is_available() -> bool:
    """Check if any vision-capable model is available."""
    return ollama.resolve("vision") is not None


def available_model() -> Optional[str]:
    """Return the best available vision model name, or None."""
    return ollama.resolve("vision")


def _encode_image_bytes(image_bytes: bytes) -> str:
    """Encode image bytes to base64 string for Ollama API."""
    return base64.b64encode(image_bytes).decode("utf-8")


def _encode_image_file(path: Path) -> str:
    """Read and encode an image file to base64."""
    return _encode_image_bytes(path.read_bytes())


def _try_parse_json(text: str) -> tuple[Optional[dict], Optional[str]]:
    """Try to parse JSON from model output. Handles markdown fences."""
    cleaned = text.strip()

    # Strip markdown code fences if present
    if cleaned.startswith("```"):
        lines = cleaned.split("\n")
        # Remove first line (```json or ```) and last line (```)
        lines = [l for l in lines if not l.strip().startswith("```")]
        cleaned = "\n".join(lines).strip()

    try:
        return json.loads(cleaned), None
    except json.JSONDecodeError as e:
        # Try to find JSON object in the text
        start = cleaned.find("{")
        end = cleaned.rfind("}") + 1
        if start >= 0 and end > start:
            try:
                return json.loads(cleaned[start:end]), None
            except json.JSONDecodeError:
                pass
        return None, f"Failed to parse JSON: {e}"


async def analyze_image(
    image_bytes: Optional[bytes] = None,
    image_path: Optional[str] = None,
    prompt: Optional[str] = None,
    template: Optional[str] = None,
    model: Optional[str] = None,
    parse_json: bool = True,
) -> VisionResult:
    """Analyze an image using a vision-capable model via Ollama.

    Args:
        image_bytes: Raw image bytes (provide this OR image_path)
        image_path: Path to image file (provide this OR image_bytes)
        prompt: Custom prompt (overrides template)
        template: Named prompt template from PROMPTS dict
        model: Specific model to use (default: best available vision model)
        parse_json: Whether to attempt JSON parsing of the response

    Returns:
        VisionResult with raw text and optionally parsed structured data.
    """
    # Resolve image
    if image_bytes is None and image_path is not None:
        p = Path(image_path)
        if not p.exists():
            raise FileNotFoundError(f"Image not found: {image_path}")
        image_bytes = p.read_bytes()
    if image_bytes is None:
        raise ValueError("Provide either image_bytes or image_path")

    b64 = _encode_image_bytes(image_bytes)

    # Resolve prompt
    template_name = template or "general"
    if prompt is None:
        prompt = PROMPTS.get(template_name, PROMPTS["general"])

    # For OCR template, don't try to parse JSON
    if template_name == "ocr" or template_name == "general":
        parse_json = False

    # Resolve model
    if not model:
        model = ollama.resolve("vision")
    if not model:
        raise RuntimeError(
            "No vision-capable model available. "
            "Install one with: ollama pull gemma3:4b (or llava, moondream)"
        )

    # Call Ollama with image
    logger.info(
        "vision: model=%s template=%s image_size=%d bytes",
        model, template_name, len(image_bytes),
    )

    payload = {
        "model": model,
        "prompt": prompt,
        "images": [b64],
        "stream": False,
    }

    async with httpx.AsyncClient(timeout=180.0) as client:
        resp = await client.post(
            f"{settings.ollama_url}/api/generate",
            json=payload,
        )
        resp.raise_for_status()
        raw_text = resp.json()["response"]

    # Parse structured data if requested
    structured = None
    parse_error = None
    if parse_json:
        structured, parse_error = _try_parse_json(raw_text)
        if parse_error:
            logger.warning("Vision JSON parse failed: %s", parse_error)

    return VisionResult(
        raw_text=raw_text,
        structured=structured,
        model=model,
        prompt_template=template_name,
        parse_error=parse_error,
    )


async def ocr(
    image_bytes: Optional[bytes] = None,
    image_path: Optional[str] = None,
    model: Optional[str] = None,
) -> str:
    """Extract text from an image (OCR). Returns plain text.

    Convenience wrapper around analyze_image with the 'ocr' template.
    """
    result = await analyze_image(
        image_bytes=image_bytes,
        image_path=image_path,
        template="ocr",
        model=model,
        parse_json=False,
    )
    return result.raw_text


async def extract_structured(
    image_bytes: Optional[bytes] = None,
    image_path: Optional[str] = None,
    template: str = "receipt",
    prompt: Optional[str] = None,
    model: Optional[str] = None,
) -> dict[str, Any]:
    """Extract structured data from an image. Returns parsed JSON dict.

    Convenience wrapper that raises on parse failure.
    """
    result = await analyze_image(
        image_bytes=image_bytes,
        image_path=image_path,
        template=template,
        prompt=prompt,
        model=model,
        parse_json=True,
    )
    if result.structured is None:
        raise ValueError(
            f"Failed to extract structured data: {result.parse_error}\n"
            f"Raw model output: {result.raw_text[:500]}"
        )
    return result.structured


# ---------------------------------------------------------------------------
# Batch processing for Docs ingest pipeline
# ---------------------------------------------------------------------------


IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp", ".tiff", ".tif"}


def is_image_file(path: Path) -> bool:
    """Check if a file path is a supported image format."""
    return path.suffix.lower() in IMAGE_EXTENSIONS


async def ocr_for_ingest(image_path: Path) -> list[tuple[int, str]]:
    """OCR an image file and return in the same format as docstore text extraction.

    Returns list of (page_number, text) tuples — always a single "page" for images.
    Used by the Docs ingest pipeline when ocr=true.
    """
    if not image_path.exists():
        return []

    try:
        text = await ocr(image_path=str(image_path))
        if text and text.strip():
            return [(1, text.strip())]
        return []
    except Exception as e:
        logger.warning("OCR failed for %s: %s", image_path, e)
        return []
