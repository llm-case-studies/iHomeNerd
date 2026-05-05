# Test Request - Speech Extraction + Plugin Namespace

**Date issued:** 2026-05-04
**Initiative:** `uniform-web-ui`
**Sprint:** `2026-05-04_speech-extraction-plugin-namespace`
**Target branch:** `feature/uniform-web-ui/speech-extraction-plugin-namespace`
**Validator host:** `iMac-Debian` / `wip/testing`
**Runtime host:** backend Python environment on a machine that can run current `main`-style backend smoke

## What You Are Validating

That the first client-surface cleanup landed correctly:

1. generic speech routes are core, not hidden in `plugins/pronunco.py`
2. PronunCo routes moved under `/v1/plugins/pronunco/...`
3. `/capabilities` distinguishes `core` from `plugins`
4. the flat `/v1/image-extract` stub no longer survives as misleading surface

## Probe Sequence

Use the target branch running locally, or on a smoke host chosen by the
implementer. Record exact URLs and commands in evidence.

Minimum probe set:

```bash
# health baseline
curl -s http://127.0.0.1:17779/health | python3 -m json.tool

# capabilities shape
curl -s http://127.0.0.1:17779/capabilities | python3 -m json.tool

# core speech routes
curl -s -X POST http://127.0.0.1:17779/v1/transcribe-audio -F file=@/tmp/sample.wav
curl -s -X POST http://127.0.0.1:17779/v1/synthesize-speech \
  -H 'Content-Type: application/json' \
  -d '{"text":"hello","voice":"af_bella"}' -o /tmp/tts.wav
curl -s http://127.0.0.1:17779/v1/voices | python3 -m json.tool

# plugin routes
curl -s -X POST http://127.0.0.1:17779/v1/plugins/pronunco/lesson-extract \
  -H 'Content-Type: application/json' \
  -d '{"reducedText":"hello world","sourceName":"probe"}'

# flat route should no longer be the public path
curl -s -o /tmp/legacy_lesson.txt -w '%{http_code}\n' \
  -X POST http://127.0.0.1:17779/v1/lesson-extract \
  -H 'Content-Type: application/json' \
  -d '{"reducedText":"hello world","sourceName":"probe"}'

# redundant image stub should be gone
curl -s -o /tmp/image_extract.txt -w '%{http_code}\n' \
  -X POST http://127.0.0.1:17779/v1/image-extract \
  -H 'Content-Type: application/json' \
  -d '{}'
```

If the speech routes need a known sample file, the implementer should note that
in the result. If no local sample exists, validate registration and error
classes honestly instead of inventing coverage.

## Pass Criteria

- `/capabilities` contains a clear split between `core` and `plugins`
- core speech routes are reachable at their core paths
- PronunCo lesson extraction is reachable under `/v1/plugins/pronunco/...`
- legacy flat `POST /v1/lesson-extract` is either gone or clearly redirected in
  a documented intentional way
- flat `/v1/image-extract` is gone
- no obvious regression on `/health`, `/discover`, or existing core language
  routes

## What To Record In `result.md`

- final branch tip SHA
- exact response shape for `/capabilities`
- status/result for the three speech routes
- status/result for plugin lesson-extract route
- status/result for the old flat lesson route
- status/result for flat `/v1/image-extract`
- one-line verdict: PASS / FAIL / PARTIAL

