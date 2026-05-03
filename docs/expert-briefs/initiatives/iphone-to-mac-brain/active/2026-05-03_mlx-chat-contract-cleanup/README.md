# MLX Chat Contract Cleanup

This is the first OpenCode-ready product sprint under the iPhone-to-Mac Brain
initiative.

The backend MLX provider seam works, but validation found two contract gaps:

- Python `/v1/chat` and iOS `/v1/chat` accept and return different shapes.
- When `IHN_LLM_PROVIDER=mlx` is configured but the MLX sidecar is unavailable,
  Python chat can raise an unhandled 500 instead of returning a clean JSON
  gateway error.

Use `01-brief.md` as the implementation fence. The matching validator request
lives at:

```text
testing/initiatives/iphone-to-mac-brain/2026-05-03_mlx-chat-contract-cleanup/request.md
```

