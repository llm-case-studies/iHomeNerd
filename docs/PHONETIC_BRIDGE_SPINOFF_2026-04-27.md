# Phonetic Bridge Spin-Off

**Status:** concept note  
**Date:** 2026-04-27  
**Owner:** Alex  
**Related apps:** PronunCo, TelPro-Bro, future speaking-coach / performance-coach products

---

## 1. Why this note exists

Recent Android and ASR work clarified an important boundary:

- plain `ASR` is not the same as `pronunciation assessment`
- `pronunciation assessment` is not the same as `phonetic contrast training`
- for some learner populations, the hardest part is not even "say the right word"
- the hardest part is "hear and produce the right contrast"

That means there is likely a reusable specialist engine hiding underneath PronunCo.

This note records the idea that the reusable engine should be treated as a separate product / subsystem:

- not core `iHomeNerd`
- not only `PronunCo`
- reusable anywhere speech drills, accent shaping, delivery training, or expressive speaking matter

---

## 2. Core insight

The problem is not merely "score the speech."  
The problem is often "score the sound."

Examples:

- Mandarin learners may not reliably hear or produce some initial consonant contrasts or tones
- Japanese learners may struggle with vowel length, gemination, pitch accent, or English `r/l`
- Korean learners may struggle with the stop-series distinction
- East Asian learners of English may struggle with `r/l`, `v/b`, `th/s`, stress reduction, or schwa
- Western learners of East Asian languages may struggle with tone, mora timing, aspiration, or vowel quality

For these cases, free-form transcription is not the central problem.

The real tasks are:

- `intelligibility` — what text was likely said?
- `contrast production` — did the learner realize the target contrast?
- `contrast perception` — can the learner hear the difference?
- `delivery / expressiveness` — did the learner say it with the intended timing, stress, emotion, or presence?

Those are related, but not the same.

---

## 3. Why this should not be buried inside iHN core

`iHN core` should stay focused on:

- node hosting
- trust / discovery
- capability routing
- shared storage and session plumbing
- app-facing local APIs
- model/runtime lifecycle

The specialist drill engine should own:

- reference-aware alignment
- phoneme / syllable / mora / tone scoring
- contrast-specific feedback
- perception drills like minimal-pair or ABX tasks
- articulatory coaching
- speaking / delivery drill logic

That separation keeps iHN reusable and lets the drill engine evolve faster.

Clean boundary:

- `iHN` hosts and routes it
- `PronunCo` productizes it first
- other apps can reuse it later

---

## 4. Candidate product shape

Working names:

- `Phonetic Bridge`
- `Drill Machine`
- `Speech Drill Engine`
- `Contrast Coach`

The exact name can wait. The important point is functional scope.

Potential users:

- `PronunCo`
- `TelPro-Bro`
- public speaking coaching
- charisma / presence coaching
- acting / performance drills
- accent acquisition or accent softening
- diction training

---

## 5. Supporting findings

### 5.1 Azure pronunciation assessment is not plain STT

Azure Speech Pronunciation Assessment exposes a dedicated assessment path with:

- phoneme / word / full-text granularity
- accuracy, fluency, and completeness style scores
- limited prosody support

Important implication:

- the industry-standard reference experience is not just "run ASR and compare strings"
- it is already a specialist pipeline

Relevant docs:

- https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-pronunciation-assessment
- https://learn.microsoft.com/en-us/python/api/azure-cognitiveservices-speech/azure.cognitiveservices.speech.pronunciationassessmentgranularity

### 5.2 Moonshine is promising, but it is not the full PronunCo answer

Moonshine's strengths:

- low latency
- edge-friendly size
- streaming-friendly design

Moonshine's limitations for language learning:

- current official STT support is limited to a small language set
- newer models are explicitly language-specific
- that monolingual strategy is good for speed and accuracy per language
- but it is a weak fit for mixed-language learner utterances

Current official Moonshine STT language set:

- English
- Spanish
- Mandarin
- Japanese
- Korean
- Vietnamese
- Ukrainian
- Arabic

Our current Android build is even narrower:

- only `en-US`
- only `es-ES`

So Moonshine should be treated as:

- a strong low-latency option
- especially for `TelPro-Bro`
- not the default PronunCo multilingual answer

Relevant docs:

- https://github.com/moonshine-ai/moonshine
- [AndroidAsrEngine.kt](/media/alex/LargeStorage/Projects/iHomeNerd/mobile/android/ihn-home/app/src/main/java/com/ihomenerd/home/runtime/AndroidAsrEngine.kt:34)
- [fetch_android_asr_prereqs.sh](/media/alex/LargeStorage/Projects/iHomeNerd/mobile/android/ihn-home/scripts/fetch_android_asr_prereqs.sh:29)

### 5.3 Whisper remains the most coherent multilingual ASR baseline

Whisper / faster-whisper remains attractive because it gives:

- broad language coverage
- one family across desktop and mobile experiments
- better odds on mixed-language or code-switching learner speech

Important constraint:

- Whisper is strong for transcription
- it is not by itself a phoneme-level pronunciation assessor

So Whisper is still likely the best `ASR baseline`, not the full bridge.

Relevant docs:

- https://github.com/openai/whisper
- [backend/app/asr.py](/media/alex/LargeStorage/Projects/iHomeNerd/backend/app/asr.py:1)
- https://github.com/ggml-org/whisper.cpp

### 5.4 Open-source pronunciation-assessment building blocks exist, but not as one clean package

Promising pieces:

- `GOPT` for multi-aspect pronunciation assessment
- `Kaldi GOP` style scoring
- `DaCiDian` for Mandarin lexicon
- `g2pM` for Mandarin grapheme-to-phoneme
- `Fun-ASR` for broad ASR / mixed recognition, especially Asian-language coverage

Important caveat:

- these are building blocks
- they do not yet form a turnkey multilingual Azure replacement

Relevant sources:

- https://github.com/YuanGongND/gopt
- https://github.com/jimbozhang/kaldi-gop
- https://github.com/aishell-foundation/DaCiDian
- https://github.com/kakaobrain/g2pm
- https://github.com/FunAudioLLM/Fun-ASR

### 5.5 PronunCo and TelPro-Bro want different things

`PronunCo` cares more about:

- multilingual coverage
- contrast-level scoring
- perception drills
- known reference text
- code-switching tolerance

`TelPro-Bro` cares more about:

- low latency
- live turn-taking
- delivery and prosody
- sentiment / expressiveness
- reliable narrow-domain interaction

That means one speech backend will not be best for both.

---

## 6. Proposed capability split

### 6.1 iHN-level capabilities

These belong in the shared capability router:

- `recognize_text`
- `transcribe_audio`
- `synthesize_speech`
- `translate_text`
- `align_to_reference`
- `score_pronunciation`
- `score_prosody`
- `run_perception_drill`

### 6.2 Drill-engine-owned logic

These belong inside the specialist engine:

- target-vs-competitor contrast scoring
- phone / syllable / mora / tone evaluation
- duration and stress checks
- ABX / minimal-pair drill generation
- articulatory explanations
- lesson-specific drill policies

---

## 7. Offline-first feasibility

This idea is actually a good fit for offline work because the lesson context is narrow.

In many drills we already know:

- the expected text
- the expected phones or syllables
- the target contrast
- the learner's L1
- the likely competitor errors

That means we do not need a giant open-ended model for every turn.

Offline MVP shape:

1. reference text -> phone / syllable target sequence
2. learner audio -> aligned phones or acoustic segments
3. target-vs-competitor scoring
4. short deterministic feedback
5. optional LLM explanation on top

This is much more realistic on phone hardware than a generic "one model does everything" path.

---

## 8. Suggested MVP

Start narrow and high-value.

### 8.1 First target contrasts

- English `r/l`
- English `th/s`
- Mandarin initials + tones
- Japanese vowel length / gemination

### 8.2 First product mode

Reference-aware drills only:

- listen and repeat
- minimal pair
- ABX discrimination
- target phrase correction

Avoid free-form conversation scoring first.

### 8.3 First deployment modes

- workstation / server first for richer experiments
- phone-capable narrowed drills second

Phone/offline candidates:

- constrained alignment and scoring
- narrow contrast classifiers
- perception drills

Not yet phone-first:

- broad free-form multilingual pronunciation assessment across every language

---

## 9. Strategic conclusion

The reusable engine should be designed as a speech-drill / phonetic-bridge subsystem, not as a hidden PronunCo helper.

That gives iHN a clean role:

- host it
- route to it
- expose it

And it gives the ecosystem a reusable asset for:

- language learning
- delivery coaching
- public speaking
- performing arts
- other speech-training products

---

## 10. Tomorrow-facing next steps

For the next iHN session, keep the paths separate:

### 10.1 Continue core iHN work

- support more than one ASR model/backend
- make backend selection explicit by app and tradeoff
- continue wiring the real features behind existing tabs
- keep improving the Android local node as a travel/offline host

### 10.2 Start a parallel design track for the drill engine

- define capability contract
- choose first contrasts and languages
- choose first offline scoring pipeline
- decide what should be deterministic vs model-based

