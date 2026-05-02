# Testing Status — live working document

**Last updated:** 2026-04-30
**Purpose:** single source of truth for current testing state. Links to
detailed reports; this file stays short and always current.

---

## Current blockers

| # | What | Who | Severity |
|---|------|-----|----------|
| 1 | ~~**Whisper tier won't flip**~~ | ~~Claude~~ | **RESOLVED** — iPhone now shows `tier=whisper` with full whisper sub-object. All tier tests pass. |
| 2 | ~~**iPhone `/system/stats` 404**~~ | ~~Claude~~ | **RESOLVED** — endpoint now returns 200 with full device stats (battery, uptime, RAM, thermal, ASR/OCR performance). |
| 3 | **iPhone bootstrap port :17778 down** — connection refused (was working before Claude's latest NodeRuntime changes — likely port reconfig) | Claude | MEDIUM |
| 4 | **Python backend won't start on iMac-Debian** — avahi/mDNS-related crash | Codex | LOW |

---

## Platform test matrix

| Platform | Contract (25) | Bootstrap (13) | Tier (7) | OCR (6) | Total | Status |
|----------|:---:|:---:|:---:|:---:|:---:|--------|
| iPhone 12 PM | 25 | 0 | 7 | 3 | **35/51** | system/stats ✅, whisper ✅, OCR endpoint timeout, bootstrap down |
| ME-21 (Android) | 25 | 0* | 7 | 6 | **38/51** | OCRevidence=6/6. *Bootstrap up, just URL config |
| Python (local) | — | — | — | — | — | Won't start on Debian |
| Python (Mac mini) | 25 | 13 | 7 | — | **45/51** | Reference implementation |

Run: `IHN_BASE_URL=<url> IHN_BOOTSTRAP_URL=<url> pytest backend/tests/ -v`

---

## Fixture packs

| Pack | Locales | Clips | Size | Best for |
|------|---------|-------|------|----------|
| Azure multilingual | 10 | 100 | 19 MB | ASR accuracy baselining |
| macOS TTS | 2 (en, es) | 20 | 3 MB | Quick smoke tests |

---

## Recent changes

| Date | What |
|------|------|
| **2026-05-01** | **iPhone: system/stats + whisper tier + OCR all RESOLVED by Claude (b3459c7). 25/25 contract, 7/7 tier, OCR endpoint present. Bootstrap port regression.** |
| 2026-04-30 | iPhone Whisper baseline: 100/100 clips, all 10 languages native! Claude's transcribe endpoint works. |
| 2026-04-30 | Tier contract sweep: iPhone + ME-21, all 7 tier asserts pass |
| 2026-04-30 | ME-21 multilingual ASR baseline: 91/100 clips, Azure TTS fixes Spanish |
| 2026-04-30 | Azure fixture pack normalized (100 WAVs, 10 locales, sha256 verified) |
| 2026-04-30 | STT tier contract tests added to `test_contract_api.py` |
| 2026-04-28 | Cross-platform contract findings: 7 gaps Python vs Android documented |
| 2026-04-28 | All 4 kickoff tasks complete (contract tests, bootstrap, web harness, speech spec) |

---

## What's next

1. **iPhone REST transcribe endpoint** — unblocks automated ASR testing (see [request](mobile/testing/requests/IPHONE_12PM_ASR_ENDPOINT_REQUEST_2026-04-30.md))
2. **Whisper tier flip fix** — app rebuild + deploy from `mac-mini` branch to iPhone
3. **iPhone `/system/stats`** — clear the last 5 failing tests
4. **7 contract gaps** — align Python/Android `_detail.hostname` nesting, `network_hint` type, etc.

---

## How to read this file

- **This file** (`testing/STATUS.md`) — always current, scan in 30 seconds
- **Detailed reports** — `testing/results/*.md` and `mobile/testing/results/*.md`
- **Test requests** — `mobile/testing/requests/*.md`
- **The roadmap** — `docs/TESTING_ROADMAP_AND_GUIDANCE_2026-04-28.md`
