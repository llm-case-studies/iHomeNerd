# iPhone Node — ASR Tiers + Whisper Test Request

**Date:** 2026-04-29
**Time issued:** afternoon EDT (follow-up to the morning contract test)
**Requester:** Claude (Mac mini M1)
**Target device:** iPhone 12 Pro Max (LAN IP `192.168.0.220`, advertised hostname `iphone`)
**Target role:** iOS node-class host
**Expected branch context:** `main` at or after the Whisper wiring commit (after `39eea83`).

---

## 1. What changed since your last run

### 1.1 ASR is now tiered

`/capabilities` `_detail.speech_to_text` now carries:

```json
{
  "available": true,
  "on_device": true,
  "tier": "single | parallel | whisper",
  "candidate_languages": ["en-US","ru-RU","fr-FR", ...],
  "locale_count": 63,
  "supported_locales": ["ar-SA", ...],
  "whisper": {                        // present iff tier == "whisper"
    "model": "openai_whisper-base",
    "model_bytes": 145000000,
    "auto_language_id": true,
    "code_switching": true
  }
}
```

`tier` is the strategy this device's `CapabilityHost` selected at startup
based on physical RAM and the WhisperBundle probe:

- `single` — < 3 GB RAM. One `SFSpeechRecognizer` per session.
- `parallel` — ≥ 3 GB RAM, no Whisper model present yet. N
  `SFSpeechRecognizer` instances on the same audio buffer (capped at 4).
- `whisper` — ≥ 6 GB RAM **and** WhisperKit's Core ML model has been
  loaded at least once on this device (probe in `WhisperBundle.swift`).

**iPhone 12 Pro Max** (6 GB, A14) advertises `tier: "parallel"` until
the user opens the Listen tab in **Whisper** mode at least once. After
the first successful Whisper transcription (model is downloaded + cached
+ loaded into memory), `tier` flips to `"whisper"` for the remaining
runtime lifetime, and the `whisper` sub-object becomes present.

### 1.2 ASR is now multi-engine

The Listen tab has two modes:

- **Apple** — original behavior, plus a multi-select language picker
  (sheet UI, capped at 4 locales). `single` if 1 picked, `parallel` if
  ≥ 2 picked. Known-fragile in mixed-language audio (Apple's recognizer
  has no acoustic language ID, so the "wrong locale" recognizer often
  produces confidently-wrong gibberish in *its* locale).
- **Whisper** — WhisperKit (`openai_whisper-base`, 145 MB, MIT licensed,
  Core ML on Neural Engine). Auto-detects language. Batch-only for
  v1: records, on Stop runs `transcribe(audioArray:)`, displays detected
  language + transcript.

### 1.3 Capabilities are still snapshot-at-startup

`/capabilities` is built once at `NodeRuntime.start()` and frozen. So
the `tier` field reflects the state **at the moment the user toggled
Node ON**, not "right now." If the user warms Whisper before flipping
the Node toggle, tier shows `whisper` from the start. If they flip Node
on first and warm Whisper after, tier stays `parallel` until the next
restart of the Node.

This is not a bug — it matches Android's behavior. Document the
contract; don't assume liveness.

---

## 2. What we'd like you to verify

### 2.1 Contract regression (5 min)

Re-run the existing contract pack against the iPhone with the **Listen
tab closed and never-opened-Whisper** so we lock in the `tier=parallel`
shape:

```
pytest backend/tests/test_contract_api.py \
       backend/tests/test_bootstrap_routes.py \
       --base-url=https://iphone.local:17777 \
       --bootstrap-base-url=http://iphone.local:17778
```

Expected: same 32/38-or-better pass rate as 2026-04-29 morning. New
fields (`tier`, `candidate_languages`) should not break the existing
contract — they live under `_detail`.

### 2.2 New asserts — please add (15 min)

Extend `backend/tests/test_contract_api.py` with a new test class
`TestSpeechToTextTier` that asserts (for any node advertising
`speech_to_text`):

- `_detail.speech_to_text.tier` ∈ `{"single", "parallel", "whisper"}`.
- `_detail.speech_to_text.candidate_languages` is a list of strings
  (may be empty for `single`, must be non-empty for `parallel`/`whisper`).
- Every entry in `candidate_languages` is also in `supported_locales`.
- If `tier == "whisper"`, `_detail.speech_to_text.whisper` must be
  present and contain `model`, `model_bytes`, `auto_language_id`,
  `code_switching`.
- If `tier != "whisper"`, the `whisper` sub-object must be **absent**
  (don't accept `null` — we explicitly don't emit it).

These should pass against the iPhone (currently `parallel`) and the
Python backend (currently `single` or absent — gracefully skip if
`speech_to_text` isn't present at all).

### 2.3 Whisper smoke test (manual, 10 min)

Once Alex has opened the Listen tab in **Whisper** mode at least once
and successfully transcribed something:

```
curl --cacert <home-ca.pem> https://iphone.local:17777/capabilities \
  | jq '._detail.speech_to_text'
```

Expected:

- `tier: "whisper"`
- `whisper.model: "openai_whisper-base"`
- `whisper.model_bytes: 145000000`
- `whisper.auto_language_id: true`
- `whisper.code_switching: true`

(If you see `tier: "parallel"` and no `whisper` sub-object, ask Alex to
restart the Node toggle — see §1.3.)

### 2.4 Parallel-mode known-bug regression (manual, 5 min)

Document — don't try to fix — that Apple-engine Parallel mode currently
**always returns the wrong-locale recognizer's output** when fed
mixed-language audio. Reproduce by:

1. Listen tab → Engine: Apple → Edit → pick `en-US` and `ru-RU` → Done.
2. Tap Listen, speak English clearly. Tap Stop.
3. Observe transcript: usually Cyrillic gibberish under `ru-RU` badge.

This is fundamental to `SFSpeechRecognizer` (no acoustic language ID)
and is the reason Whisper mode exists. We just want it documented in
the test report so we don't re-discover it.

---

## 3. Nice-to-have: ASR accuracy fixtures (parking lot)

Once the Azure tongue-twister fixtures land
(`docs/MULTILINGUAL_ASR_AND_AZURE_FIXTURES_2026-04-29.md`), we'll add
an "ASR accuracy floor" section to the contract pack: feed each
fixture WAV through the iPhone (and ME-21, and the Python backend) and
report word-error-rate. No hard pass/fail yet — just baselining.

The Dell-side person (whoever's there, you or Codex) owns generating
the fixtures because the Azure keys live in local Gitea on the Dell.
This is **blocked on those keys**, not on you. Don't try to write the
accuracy tests until the WAVs are in
`mobile/testing/fixtures/tongue_twisters/`.

---

## 4. Hands-off zones (please don't touch)

- `mobile/ios/ihn-home/IhnHome/Runtime/WhisperEngine.swift` — the
  WhisperKit wrapper. Mac-side ownership.
- `mobile/ios/ihn-home/IhnHome/Runtime/WhisperBundle.swift` — the
  load-state probe. Mac-side ownership.
- `mobile/ios/ihn-home/IhnHome/Screens/ListenScreen.swift` — UI logic.
  Mac-side ownership.

You're the contract-test owner. We're the runtime owner. Same boundary
as before.

---

## 5. Reporting back

Same format as your 2026-04-29 morning report
(`testing/results/CROSS_PLATFORM_CONTRACT_FINDINGS_2026-04-28.md` style):
pass/fail counts, per-test diff vs. previous run, and a one-paragraph
narrative on what changed.

Push to `testing/results/` with date in the filename. Reply to this
request file (PR comment, commit message, or a sibling reply doc — your
preference) with a link.

Thank you!
