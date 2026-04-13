# Gemma 4 Benchmark: RTX 4070 8GB

**Date:** 2026-04-12
**Hardware:** MSI Raider, RTX 4070 8GB VRAM, Ollama 0.20.5
**Models tested:** gemma4:e2b (~7.2GB), gemma4:e4b (~9.6GB)

## Results

### Lesson extraction (6 Mandarin phrases)

| Model | Wall time | Tokens | tok/s | Quality |
|---|---|---|---|---|
| gemma4:e2b | 5.0s | 541 | **109.1** | Correct JSON, all 6 items |
| gemma4:e4b | 41.0s | 690 | **16.8** | Correct JSON, all 6 items, slightly more verbose |

### Dialogue turn (hotel check-in scenario)

| Model | Wall time | Tokens | tok/s | Quality |
|---|---|---|---|---|
| gemma4:e2b | 9.9s | 706 | **71.7** | Good structured JSON, natural response |
| gemma4:e4b | 29.9s | 891 | **29.8** | Richer dialogue (passport, voucher), more natural |

## Analysis

- **E2B is 4-7x faster** on 8GB VRAM because it fits entirely in GPU memory
- **E4B spills to system RAM** at ~9.6GB, causing major slowdown
- Both produce correct structured JSON reliably
- E4B gives marginally richer output (more natural phrasing, more detail) but the quality gap is small
- For interactive use (dialogue turns), E2B's sub-10s latency is acceptable; E4B's 30-40s is not

## Recommendation

- **RTX 4070 8GB: use gemma4:e2b** as the default for all tiers
- **12GB+ VRAM (RTX 4070 Ti, 3090, A6000): test gemma4:e4b** as medium tier
- **24GB+ VRAM: gemma4:e4b for medium, larger models for heavy**
- E4B remains worth testing on Apple Silicon with 32GB+ unified memory

## VRAM behavior

E2B loads cleanly into 8GB. E4B loads but Ollama offloads layers to CPU, visible as ~6x throughput drop. No OOM errors — Ollama handles the spill gracefully.
