# Result — iOS Uniform Web Serving

## Summary

- branch: `feature/ios-uniform-web-serving`
- commit(s):
- host: `<implementation-host>` (coding), `mac-mini` (build/deploy/smoke)
- scope implemented:

## What changed

- ...

## Files touched

- `mobile/ios/ihn-home/IhnHome/Runtime/NodeRuntime.swift`
- ...

## What was intentionally not done

- ...

## Build and smoke notes

- build status:
- smoke-tested target: simulator / iPhone 12 PM
- build/deploy host:
- testing host:
- App launched: ...
- Runtime started on :17777 / :17778: ...

### Smoke probe results

| Endpoint | Status | Notes |
|---|---|---|
| `GET /` | | |
| `GET /index.html` | | |
| `GET /assets/<sample>` | | |
| `GET /v1/chat` | | |
| `GET /v1/models` | | |
| `GET /capabilities` | | |
| `GET /setup/trust-status` (:17778) | | |

## Testing request prepared

Updated: `mobile/testing/requests/IOS_UNIFORM_WEB_SERVING_TEST_REQUEST_2026-05-03.md`

## Risks / open questions

- ...
