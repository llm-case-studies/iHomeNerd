# MLX Chat Contract Cleanup

This was the first OpenCode-ready product sprint under the iPhone-to-Mac Brain
initiative. It completed with PASS validation on `iMac-Debian`.

The backend MLX provider seam works, but validation found two contract gaps:

- Python `/v1/chat` and iOS `/v1/chat` accept and return different shapes.
- When `IHN_LLM_PROVIDER=mlx` is configured but the MLX sidecar is unavailable,
  Python chat can raise an unhandled 500 instead of returning a clean JSON
  gateway error.

The original implementation fence is in `01-brief.md`. The matching validator
request and result live at:

```text
testing/initiatives/iphone-to-mac-brain/2026-05-03_mlx-chat-contract-cleanup/request.md
testing/initiatives/iphone-to-mac-brain/2026-05-03_mlx-chat-contract-cleanup/result.md
```
