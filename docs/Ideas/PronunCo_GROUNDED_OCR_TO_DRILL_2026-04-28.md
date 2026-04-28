# PronunCo / iHN Grounded OCR-to-Drill Idea

**Date:** 2026-04-28  
**Status:** product idea / feature note  
**Audience:** Alex, iHN, PronunCo

## 1. Core idea

Use `camera -> OCR -> phrase extraction -> drill generation` to turn real
objects and real environments into language-learning material.

This is not generic translation. The point is to let the learner point at
something real and get:

- the word or phrase
- pronunciation help
- example usage
- a micro-drill
- a spoken practice loop

## 2. Why this fits iHN

iHN already wants:

- OCR
- vision / camera support
- local-first processing
- capability routing by device

PronunCo already wants:

- pronunciation practice
- phrase-level drills
- contextual language learning
- multilingual support

This feature sits directly at the overlap.

## 3. Example flows

### Kitchen object flow

Learner points the camera at a kitchen appliance box.

Example:
- box text says `mélanger`
- iHN OCRs the text
- iHN identifies likely domain: `kitchen / cooking`
- PronunCo generates:
  - meaning
  - pronunciation target
  - one short usage sentence
  - one imperative phrase
  - one contrast or repetition drill

Possible drill output:
- say the word
- say `Je vais mélanger`
- answer `What do you use this for?`

### Multi-object kitchen scan

Learner captures 3-4 items:

- mixer
- bowl
- spoon
- flour bag

iHN can:

- OCR and normalize labels
- cluster them into one domain
- generate a themed micro-lesson
- create a short roleplay around cooking

### Restaurant menu flow

Learner points camera at a menu.

iHN can:

- OCR dish names and descriptions
- identify likely ingredients / categories
- generate an `ordering speech` drill

Possible drill output:
- `I would like the...`
- `What do you recommend?`
- `Does this contain ...?`
- `No onions, please`
- `Can I get this less spicy?`

### Store / street / label flow

Learner points at:

- shelf labels
- transit signs
- product packaging
- instructions

PronunCo turns those into:

- vocabulary capture
- pronunciation practice
- short context-aware recall drills

## 4. Why this is better than plain OCR translation

Plain OCR translation gives:

- extracted text
- a translated meaning

This flow should give:

- grounded vocabulary
- pronunciation targets
- phrase usage
- speaking drills
- later roleplay

So the learner moves from `what does this mean?` to `can I say it correctly in context?`

## 5. Implementation shape

### Stage 1

- OCR image / camera frame
- extract top text candidates
- let user pick 1 item
- generate a word drill

### Stage 2

- parse a small set of objects / menu lines
- infer domain
- generate a themed micro-drill

### Stage 3

- turn grounded text into spoken interaction
- roleplay ordering / describing / asking
- tie into existing ASR + TTS loop

## 6. Device fit

### On phone

Good first targets:

- OCR capture
- short phrase extraction
- lightweight drill generation
- spoken practice if local TTS/ASR exists

### On stronger home node

Good escalation targets:

- better OCR
- full menu parsing
- richer drill generation
- vision understanding beyond text

## 7. Why this matters

This is one of the strongest `real-world learning` stories available to
PronunCo and iHN:

- practical
- local-first
- motivating
- camera-grounded
- reusable across many languages

It also avoids the trap of abstract flashcards by using the learner's real
environment as lesson material.

## 8. Suggested next step

After OCR lands in iHN:

1. build a tiny `OCR -> picked phrase -> pronounce this` prototype
2. test on:
   - kitchen packaging
   - menus
   - food labels
3. measure:
   - OCR quality
   - drill usefulness
   - whether the learner actually repeats the phrase
