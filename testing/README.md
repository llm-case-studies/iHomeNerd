# iHomeNerd Testing

Top-level testing harnesses and reusable fixtures.

## Finding your way

| File | Purpose |
|------|---------|
| **[STATUS.md](STATUS.md)** | **Live status — current blockers, platform matrix, recent changes. Start here.** |
| `results/*.md` | Detailed per-task findings and reports |
| `web/` | Playwright browser harness |
| `cases/` | Playwright test specs |
| `fixtures/` | Audio/image fixtures (120 WAV clips across 12 locales) |

## Structure

```text
testing/
  README.md              — this file
  STATUS.md              — live status (always current, scan first)
  web/                   — browser harness (isolated package.json, Playwright)
  cases/                 — declarative test specs (smoke, E2E)
  fixtures/              — reusable test artifacts
    audio/               — macOS TTS pack (en/es, 20 clips)
    audio/multilingual/  — Azure TTS pack (10 locales, 100 clips, 19 MB)
  results/               — detailed reports and per-task findings
```

## Quick start — backend contract tests (highest value)

```bash
cd backend
source .venv/bin/activate

# Against any running node:
IHN_BASE_URL=https://<ip>:17777 \
  IHN_BOOTSTRAP_URL=http://<ip>:17778 \
  pytest backend/tests/ -v

# Examples:
IHN_BASE_URL=https://192.168.0.246:17777 pytest backend/tests/ -v     # ME-21
IHN_BASE_URL=https://192.168.0.220:17777 pytest backend/tests/ -v     # iPhone
IHN_BASE_URL=https://localhost:17777 pytest backend/tests/ -v          # local
```

## Quick start — web harness

```bash
cd testing/web && npm install
npx playwright install chromium

IHN_WEB_URL=https://<ip>:17777 npx playwright test
```

## Separation of concerns

| Area | Purpose |
|---|---|
| `backend/tests/` | pytest contract tests against live endpoints |
| `mobile/testing/` | cross-testing protocol, requests, results, fixture specs |
| `testing/` (here) | shared browser/E2E harnesses, live status, fixture packs |

## See also

- **[STATUS.md](STATUS.md)** — current state, blockers, platform matrix
- `docs/TESTING_ROADMAP_AND_GUIDANCE_2026-04-28.md` — full phased plan
- `mobile/testing/requests/` — test requests from Claude/Codex
