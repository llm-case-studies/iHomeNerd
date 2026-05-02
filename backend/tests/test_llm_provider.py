"""Unit coverage for the provider-neutral LLM layer."""

from __future__ import annotations

from app import llm
from app.config import settings


def test_openai_model_payload_parser_accepts_data_shape():
    payload = {
        "object": "list",
        "data": [
            {"id": "mlx-community/gemma-4-e2b-it-4bit"},
            {"id": "mlx-community/Qwen2.5-1.5B-Instruct-4bit"},
        ],
    }

    assert llm._model_names_from_openai_payload(payload) == [
        "mlx-community/gemma-4-e2b-it-4bit",
        "mlx-community/Qwen2.5-1.5B-Instruct-4bit",
    ]


def test_mlx_resolve_prefers_configured_model(monkeypatch):
    monkeypatch.setattr(settings, "llm_provider", "mlx")
    monkeypatch.setattr(settings, "mlx_model", "mlx-community/gemma-4-e2b-it-4bit")
    monkeypatch.setattr(llm, "_mlx_ready", True)
    monkeypatch.setattr(
        llm,
        "_mlx_models",
        {
            "mlx-community/Qwen2.5-1.5B-Instruct-4bit",
            "mlx-community/gemma-4-e2b-it-4bit",
        },
    )

    assert llm.resolve("medium") == "mlx-community/gemma-4-e2b-it-4bit"


def test_openai_content_parts_are_normalized_to_text():
    content = [
        {"type": "text", "text": "hello"},
        {"type": "text", "text": " world"},
    ]

    assert llm._content_text(content) == "hello world"
