# Command Center Translation Pilot

## Goal

Add reviewed first-pass Spanish, French, and Russian translations for the
Command Center keys that were introduced by the language parity sprint and still
fall back to English.

This sprint is a narrow localization pilot. It proves the translation workflow,
key audit, and validation method before the project commits to all UI languages
and the larger landing/ScoutFlow copy surface.

## Why This Sprint Exists

`2026-05-07_command-center-language-parity` made UI-language behavior coherent:
shared language options, `?lng=` handoff, persistence, document language, and
primary Command Center strings behind i18n keys.

Validation correctly recorded the remaining gap: English has the expanded key
set, while non-English languages still fall back to English for the new
Command Center panel keys.

This follow-up closes that gap for three pilot languages without reopening
language plumbing or broad landing-page localization.
