# Motorola Edge 2021 Cross-Test Request

**Date:** 2026-04-28  
**Requester:** Codex  
**Target device:** Motorola Edge 2021 (`M-E-21`, serial `ZY22GQPKG6`)  
**Target role:** Android node-class host  
**Expected branch context:** current `main` worktree on `iHomeNerd`

---

## 1. Goal

Validate the newly exposed Android `Talk` ASR routing controls on the real
Motorola node after the latest frontend + APK deploy.

Specifically, verify that the browser UI now sends explicit ASR backend choices
through the real `/v1/transcribe-audio` contract rather than only changing UI
labels.

---

## 2. Why this test matters

The Android node now exposes:

- `Recognition Language`
- `ASR Backend`
- `ASR Mode`

The current installed ASR backends are expected to be:

- `Auto`
- `Moonshine English`
- `Moonshine Spanish`

This test is the bridge between:

- current EN/ES Moonshine reality
- future multi-ASR routing
- later Whisper or other backend slots

---

## 3. Preconditions

- `M-E-21` is powered on
- iHN Android app installed from the latest local debug build
- local runtime launched
- Motorola reachable at:
  - `https://192.168.0.246:17777`
  - or current active LAN IP if DHCP changed
- use a hard refresh in the browser before testing

---

## 4. Exact test steps

### Test A — English forced path

1. Open `Talk`
2. Set:
   - `Recognition Language` = `English (US)`
   - `ASR Backend` = `Moonshine English`
3. Speak one short clear English sentence
4. Speak one longer English sentence
5. Record:
   - transcript quality
   - whether failure occurs
   - visible backend label in UI

### Test B — Spanish forced path

1. Set:
   - `Recognition Language` = `Español (ES)`
   - `ASR Backend` = `Moonshine Spanish`
2. Speak one short clear Spanish sentence
3. Speak one longer Spanish sentence
4. Record:
   - transcript quality
   - whether failure occurs
   - visible backend label in UI

### Test C — Auto routing

1. Set:
   - `ASR Backend` = `Auto`
2. Run:
   - short English
   - short Spanish
3. Confirm whether `Auto` appears to route to the expected local model path

### Test D — Mismatch behavior

1. Set:
   - `Recognition Language` = `Español (ES)`
   - `ASR Backend` = `Moonshine English`
2. Speak Spanish
3. Then set:
   - `Recognition Language` = `English (US)`
   - `ASR Backend` = `Moonshine Spanish`
4. Speak English
5. Record whether forced-backend mismatch behaves predictably

---

## 5. Expected results

### Minimum expected success

- backend selector is visible
- changing backend changes the actual runtime request path, not just the label
- forced English works on English
- forced Spanish works on Spanish better than the old accidental EN fallback

### Acceptable current limitation

- longer Spanish still may be rough
- unsupported languages should still fail honestly
- forced mismatch may produce bad transcripts; that is acceptable if it is
  deterministic and understandable

---

## 6. Capture back

Please return:

- 1 screenshot of `Talk` showing the new selectors
- 1 success example
- 1 failure example
- the exact transcript text in each
- browser console errors, if any
- if possible:
  - `GET /system/stats` after the run
  - especially `performance.asr.last_backend`, `last_language_tag`,
    `last_duration_ms`

---

## 7. Pass / fail rule

### Pass

- explicit ASR backend selection is visible in UI
- explicit backend selection changes real behavior in a way consistent with the
  chosen backend/language
- `Auto` behaves sensibly for English vs Spanish

### Fail

- selector is missing after hard refresh
- backend choice has no observable effect
- UI says one backend while stats/errors imply another
- browser path breaks entirely after the change

---

## 8. Suggested follow-up if pass

If this passes, next Android/mobile step should move to:

- OCR
- docs-domain completion
- broader multi-ASR planning with Whisper as the multilingual baseline slot

---

## 9. Notes for another agent

This request is intentionally about **validation**, not redesign.

Do not rewrite the speech stack first. Confirm the new contract behaves
honestly on the live device, then report:

- what worked
- what failed
- what should change next
