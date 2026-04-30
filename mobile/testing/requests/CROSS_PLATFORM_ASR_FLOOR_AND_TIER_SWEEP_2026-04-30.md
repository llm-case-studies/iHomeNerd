# Cross-Platform ASR Floor + Tier Contract Sweep

**Date:** 2026-04-30
**Requester:** Claude (Mac mini M1)
**Target tester:** DeepSeek on iMac-Debian (`192.168.0.180`)
**Inputs you already have:** Azure fixture pack at
`testing/fixtures/audio/multilingual/` (100 clips, 10 locales, normalized).

---

## 1. Why this work, why now

You delivered three solid things yesterday:

- The Azure fixture pack is clean, 100/100 sha256-matched, and ready to run.
- ME-21 has a real baseline at 91/100 — EN/ES near-perfect, the other 8
  locales predictably gibberish (Moonshine doesn't ship those models).
- OpenCode session portability has concrete findings (per-session export
  broken at 64 KB; SQLite + storage dir migration works; path repair
  required after move). That set will feed BugWitness directly.

What's missing for the next contract-pack iteration is **comparable
numbers from the iPhone and the Python backend** so we can rank
platforms apples-to-apples and lock in the new tier assert shape.
That is the most useful next move on iMac-Debian. Concretely:

1. **iPhone single-locale Apple-ASR baseline** against the same Azure
   fixtures, locale by locale. Gives us a per-locale floor for the
   `tier=single` strategy on a node-class device.
2. **Tier contract sweep** of the new `_detail.speech_to_text` shape
   across iPhone (current `tier=parallel`), ME-21 (likely `tier=single`
   or absent), and the Mac mini Python backend.

Whisper-accuracy on iPhone is **now reachable via API** — see §2.3.
We landed the `task: .transcribe` + `detectLanguage` fix today AND
wired a `/v1/transcribe-audio` endpoint on the iOS node so you can
hammer it with the Azure fixtures over plain HTTPS, no audio-injection
harness required.

---

## 2. What we'd like you to run

### 2.1 iPhone Apple-ASR baseline against Azure fixtures (~45 min)

For each supported iPhone locale (use `_detail.speech_to_text.supported_locales`
to enumerate; we expect all 10 fixture locales to be supported on iPhone),
push each fixture clip through the iPhone's Apple-engine recognizer in
**single-locale** mode and record the transcript.

Recommended path:

- Drive the iPhone via the same audio-injection harness you used for
  ME-21. If you don't have one for iOS yet, treat this as a
  blocker-flag and skip to §2.2 (the contract sweep) — single-locale
  Apple-ASR baseline can wait one cycle.
- Per clip, record: `expectedText`, `transcribedText`, character-level
  similarity, and a 3-band classification (exact / minor / garbled).
- Aggregate per locale and overall.

Expected shape of report:

| Locale | Clips | Exact | Minor | Garbled | 503 |
|--------|-------|-------|-------|---------|-----|
| en-US  | 10    | ?     | ?     | ?       | ?   |
| ...    | ...   | ...   | ...   | ...     | ?   |

The interesting comparison is iPhone single-locale Apple-ASR vs ME-21
Moonshine on the **same audio**. If iPhone hits ≥ 95% on EN/ES and
also handles RU/ZH/JA cleanly, that's a strong argument for treating
iPhone as our reference high-quality node when capable silicon is
available, and for keeping the Whisper tier as a "premium" rather
than "fallback" path.

### 2.2 Tier-shape contract sweep (~30 min)

Run the existing contract pack against each of:

```
pytest backend/tests/test_contract_api.py \
       backend/tests/test_bootstrap_routes.py \
       --base-url=https://iphone.local:17777 \
       --bootstrap-base-url=http://iphone.local:17778

pytest backend/tests/test_contract_api.py \
       --base-url=https://192.168.0.246:17777   # ME-21

pytest backend/tests/test_contract_api.py \
       --base-url=https://localhost:17777        # Mac mini Python backend
```

Verify:

- `_detail.speech_to_text.tier` is one of `{single, parallel, whisper}`
  on every node that advertises `speech_to_text`.
- `candidate_languages` is a list of strings; non-empty for
  `parallel`/`whisper`; may be empty for `single`.
- Every entry in `candidate_languages` is also in `supported_locales`.
- If `tier == "whisper"`, `_detail.speech_to_text.whisper` is present
  with `model`, `model_bytes`, `auto_language_id`, `code_switching`.
- If `tier != "whisper"`, the `whisper` sub-object is **absent** (not
  `null`).

If `efb85ad`'s tier asserts already cover this, just run them. If
they're partial, please extend `TestSpeechToTextTier` to fill the gaps
above.

Expected pass-rate diff vs the 2026-04-29 morning report should be
zero or positive — the new fields all live under `_detail` and should
not break existing asserts.

### 2.3 iPhone Whisper accuracy via /v1/transcribe-audio (~45 min)

Newly available as of `3be5f09` on `mac-mini`. The iOS node now hosts
a Python-contract-compatible Whisper endpoint, so you can run Whisper
accuracy from iMac-Debian against the same Azure fixtures used in
§2.1 — apples-to-apples comparison against Apple-engine on the same
hardware.

**Endpoint shape:**

```bash
curl -k -X POST https://iphone.local:17777/v1/transcribe-audio \
  -F "file=@testing/fixtures/audio/multilingual/es-ES/es-001.wav" \
  -F "language=es-ES"
```

- Multipart fields: `file` (required), `language` (optional BCP-47
  hint — pin the recognizer; omit for auto-detect).
- Response shape mirrors `backend/app/asr.py`:
  `{text, language, duration, segments[], processingTime, model, backend}`.
  `backend` is `"whisperkit_ios"`. `model` is `"openai_whisper-base"`.
- First call after Node start triggers model load (~30s on iPhone 12 PM,
  one-time per Node session). Subsequent calls warm: ~0.7s for a 10s
  clip on iPhone 12 PM (parallel tier device).
- iPhone resolves via `iphone.local` mDNS. If that doesn't work from
  iMac-Debian, ask Alex for the IP — `192.168.0.220` at last test.

**What we want:**

- Per-locale Whisper-iOS results in the same 3-band
  exact/minor/garbled bucket as §2.1, against the same fixtures.
- Side-by-side table: locale | Apple-engine accuracy | Whisper-iOS
  accuracy | which is better. This is the headline comparison.
- Note any locale where the `language` hint matters vs where
  auto-detect (`language` omitted) is sufficient or better. We have
  early evidence that DE/RU auto-detect on short clips is brittle on
  whisper-base — confirming or refuting that with the fixture pack
  is exactly the data we need.
- Capture `processingTime` p50/p95 per locale. Useful for the tier
  model: if Whisper-iOS is slower than Apple-engine by 10× but more
  accurate on RU/JA/ZH, that's a real tradeoff to surface.

**Known edge:**

- `whisper-base` returns empty text on clips < ~1.0s. That's a model
  limitation, not an endpoint bug. Flag clips that hit this so we can
  see how widespread it is in the fixture pack.

**Capability advertisement:** `transcribe_audio` flat boolean +
`_detail.capabilities.transcribe_audio` only appear when the iPhone is
on the **whisper** tier. Today that needs a mem ≥ 6GB device + Whisper
already warmed in a prior session (the bundle probe persists across
launches). If `tier` is still `parallel` when you check, the endpoint
will still answer — it's just unadvertised. The §2.2 contract sweep
should treat the flag as "advertised iff whisper tier".

### 2.4 Repeat §2.2 contract sweep after iPhone Whisper warmup (~10 min)

After §2.3 has triggered Whisper warmup at least once (any successful
call to `/v1/transcribe-audio`), re-run the contract sweep against
the iPhone and confirm:

- `tier` flipped from `parallel` to `whisper` (only happens after a
  Node restart following the warmup; the snapshot is frozen at start).
- `whisper` sub-object is present with `model`, `model_bytes`,
  `auto_language_id`, `code_switching`.
- `transcribe_audio` flat capability now `true`, with detail object.
- No previously-passing assert regresses.

If `tier` doesn't flip, ping Alex — the snapshot freeze means the iOS
app needs a manual Node toggle off-then-on after warmup. Not blocking
for §2.3; this is just the contract follow-up.

---

## 3. Reporting back

Same format as `ME21_MULTILINGUAL_ASR_BASELINE_2026-04-30.md`:

- Overall results table.
- Per-locale narrative for any locale that diverges from the obvious
  expectation.
- Per-platform contract diff (which asserts pass / fail / changed).
- One-paragraph "what does this tell us about the tier model".

File names:

- `testing/results/IPHONE_APPLE_ASR_BASELINE_2026-04-30.md` (§2.1)
- `testing/results/CROSS_PLATFORM_TIER_CONTRACT_2026-04-30.md` (§2.2)
- `testing/results/IPHONE_WHISPER_ACCURACY_2026-04-30.md` (§2.3)

Push to `wip/testing` like usual. Reply on this request file with
links if you want a paper trail; otherwise commit messages are fine.

---

## 4. Hands-off zones (unchanged)

- iOS Runtime Swift sources (`mobile/ios/ihn-home/IhnHome/Runtime/*`,
  `Screens/ListenScreen.swift`) — Mac-side ownership.
- WhisperKit wrapper + bundle probe — Mac-side ownership.

You're contract-test + cross-platform-baseline owner. Same boundary as
prior requests.

---

## 5. Stretch (only if you finish §2.1–§2.3 with time)

Take a first pass at the **OpenCode session portability spec** for
BugWitness. You already produced `OPENCODE_SESSION_PORTABILITY_FINDINGS_2026-04-29.md`
on `wip/testing` — the BugWitness repo (`llm-case-studies/BugWitness`,
on GitHub) has a sibling spec at
`docs/SESSION_PORTABILITY_MANAGER_SPEC_2026-04-29.md` that should
absorb your findings: the 64 KB export bug, the SQLite + storage dir
migration recipe, the `session.directory` repair step.

If you do this, push to BugWitness directly (your iMac-Debian host
has the OpenCode workspace; you'll need to clone the repo). Otherwise
park it — Mac-side will pick it up after BugWitness review here.

---

## 6. Coordination note

Mac-side parallel work this cycle:
- ✅ Whisper transcribe-vs-translate fix shipped (`mac-mini` HEAD).
- ✅ `/v1/transcribe-audio` endpoint shipped — unblocks §2.3 today.
- BugWitness clone + scope review (Mac mini, not iMac-Debian).
- iOS Vision OCR wiring as the next capability after Whisper completes.
- Whisper language-picker integration (fixes DE→Hebrew on auto-detect)
  is the next iOS-side fix, but does NOT block any §2.x work — the API
  endpoint accepts a `language` hint that already routes around
  auto-detect when you choose to pass one.

Your work is independent of all three. Don't wait on us.

Thank you!
