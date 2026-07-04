# OpenCode Session Portability Findings

**Date:** 2026-04-29  
**Audience:** Alex, Codex, Claude, DeepSeek, future BugWitness work  
**Primary systems:**
- Mac mini OpenCode desktop app + embedded local backend
- Debian iMac OpenCode Web host (`iMac-Debian`, `192.168.0.180`)
- Project under test: `iHomeNerd`

## 1. Goal

Validate whether OpenCode sessions can be:

- listed reliably
- resumed across hosts
- exported and imported between services
- recovered after moving from one machine-hosted backend to another

## 2. Summary verdict

**Result:** partial success.

What works:

- one OpenCode backend can host many sessions
- direct session URLs work once the project path and session ID are known
- full-state migration from one host to another works
- CLI session listing is more reliable than the current web UI

What does not work reliably:

- per-session `opencode export` / `opencode import` for larger sessions
- browser-side session listing after host migration without metadata repair

## 3. Important concrete findings

### 3.1 Mac mini desktop app is a real local backend

The Mac mini OpenCode desktop app was backed by an embedded localhost server,
not just a standalone UI.

Observed process shape:

- `OpenCode.app`
- `opencode-cli ... serve --hostname 127.0.0.1 --port 55328`

Implication:

- local OpenCode history belongs to the machine-local backend/storage
- attached clients do not own the durable history

### 3.2 Durable OpenCode state lives outside the UI

Durable session state on the Mac mini was stored under:

- `~/.local/share/opencode/opencode.db`
- `~/.local/share/opencode/storage/`
- `~/.local/share/opencode/snapshot/`
- `~/.local/share/opencode/tool-output/`

Implication:

- full-state migration is possible without relying on UI export

### 3.3 `opencode export` is unreliable for larger sessions on `1.14.29`

Observed behavior while exporting Mac mini sessions:

- small session export succeeded
- larger session exports repeatedly stopped at exactly `65536` bytes

Examples:

- `ses_22581048cffeYnteHivqx5fxAm` exported to `124808` bytes
- several other sessions exported to exactly `65536` bytes

Implication:

- `opencode export/import` is not currently safe as the primary migration path
- this is a concrete product bug worth reporting or working around

### 3.4 Full-state migration worked

Reliable migration path:

1. stop relying on per-session export
2. make a SQLite backup of `opencode.db`
3. copy:
   - `opencode.db`
   - `storage/`
   - `snapshot/`
   - `tool-output/`
4. restart the target OpenCode service

After this migration, the Debian host had the full Mac mini session set again.

Observed count after migration:

- `14` sessions present on Debian host

### 3.5 Migrated sessions initially stayed hidden in the web UI

After full-state migration, backend APIs and CLI saw the sessions, but the web
UI initially showed only one recovered session.

Root cause:

- migrated session rows still had the old Mac mini path in `session.directory`
- old path:
  - `/Users/alex/Projects/iHomeNerd`
- new host path:
  - `/home/alex/Projects/iHomeNerd-testing`

Repair:

- update `session.directory` values in `opencode.db`
- restart `opencode-web.service`

After path repair:

- backend project metadata and session metadata aligned
- direct session URLs became usable for migrated sessions

### 3.6 Direct session URLs work

Observed URL shape:

```text
http://opencode-imac.local:4096/<base64url(project-path)>/session/<session-id>
```

Example project path segment:

- `L2hvbWUvYWxleC9Qcm9qZWN0cy9pSG9tZU5lcmQtdGVzdGluZw`

Decoded value:

- `/home/alex/Projects/iHomeNerd-testing`

Implication:

- even if the session list UI is incomplete, known sessions can still be opened
  directly if the project path segment and session ID are known

## 4. Sessions confirmed on the Debian host after migration

Examples:

- `ses_22581048cffeYnteHivqx5fxAm`
  - `Testing work review and next steps in mobile/testing`
  - provider/model seen in message data:
    - `providerID=opencode`
    - `modelID=nemotron-3-super-free`
- `ses_2270491f1ffeLEwXaSkqYTzKI7`
  - `Continuing iPhone 12PM Node Contract testing`
  - provider/model:
    - `providerID=deepseek`
    - `modelID=deepseek-v4-pro`
- `ses_22a2c22e5ffeW2dTbrzLOO9NmN`
  - `Testing roadmap and four kickoff tasks`
  - provider/model:
    - `providerID=deepseek`
    - `modelID=deepseek-v4-pro`

## 5. Operational recommendation

For current real work:

- use CLI and backend data as the source of truth
- treat browser session listing as helpful, but not authoritative
- prefer full-state backup/migration over per-session export for anything
  important

## 6. Product implication

This is a good BugWitness product seed.

The missing capability is not abstract "AI agent management." It is a specific,
testable, high-friction workflow:

- list sessions reliably
- analyze them by project/model/provider/time
- export them safely
- migrate them across hosts
- rewrite path metadata when projects move
- reopen them through stable direct URLs or an explicit session registry

That work should live in BugWitness, not in the iHomeNerd core.
