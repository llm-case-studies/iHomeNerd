# Apple Silicon MLX Pivot & Hardware Architecture

**Date:** 2026-05-01
**Status:** Active Pivot
**Authors:** Alex, Gemini 3.1 Pro

---

## 1. The MediaPipe to LiteRT/MLX Pivot

On the Android side, the deprecated `MediaPipe LLM Inference API` natively crashed the Motorola Edge 2021. The fix was migrating the Android node to **LiteRT-LM**.

For iOS, we initially planned to use the same MediaPipe framework. However, Google does not provide an official, native Swift SDK for LiteRT-LM. Rather than wrestling with community C-API wrappers to force LiteRT-LM onto iOS, we are pivoting the entire Apple Silicon stack to **Apple's MLX Framework (`apple/mlx-swift`)**.

### Why MLX?
1. **Native Metal Integration:** MLX is custom-built for Apple's Unified Memory Architecture (UMA), extracting maximum performance from A-series (iPhone) and M-series (Mac) chips.
2. **Write Once, Run on All Apple Silicon:** A single Swift/MLX pipeline can power the iPhone 12 Pro Max, iPhone 15 Pro Max, and the M1 Mac mini. 
3. **Stability:** It avoids the C++ JNI bridging issues that plagued MediaPipe on Android.

---

## 2. iOS Hardware Tiers (RAM is the limit)

Because iOS strictly limits app memory via Jetsam, **Unified Memory** dictates which Apple devices can host local LLMs (even with the `increased-memory-limit` entitlement).

| Device | RAM | MLX Role | Model Capacity |
|---|---|---|---|
| **Mac mini (M1)** | 8GB - 16GB+ | Massive Node Host | Gemma 4B or larger |
| **iPhone 15 Pro Max** | 8GB | Strong Native Node | Gemma 4B (4-bit) / Gemma 2B |
| **iPhone 12 Pro Max** | 6GB | Native Node Floor | Gemma 2B (4-bit) only |
| **iPhone 11 Pro Max** | 4GB | Controller Only | No LLM. Local Voice/Vision only |
| **iPhone 7/8/X** | < 3GB | Web Only | Browser client via `:17777` |

---

## 3. The Heterogeneous iHomeNerd Ecosystem

By pivoting to MLX for Apple, we solidify a "best tool for the hardware" strategy across the network. We do not use a single "one-size-fits-all" framework. We match the runtime to the silicon:

*   **Android (Snapdragon / Tensor):** `LiteRT-LM` (Optimized for Android CPU/GPU/NPU).
*   **Apple (A-series / M-series):** `MLX` (Optimized for Apple Silicon / Metal).
*   **Desktop/Server (RTX / CUDA):** Standard PyTorch/Transformers or vLLM server.
*   **Single Board Computers (Raspberry Pi / Orange Pi):** *TBD (Targeting `llama.cpp` for ARM NEON).*

All nodes share the same exact `POST /v1/chat` and `/capabilities` HTTP contract, so the web clients and controllers don't care which hardware or framework is answering the request.
