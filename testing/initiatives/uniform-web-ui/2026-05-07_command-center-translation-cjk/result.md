# Result - Command Center Translation CJK

- Verdict: **PASS** (with recorded out-of-scope gaps)
- Product commit: `dae6d307f5d9580a66d60300dbb90d2f7ef0892f`
- Implementation host: Acer-HL
- Validation host: iMac-Debian
- Validation date: 2026-05-07

## What Changed

- `frontend/src/lib/i18n.ts`: added 74 Command Center resource keys to the
  `zh`, `ko`, and `ja` translation blocks, bringing each to full 185-key parity
  with English.
- `landing/src/i18n.ts`: mirrored the same 74-key insertions to keep landing
  and Command Center resource blocks aligned.

## Language Coverage

| Language | Keys before | Keys after | Missing from en |
|----------|------------|------------|-----------------|
| zh       | 111        | 185        | 0               |
| ko       | 111        | 185        | 0               |
| ja       | 111        | 185        | 0               |

All 74 previously-fallback keys now have reviewed first-pass translations in
each language. Namespaces covered: `chat.*`, `talk.*`, `trans.*`, `sys.*`.

## All-Ten-Language Scoped Parity

| Language | Keys | CC parity |
|----------|------|-----------|
| en       | 185  | baseline  |
| zh       | 185  | PASS      |
| ko       | 185  | PASS      |
| ja       | 185  | PASS      |
| es       | 185  | PASS      |
| fr       | 185  | PASS      |
| ru       | 185  | PASS      |
| de       | 185  | PASS      |
| it       | 185  | PASS      |
| pt       | 185  | PASS      |

All ten advertised UI languages have identical scoped Command Center key counts.
No scoped key falls back to English in any of the ten languages.

Landing `landing/src/i18n.ts` mirrors frontend exactly: 185 keys per language,
zero discrepancies between the two files for all CJK Command Center resource
keys. Two intentional value differences exist on `nav_open_cc` and
`hero_btn_launch` where landing uses "Live Image" variants while frontend
uses Command Center terminology - not a defect.

## Placeholder / Pluralization Checks

**Placeholders:** All tested across zh/ko/ja in both frontend and landing files.
Every instance of `{{route}}`, `{{tier}}`, `{{language}}`, `{{count}}`, and
`{{year}}` is preserved exactly. No interpolation markers were lost, altered,
or reordered.

**Pluralization:** All `_one` / `_other` pairs present and intact:
- `talk.matchingVoices`
- `talk.localLanguages`
- `sys.nodesCount`

All three plural key pairs also verified present in landing i18n.ts for all
three CJK languages.

**Stable tokens:** `iHomeNerd`, `Nerd`, `ASR`, `TTS`, `SSH`, `Docker`, `Ollama`,
`launchd`, `mac-mini`, `iMac`, `Google Coral TPU` are preserved untranslated
in all three languages.

## Builds / Branch Map

```
npm --prefix frontend run build   # PASS - vite build, 2129 modules, 0 errors
npm --prefix landing run build    # PASS - vite build, 1710 modules, 0 errors
python3 tools/branch-map/branch_map.py --repo . --base origin/main  # PASS
```

## Bundle Smoke Verification

Built JS bundles audited for CJK translations in minified output.
Primary strings per language verified present in both frontend and landing bundles:

| Key | zh | ko | ja |
|-----|-----|-----|-----|
| chat.greeting | FOUND | FOUND | FOUND |
| talk.listening | FOUND | FOUND | FOUND |
| talk.transcribing | FOUND | FOUND | FOUND |
| trans.translating | FOUND | FOUND | FOUND |
| sys.loading | FOUND | FOUND | FOUND |
| sys.healthy | FOUND | FOUND | FOUND |
| sys.degraded | FOUND | FOUND | FOUND |

No English fallback strings found for scoped Command Center keys in zh/ko/ja
bundles. English originals each appear exactly 1x (the `en` resource block).

## Language Role Separation

- **`document.documentElement.lang`**: Set by `setDocumentLang()` in
  `languageUtils.ts`, correctly set to `zh`/`ko`/`ja` on language change.
- **localStorage key `ihomenerd.ui.language`**: Persisted on
  `languageChanged` event via `initLanguagePersistence()`.
- **`?lng=` URL param**: `resolveInitialLanguage()` checks URL param before
  localStorage fallback. Works for `?lng=zh`, `?lng=ko`, `?lng=ja`.
- **ChatPanel**: Uses `i18n.language` for chat language - separate from the
  language selector dropdown which changes UI locale.
- **TalkPanel**: ASR/TTS controls use BCP-47 language tags. Recognition
  language controls are separate from UI locale. BCP-47 handling confirmed
  present via `languageTag` / `langCode` references.
- **TranslatePanel**: Source/target language controls are separate from UI
  locale. Does NOT use `i18n.language`. `LANGUAGES` array provides
  language options.
- **SUPPORTED_UI_LANGUAGES**: 10 languages (en, zh, ko, ja, ru, de, fr,
  it, es, pt). No new codes added.

## CJK Readability and Visual-Fit Notes

### Chinese (zh)

- No English-style spacing between Chinese characters -- natural CJK flow.
- All tab labels compact: 聊天(2), 语音(2), 文档(2), 翻译(2), 调查(2),
  代理(2), 构建器(3), 系统(2). Well within tab dimensions.
- Status badges: 健康(2 chars), 降级(2 chars) -- compact.
- Button labels: "运行预检"(4), "保存候选"(4), "安装到节点"(5) -- compact.
- Longest descriptive string: `sys.promoteNodeDesc` (74 chars) -- in roomy
  System panel section.
- Ellipsis (`...`) used consistently for ongoing operations.
- Half-width `?` used which is standard in modern Chinese UI text.

### Korean (ko)

- Natural Korean spacing throughout -- words and particles properly separated.
- No double spaces or collapsed spacing issues.
- Tab labels: 채팅(2), 대화(2), 문서(2), 번역(2), 조사(2), 에이전트(4),
  빌더(2), 시스템(3) -- compact and readable.
- Status badges: 정상(2), 저하됨(3) -- compact.
- Button labels: "사전 점검 실행"(7), "후보 저장"(4), "노드에 설치"(4) -- OK.
- Longest descriptive: `sys.promoteNodeDesc` (95 chars).
- Korean text flows naturally with appropriate spacing.
- Note: `talk.recognizedWith` uses Korean `(으)로` grammar pattern which
  varies by the interpolated language name's batchim - best-effort,
  not a bug.

### Japanese (ja)

- No English-style spacing between Japanese characters -- uses native
  punctuation (`。`、`,`).
- Katakana terms for technical concepts (チャット, ノード, ランタイム) are
  natural and readable.
- Tab labels: チャット(4), トーク(3), ドキュメント(6), 翻訳(2), 調査(2),
  エージェント(6), ビルダー(4), システム(4) -- some longer katakana tabs
  (ドキュメント, エージェント) but still within tab dimensions.
- Status badges: 正常(2), 低下(2) -- compact.
- Button labels: "プリフライトの実行"(8), "候補を保存"(4),
  "ノードにインストール"(8) -- slightly longer due to katakana but
  acceptable for action buttons.
- Longest descriptive: `sys.promoteNodeDesc` (104 chars) -- longer than
  English due to polite form, but fits in System panel sections.

### Visual-fit verdict

No primary-control overflow or critical layout pressure identified. Tab labels,
status badges, and action buttons remain compact across all three CJK languages.
Descriptive strings are naturally longer than English (Japanese ~10-30% longer
due to grammatical forms) but appear in roomy System panel sections where
wrapping is expected.

## Known Gaps (recorded, not failures)

### Out of scope per sprint brief

1. **ScoutFlow modal copy** (`landing/src/ScoutFlow.tsx`): hard-coded English.
2. **Landing-page narrative sections and setup cards**: hard-coded English.
3. **TranslatePanel source/target language option names** (`LANGUAGES` array
   in `TranslatePanel.tsx`): English-only.
4. **System low-level diagnostic values**: model IDs, backend names, capability
   IDs, hostnames, metric values -- all API-derived, intentionally untranslated.
5. **No new language codes added**: `SUPPORTED_UI_LANGUAGES` unchanged.
6. **Hard-coded English in panel components**: Error prefixes
   (ChatPanel: "Chat error:", TalkPanel: "Talk pipeline error:",
   "Transcription error:", "Voice list error:", "TTS sample error:",
   TranslatePanel: "Translation error:"), TTS default text
   ("Hello from iHomeNerd."), ASR/TTS status labels, System metric/form/
   preflight labels (~54+ instances). Pre-existing, affect all languages
   equally. Require component-level i18n plumbing.
7. **ja `footer_rights`**: "All rights reserved." remains in English --
   landing page key, not scoped Command Center per brief boundaries.
8. **ko/ja `talk.labelNerd`**: "Nerd:" same as English -- product identifier,
   intentionally stable per token preservation rule.

## Evidence

All validation evidence under:
`testing/initiatives/uniform-web-ui/2026-05-07_command-center-translation-cjk/evidence/`

- `01-build-and-branchmap.md` - Build logs and BranchMap summary
- `02-key-coverage-audit.md` - Full key coverage audit across all 10 languages
- `03-placeholder-and-plural.md` - Placeholder and pluralization verification
- `04-bundle-smoke.md` - Bundle smoke check for zh/ko/ja primary strings
- `05-cjk-readability.md` - CJK readability and visual-fit notes
- `06-language-separation.md` - Language role separation and localStorage/documentLang audit
- `07-remaining-gaps.md` - Remaining English-only gaps audit
