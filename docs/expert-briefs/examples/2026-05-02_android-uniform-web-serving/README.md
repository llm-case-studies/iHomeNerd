# Example Sprint Pack: Android Uniform Web Serving

This is the third reference sprint pack for expert-agent work.

It keeps the same pattern as the first two sprints:

1. create a real feature branch off `origin/main`
2. write a brief that names host, branch, and merge target
3. point the implementer to existing platform docs
4. require the implementer to leave a testing request behind
5. require build/deploy smoke before testing handoff
6. merge only after validation

## Sprint topic

`feature/android-uniform-web-serving`

Goal:

- make Android Command Center serving more honest and uniform
- keep the real bundled SPA path as the primary runtime surface
- remove or reduce synthetic fallback behavior that pretends to be the real app
- leave testers a clear contract for what `/`, `/app`, SPA routes, and missing
  assets should do

## Files in this pack

- `01-brief.md` — what the coding agent should do
- `02-result-template.md` — how the coding agent reports back
- `03-merge-note-template.md` — how the owner records promotion/hold

The validator request for this sprint lives in:

- `mobile/testing/requests/ANDROID_UNIFORM_WEB_SERVING_TEST_REQUEST_2026-05-02.md`
