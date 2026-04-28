# iHomeNerd Testing

Top-level testing harnesses and reusable fixtures should live here.

This area is for:

- browser/E2E harness code
- declarative test cases
- reusable audio/image fixtures
- generated result artifacts when those are meant to be repo-visible

Recommended structure:

```text
testing/
  README.md
  web/
  cases/
  fixtures/
  results/
```

Current rule:

- backend contract tests stay under `backend/tests/`
- mobile cross-testing protocol and real-device notes stay under
  `mobile/testing/`
- this top-level tree is for shared, non-mobile-specific harnesses

See:

- `docs/TESTING_ROADMAP_AND_GUIDANCE_2026-04-28.md`
