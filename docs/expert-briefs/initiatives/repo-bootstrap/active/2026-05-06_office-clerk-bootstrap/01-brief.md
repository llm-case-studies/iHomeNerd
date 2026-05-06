# Expert Brief — Office Clerk Bootstrap

**Date:** 2026-05-06  
**Audience:** OpenCode coding agent on `Acer-HL`  
**Status:** active

## Why this sprint exists

A cross-project coordination service is needed so that agents working across
multiple repos and hosts can log structured updates, query actor state, and
get compact narrative summaries. This is sprint 1: the smallest credible
bootstrap.

## Execution Fence

- Repo: `office-clerk` (within `iHomeNerd` repo)
- Implementation host: `Acer-HL`
- Base branch: `origin/main`
- Working branch: `feature/repo-bootstrap/office-clerk-bootstrap`
- Merge target: `main`
- Build/deploy host: `Acer-HL` (Node.js, no platform build)
- Validation host: `iMac-Debian`

## Feature goal

Ship the smallest credible office-clerk bootstrap:

- `POST /v1/log` appends structured JSON updates
- `GET /v1/state` returns current actor state
- `GET /v1/summary` returns a compact narrative summary
- `POST /v1/chat/completions` returns a narrow compatibility response backed by the current summary text

## Acceptable implementation scope

- In-memory store only (no database)
- Built-in Node.js `http` module (no Express, no dependencies)
- Two entry types: `actor_state_update` and `system_event`
- Chat completions return a static compatibility shape with summary text

Do **not** add:

- databases
- auth or multi-user identity
- browser automation
- UI dashboards
- session hijacking or live OpenCode control
- package dependencies that are not clearly needed for sprint 1

## References

Read these first:

- `README.md`
- `docs/expert-briefs/README.md`
- `docs/architecture/DEFERRED.md`

## Implementation fence

Files to touch:

- `service/store.js`
- `service/server.js`
- `tests/store.test.js`
- `tests/http.test.js`
- `testing/initiatives/repo-bootstrap/2026-05-06_office-clerk-bootstrap/request.md`
- `README.md`

## Deliverables

1. code on `feature/repo-bootstrap/office-clerk-bootstrap`
2. `node --test` passing
3. local HTTP smoke
4. concise result note using `02-result-template.md`
5. concrete testing request at the testing path

## Done means

- tests pass
- local smoke confirms all four endpoints respond correctly
- result note and testing request exist on the branch
- branch is pushed
