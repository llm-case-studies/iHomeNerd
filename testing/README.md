# iHomeNerd Testing

Top-level testing harnesses and reusable fixtures.

## Structure

```text
testing/
  README.md              — this file
  web/                   — browser harness (isolated package.json, Playwright)
  cases/                 — declarative test specs (smoke, E2E)
  fixtures/              — reusable test artifacts (audio, images, HTML captures)
  results/               — generated reports (gitignored by default)
```

## Quick start — web harness

```bash
cd testing/web && npm install
npx playwright install chromium

# Start the frontend separately (in another terminal):
cd frontend && npm run dev

# Run the smoke test:
IHN_WEB_URL=http://localhost:3000 npx playwright test
```

## Separation of concerns

| Area | Purpose |
|---|---|
| `backend/tests/` | pytest contract tests against live endpoints |
| `mobile/testing/` | cross-testing protocol, requests, results, fixture specs |
| `testing/` (here) | shared browser/E2E harnesses, non-mobile-specific |

## See also

- `docs/TESTING_ROADMAP_AND_GUIDANCE_2026-04-28.md` — full phased plan
- `docs/DEEPSEEK_TESTING_KICKOFF_2026-04-28.md` — safe-start tasks
