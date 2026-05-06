# Test Request — Office Clerk Bootstrap

**Date issued:** 2026-05-06
**Initiative:** `repo-bootstrap`
**Sprint:** `2026-05-06_office-clerk-bootstrap`
**Product branch:** `feature/repo-bootstrap/office-clerk-bootstrap`
**Validation host:** `iMac-Debian`
**Implementation host:** `Acer-HL`

## What You Are Validating

Validate that office-clerk serves a minimal, honest coordination surface:

- `POST /v1/log` appends structured JSON updates
- `GET /v1/state` returns current actor state
- `GET /v1/summary` returns a compact narrative summary
- `POST /v1/chat/completions` returns a narrow compatibility response
- Invalid requests return appropriate error responses

## Product Commit Under Test

Record:

```bash
git rev-parse HEAD
```

from the product branch.

## Startup

```bash
node service/server.js
```

Expected: `office-clerk listening on http://127.0.0.1:17790`

## Run Tests

```bash
node --test
```

All tests must pass.

## HTTP Probes — Success Path

### 1. Health

```bash
curl -sS http://127.0.0.1:17790/health
```

Expect: `{"status":"ok"}`

### 2. Log an actor_state_update

```bash
curl -sS -X POST http://127.0.0.1:17790/v1/log \
  -H "Content-Type: application/json" \
  -d '{"type":"actor_state_update","actor":"alex","data":{"state":"working","task":"office-clerk bootstrap"}}'
```

Expect: 201 with `id`, `timestamp`, `type`, `actor`, `data` fields.

### 3. Log a system_event

```bash
curl -sS -X POST http://127.0.0.1:17790/v1/log \
  -H "Content-Type: application/json" \
  -d '{"type":"system_event","data":{"message":"server started"}}'
```

Expect: 201 with `type: "system_event"`, `actor: null`.

### 4. Log a second actor

```bash
curl -sS -X POST http://127.0.0.1:17790/v1/log \
  -H "Content-Type: application/json" \
  -d '{"type":"actor_state_update","actor":"sam","data":{"state":"reviewing","task":"PR validation"}}'
```

### 5. Get state

```bash
curl -sS http://127.0.0.1:17790/v1/state
```

Expect: `{"actors":{"alex":{...},"sam":{...}}}` with both actors and their
latest `data` plus `updated_at`.

### 6. Get summary

```bash
curl -sS http://127.0.0.1:17790/v1/summary
```

Expect: `{"summary":"...","entry_count":3,"last_updated":"..."}` where
`summary` contains both actors' narrative text.

### 7. Chat completions

```bash
curl -sS -X POST http://127.0.0.1:17790/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"clerk-v1","messages":[{"role":"user","content":"What is happening?"}]}'
```

Expect: 200 with `object: "chat.completion"`, `model: "clerk-v1"`,
`choices[0].message.role: "assistant"`, `choices[0].message.content` matching
the summary text, `finish_reason: "stop"`.

## HTTP Probes — Error Paths

### 8. Missing entry type

```bash
curl -sS -X POST http://127.0.0.1:17790/v1/log \
  -H "Content-Type: application/json" \
  -d '{"data":{"state":"working"}}'
```

Expect: 400 with error about missing type.

### 9. Invalid entry type

```bash
curl -sS -X POST http://127.0.0.1:17790/v1/log \
  -H "Content-Type: application/json" \
  -d '{"type":"bogus"}'
```

Expect: 400 with error listing valid types.

### 10. actor_state_update without actor

```bash
curl -sS -X POST http://127.0.0.1:17790/v1/log \
  -H "Content-Type: application/json" \
  -d '{"type":"actor_state_update"}'
```

Expect: 400 with error about missing actor.

### 11. Non-JSON body

```bash
curl -sS -X POST http://127.0.0.1:17790/v1/log \
  -H "Content-Type: application/json" \
  -d 'not json'
```

Expect: 400 with error about invalid JSON.

### 12. Empty body

```bash
curl -sS -X POST http://127.0.0.1:17790/v1/log
```

Expect: 400 with "request body is required".

### 13. Unknown route

```bash
curl -sS http://127.0.0.1:17790/v1/nope
```

Expect: 404 with error.

## Edge Cases Exposed by Implementation

The following behaviors emerged during implementation and are part of the
validation surface:

### 14. Actor state overwrite (latest wins)

Subsequent `actor_state_update` entries for the same actor overwrite the
previous state — only the latest entry matters for `/v1/state` and
`/v1/summary`.

```bash
curl -sS -X POST http://127.0.0.1:17790/v1/log \
  -H "Content-Type: application/json" \
  -d '{"type":"actor_state_update","actor":"alex","data":{"state":"idle"}}'
curl -sS http://127.0.0.1:17790/v1/state
```

Expect: `alex.state` is `"idle"`, not `"working"`.

### 15. system_event does not produce actor state

system_event entries are stored in the log but do not appear in `/v1/state`
actors map. They do increment `entry_count` in `/v1/summary`.

### 16. Empty store responses

With no entries:
- `GET /v1/state` → `{"actors":{}}`
- `GET /v1/summary` → `{"summary":"","entry_count":0,"last_updated":null}`
- `POST /v1/chat/completions` → `choices[0].message.content` is `"No activity recorded yet."`

### 17. Actor with no task in data

```bash
curl -sS -X POST http://127.0.0.1:17790/v1/log \
  -H "Content-Type: application/json" \
  -d '{"type":"actor_state_update","actor":"alex","data":{"state":"idle"}}'
curl -sS http://127.0.0.1:17790/v1/summary
```

Expect: summary reads `"alex is idle."` (no "on ..." suffix).

### 18. Actor with no state in data

```bash
curl -sS -X POST http://127.0.0.1:17790/v1/log \
  -H "Content-Type: application/json" \
  -d '{"type":"actor_state_update","actor":"alex","data":{"task":"bootstrap"}}'
curl -sS http://127.0.0.1:17790/v1/summary
```

Expect: summary reads `"alex is unknown on bootstrap."`.

## Save Evidence

Save the output of all probes to:

```text
testing/initiatives/repo-bootstrap/2026-05-06_office-clerk-bootstrap/evidence/
```

## Result

Write findings to:

```text
testing/initiatives/repo-bootstrap/2026-05-06_office-clerk-bootstrap/result.md
```

Include:

- pass/fail verdict
- commit tested
- whether all success-path probes returned correct responses
- whether all error-path probes returned correct errors
- whether edge cases behaved as documented
- any remaining ambiguity
