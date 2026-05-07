# Remaining English-Only Gaps - Command Center Translation DE/IT/PT

## Out of Scope (as per sprint brief - NOT failures)

### 1. CJK UI Languages (zh, ko, ja)
- Still have 111 keys (landing page strings only)
- Missing all 74 Command Center panel keys (chat.*, talk.*, trans.*, sys.*, help.*, docs_*, tab_*, inv_*, agent_*, build_*)
- Will fall back to English for Command Center UI
- Status: KNOWN GAP

### 2. ScoutFlow Modal Copy
- `landing/src/ScoutFlow.tsx` contains hardcoded English strings
- Not translated in this sprint
- Status: KNOWN GAP

### 3. Landing-Page Narrative Sections and Setup Cards
- Hero descriptions, feature descriptions, CTA sections are English-only
- The `nav_open_cc`, `hero_badge`, `hero_title1/2`, `hero_desc`, `hero_btn_launch`, `hero_btn_explore` keys exist in the i18n resource but the landing page components may use different copy or the translations may differ in tone between frontend and landing contexts
- Status: KNOWN GAP

### 4. TranslatePanel Source/Target Language Option Names
- `LANGUAGES` array in `frontend/src/components/TranslatePanel.tsx` (lines 7-15) is hardcoded English:
  - `'Auto Detect'`, `'English'`, `'Spanish'`, `'French'`, `'German'`, `'Chinese'`, `'Japanese'`
- These are `<option>` labels in source/target language dropdowns
- Status: KNOWN GAP

### 5. System Low-Level Diagnostic Values
- Model IDs, backend names, capability IDs, hostnames, API-derived values, metric values
- Intentionally untranslated technical identifiers
- Status: BY DESIGN

### 6. Hardcoded English Strings in Panel Components (not scoped by sprint)

These are product-wide hardcoded English strings that exist across all languages,
not specific to the de/it/pt translation gap:

#### ChatPanel
- `"Error: "` prefix prepended to error messages (line 68)
- `'Not installed on this node yet'` fallback string (line 156)

#### TalkPanel
- `'Hello from iHomeNerd.'` default TTS text (line 59)
- `'Could not transcribe audio.'` error string (line 195)
- `'ASR: '`, `'Recognition: '`, `'Chat: '`, `'TTS: '` prefixes (lines 346-351)
- `'local runtime'`, `'not installed'`, `'local route'` fallback labels (lines 346-506)

#### TranslatePanel
- `'Error: '` prefix (line 42)
- `'not installed'` fallback (line 31)
- `' chars'` suffix after character count (line 109)

#### SystemPanel
- Extensive hardcoded English: Metric labels, form labels, preflight summary fields,
  capability table headers, node labels, badge text, status strings (~100+ instances)
- These are low-level diagnostic/technical labels that the brief explicitly scopes out

Status: NOT BLOCKING - These exist independently of the de/it/pt translation work and
affect all languages equally. Addressing them would require a separate sprint for
component-level i18n plumbing beyond translation resource insertion.

## Summary

All known gaps are either explicitly out of scope per the sprint brief or
pre-existing hardcoded English patterns that affect all languages equally.

No new gaps were introduced by this sprint's changes.
