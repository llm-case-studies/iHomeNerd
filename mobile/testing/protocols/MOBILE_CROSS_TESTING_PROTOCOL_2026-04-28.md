# Mobile Cross-Testing Protocol

**Status:** working protocol  
**Date:** 2026-04-28  
**Owner:** Alex  
**Audience:** Codex, Claude, DeepSeek, OpenCode sessions working from different machines

---

## 1. Why this exists

Mobile work is now split across:

- Android node-class runtime work
- iOS catch-up work
- different build hosts and agent sessions

That makes it easy to lose time on:

- duplicated probing
- vague "it seems broken" reports
- platform drift in trust/runtime expectations

This protocol makes cross-testing explicit and repo-native.

---

## 2. Working rule

Every cross-test handoff should include:

1. **device under test**
2. **repo revision / branch context**
3. **network identity**
4. **expected role**
5. **exact test steps**
6. **expected results**
7. **actual results**
8. **artifacts**
9. **verdict**
10. **next action**

Do not hand off "please test the phone" without those.

---

## 3. Role model

Role is determined by **hardware + runtime capability**, not by OS class.

That means:

- Android can be a real node-class host now
- iOS is controller-first today, but may host more later
- any device that advertises `_ihomenerd._tcp` is not automatically a healthy node
- serving role still depends on trust/runtime readiness

See:

- `docs/TRUST_AND_TLS_POLICY_2026-04-28.md`

---

## 4. Required trust framing

Any tester should assume:

- bootstrap/trust install belongs on `http://:17778`
- real runtime belongs on `https://:17777`
- one Home CA per trust domain
- node runtime certs should chain to that Home CA

If a device advertises on Bonjour but:

- drops TLS
- accepts TCP then gives empty replies
- depends on a dev-only trust bypass

then report it as:

- `advertising-only`
- `bootstrap/scaffold`
- or `runtime not ready`

not as a healthy serving node.

---

## 5. Minimal handoff template

Copy this into a new dated doc for each cross-test request:

```md
# <Device> Cross-Test Request

**Date:** YYYY-MM-DD
**Requester:** Codex / Claude / DeepSeek / Alex
**Target device:** ...
**Target role:** ...
**Expected build context:** ...

## Goal

...

## Preconditions

- ...

## Exact steps

1. ...
2. ...
3. ...

## Expected results

- ...

## Capture back

- screenshots
- console errors
- `/health`
- `/capabilities`
- `/system/stats`
- notable latency numbers

## Pass / fail rule

- pass if ...
- fail if ...

## Notes

...
```

---

## 6. Current split of responsibilities

### Android / `M-E-21`

Best for:

- local runtime truth
- real LAN serving
- TTS
- current local ASR
- local Gemma experiments

### iPhone 12 Pro Max

Best for today:

- iOS client/controller verification
- trust UI / discovery behavior
- session-hosted capability exploration

Not yet trustworthy as:

- a compliant serving iHN node

until runtime and Home-CA-backed trust behavior are real.

---

## 7. Current active companion docs

- `mobile/testing/results/IPHONE_12PM_FIRST_LAN_SERVING_PROBE_2026-04-28.md`
- `mobile/testing/requests/ME21_CROSS_TEST_REQUEST_2026-04-28.md`
- `docs/TRUST_AND_TLS_POLICY_2026-04-28.md`
