# Mac MLX Model Ladder

**Date:** 2026-05-05
**Initiative:** `iphone-to-mac-brain`
**Status:** working reference

## Purpose

This is an estimated Apple Silicon model ladder for Mac-hosted iHN nodes. It
connects three things that should not be collapsed into one knob:

- unified memory available on the Mac
- the task or client need category
- the model/runtime pair that has actually been validated by iHN

The current validated default remains:

```text
mlx-community/Qwen2.5-1.5B-Instruct-4bit
```

Do not promote a larger or newer model to installer default until it passes a
real sidecar smoke on `mac-mini` with the pinned `mlx-lm` runtime.

## Need Categories

The uniform web UI discussion uses app-defined capability ports: clients name
what they need, not which provider implements it. Mac model choice should follow
the same rule.

| Need category | What it optimizes for | Model implication |
|---|---|---|
| command/control chat | low latency, reliable short answers, setup help | smallest validated instruct model |
| household assistant | natural multi-turn help, summarization, light planning | 3B to 4B class if RAM allows |
| document/RAG answer drafting | instruction following, citation discipline, longer context | 4B to 8B class; context cost matters |
| coding/technical help | code priors, structured edits, diagnostics | coder-tuned 7B/8B candidate |
| reasoning/planning | deeper multi-step answers, slower acceptable latency | Qwen3/DeepSeek reasoning candidates, validation gated |
| voice loop | response speed and interruption tolerance | small/medium model, not maximum quality |
| vision/OCR | image understanding, receipt/screenshot analysis | separate `mlx-vlm` track, not `mlx-lm.server` |

## Estimated Unified Memory Ladder

These are starting estimates, not guarantees. Download size is not runtime
memory. KV cache, context length, concurrent processes, browser tabs, and the
iHN backend all consume unified memory.

| Mac unified memory | Default tier | Candidate upgrade tier | Notes |
|---|---|---|---|
| 8 GB | Qwen2.5 1.5B 4-bit | Llama 3.2 3B 4-bit or Qwen3 4B 4-bit only after measurement | Keep context modest; prefer voice/control and setup tasks. |
| 16 GB | Qwen2.5 1.5B 4-bit | Qwen3 4B 4-bit, Phi-4 mini 4-bit, Qwen2.5 7B 4-bit | `mac-mini` M1 16 GB should validate one upgrade model at a time. |
| 24 GB | Qwen2.5 7B or Qwen3 8B 4-bit | Qwen3 14B 4-bit | Good lane for document/RAG and coding candidates. |
| 32 GB | Qwen3 8B to 14B 4-bit | specialized 14B+ candidates | Validate warm latency and memory after repeated calls. |
| 64 GB+ | 14B+ 4-bit | larger MoE/specialist models | Treat as a separate server-node profile, not the household default. |

## Candidate Model Families

Known validated in iHN:

| Model | Current role |
|---|---|
| `mlx-community/Qwen2.5-1.5B-Instruct-4bit` | installer default and real sidecar smoke baseline |

Useful candidates to validate later:

| Model | Likely need category | Why it is interesting |
|---|---|---|
| `mlx-community/Llama-3.2-3B-Instruct-4bit` | household assistant, voice loop | small, general, likely faster than 7B class |
| `mlx-community/Qwen3-4B-4bit` | household assistant, reasoning-light | newer Qwen family, compact upgrade candidate |
| `mlx-community/Qwen3-4B-Instruct-2507-4bit` | household assistant, instruction following | instruct-tuned compact candidate |
| `mlx-community/Phi-4-mini-instruct-4bit` | technical summaries, compact reasoning | small download, strong small-model candidate |
| `mlx-community/Qwen2.5-7B-Instruct-4bit` | document/RAG, general quality | obvious next step beyond the validated 1.5B default |
| `mlx-community/Qwen2.5-Coder-7B-Instruct-4bit` | coding/technical help | specialist candidate for developer workflows |
| `mlx-community/Qwen3-8B-4bit` | reasoning/planning, general quality | stronger Qwen3 class, likely 16 GB/24 GB boundary |
| `mlx-community/DeepSeek-R1-0528-Qwen3-8B-4bit` | reasoning/planning | reasoning candidate; expected slower and must be gated |
| `mlx-community/Qwen3-14B-4bit` | heavier document/coding/reasoning | likely 24 GB+ lane, not a Mac mini M1 default |
| `mlx-community/Qwen2.5-VL-7B-Instruct-4bit` | vision/OCR | uses `mlx-vlm`, separate from the current chat sidecar |

Known unsafe in the current pinned runtime:

| Model | Status |
|---|---|
| `mlx-community/gemma-4-e2b-it-4bit` | rejected by installer guard; generation crashed under `mlx-lm==0.31.3` during validation |

## Selection Rules

- Default to the smallest validated model that satisfies the need category.
- Do not auto-upgrade by RAM alone. A fast voice loop and a slower document
  drafting task may want different models on the same Mac.
- Keep one loaded chat sidecar model per process for now.
- Treat larger models as explicit profiles, not silent installer choices.
- Measure cold start, warm request latency, response quality, and memory after
  repeated prompts before promoting any candidate.
- Keep vision models out of the `mlx-lm.server` path until an `mlx-vlm` sprint
  exists.

## Sources Checked

- `https://huggingface.co/mlx-community/Qwen2.5-7B-Instruct-4bit`
- `https://huggingface.co/mlx-community/Qwen2.5-Coder-7B-Instruct-4bit`
- `https://huggingface.co/mlx-community/Llama-3.2-3B-Instruct-4bit`
- `https://huggingface.co/mlx-community/Phi-4-mini-instruct-4bit`
- `https://huggingface.co/mlx-community/Qwen3-4B-4bit`
- `https://huggingface.co/mlx-community/Qwen3-4B-Instruct-2507-4bit`
- `https://huggingface.co/mlx-community/Qwen3-8B-4bit`
- `https://huggingface.co/mlx-community/Qwen3-14B-4bit`
- `https://huggingface.co/mlx-community/DeepSeek-R1-0528-Qwen3-8B-4bit`
- `https://huggingface.co/mlx-community/Qwen2.5-VL-7B-Instruct-4bit`
