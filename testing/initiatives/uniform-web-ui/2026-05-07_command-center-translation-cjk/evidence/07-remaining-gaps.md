# Remaining English-Only Gaps

These are recorded as known gaps, not validation failures. All were previously documented in earlier validation rounds and remain out of scope for this CJK translation sprint.

## Out of Scope (Per Sprint Brief)

1. **ScoutFlow modal copy** (`landing/src/ScoutFlow.tsx`): Hard-coded English. Not a Command Center surface.

2. **Landing-page narrative sections and setup cards**: Hard-coded English in landing page hero, feature descriptions, and CTA sections. Some keys (hero_desc, feat_desc, cta_desc) have translations but landing-specific content differs from frontend and some remains English. Landing narrative is explicitly out of scope.

3. **TranslatePanel source/target language option names** (`LANGUAGES` array in `TranslatePanel.tsx`): English-only language names like "English", "Chinese", "Japanese", etc. These are API-facing identifiers, not UI locale strings.

4. **System low-level diagnostic values**: Model IDs, backend names, capability IDs, hostnames, metric values - all API-derived, intentionally untranslated.

5. **No new language codes**: `SUPPORTED_UI_LANGUAGES` unchanged (10 languages). Non-advertised languages (el, ar, hi, etc.) not added.

## Component-Level Hard-Coded English (Pre-Existing)

Affects all languages equally. Requires component-level i18n plumbing (future sprint):

- **ChatPanel**: `"Chat error:"` prefix, `"Not installed on this node yet"` string (2 instances)
- **TalkPanel**: Error prefixes (`"Talk pipeline error:"`, `"Transcription error:"`, `"Voice list error:"`, `"TTS sample error:"`), `"Microphone access denied"`, `"Hello from iHomeNerd."` TTS default text, `"Could not transcribe audio."`, `"DisplayNames"` (8 instances)
- **TranslatePanel**: `"Translation error:"` prefix, `"Auto Detect"` label (2 instances)
- **SystemPanel**: ~54 hard-coded metric/form labels including `"App CPU"`, `"App Memory"`, `"Battery"`, `"Best fit"`, `"GPU Worker"`, `"Check Updates"`, `"Coming Soon"`, `"Failed to load system data"`, etc.

## Known Token-Based Gaps

- **ja `footer_rights`**: "All rights reserved." remains in English in the Japanese block. This is a landing page key, not a scoped Command Center key per the brief boundaries. Documented in prior validation.

- **ko `talk.labelNerd`**: "Nerd:" (same as English) - `Nerd` is a product identifier token. This is acceptable per the stable-token rule.

- **ko/ja `talk.labelNerd`**: Both keep "Nerd:" identical to English. Product name is intentionally stable.

## Result: PASS (gaps are documented, not regressions)
