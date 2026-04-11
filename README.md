# iHomeNerd

**Your local AI brain for documents, translation, cameras, and connected apps.**

Runs on your hardware. Localhost by default. Open core.

## Quick start

```bash
# 1. Have Ollama running with at least one model
ollama pull gemma3:4b

# 2. Install and run
cd backend
pip install -e .
ihomenerd serve
```

Dashboard at http://127.0.0.1:17777 | API at http://127.0.0.1:17777/docs

## With Docker

```bash
docker compose up
```

This starts Ollama + iHomeNerd together. Pull models into the Ollama container:

```bash
docker compose exec ollama ollama pull gemma3:4b
```

## CLI

```bash
ihomenerd status
ihomenerd translate "Hello" --to ko
ihomenerd chat "Explain this error..."
```

## API

```
GET  /health          — is the Nerd running?
GET  /capabilities    — what can it do?
POST /v1/translate    — translate text
POST /v1/chat         — general-purpose chat
POST /v1/summarize    — summarize text
```

## App integration

Apps like [PronunCo](https://github.com/llm-case-studies/pronunco) and TelPro-Bro can discover and connect to iHomeNerd for local AI capabilities. See `docs/PRODUCT_SPEC.md` for the full integration protocol.

## Related projects

- [RoadNerd](https://github.com/llm-case-studies/RoadNerd) — portable offline IT diagnostics (separate project, different deployment model)

## Docs

- `docs/PRODUCT_SPEC.md` — full product spec
- `docs/WEB_PRICING_AND_LAUNCH_PLAN.md` — web and pricing strategy
