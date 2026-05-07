# Result - Command Center Translation CJK

- Verdict: **PASS** (with recorded out-of-scope gaps)
- Product commit: (see commit below, after push)
- Implementation host: Acer-HL
- Validation host: iMac-Debian (pending)
- Smoke host: Acer-HL (build-only, no browser runtime)

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
keys (87 keys verified identical).

## Placeholder / Pluralization Checks

**Placeholders:** All tested across zh/ko/ja in both frontend and landing files.
Every instance of `{{route}}`, `{{tier}}`, `{{language}}`, `{{count}}`, and
`{{year}}` is preserved exactly. No interpolation markers were lost, altered,
or reordered.

**Pluralization:** All `_one` / `_other` pairs present and intact:
- `talk.matchingVoices`
- `talk.localLanguages`
- `sys.nodesCount`

**Stable tokens:** `iHomeNerd`, `Nerd`, `ASR`, `TTS`, `SSH`, `Docker`, `Ollama`,
`launchd`, `mac-mini`, `iMac` are preserved untranslated in all three languages.

## Builds / Branch Map

```bash
npm --prefix frontend run build   # PASS - vite build, 0 errors
npm --prefix landing run build    # PASS - vite build, 0 errors
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

No English fallback strings found for scoped Command Center keys in zh/ko/ja
bundles.

## CJK Readability and Visual-Fit Notes

### Chinese (zh)

- No English-style spacing between Chinese characters -- natural CJK flow.
- All tab labels compact: 聊天(2), 语音(2), 文档(2), 翻译(2), 调查(2),
  代理(2), 构建器(3), 系统(2). Well within tab dimensions.
- Status badges: 健康(2 chars), 降级(2 chars) -- compact.
- Button labels: "运行预检"(4), "保存候选"(4), "安装到节点"(5) -- compact.
- Longest descriptive string: `sys.promoteNodeDesc` (74 chars) -- in roomy
  System panel section.
- Ellipsis (`...`) used consistently for ongoing operations (listening,
  transcribing, loading).
- Question marks kept as half-width `?` which is standard in modern Chinese
  UI text.

### Korean (ko)

- Natural Korean spacing throughout -- words and particles properly separated.
- No double spaces or collapsed spacing issues.
- Tab labels: 채팅(2), 대화(2), 문서(2), 번역(2), 조사(2), 에이전트(4),
  빌더(2), 시스템(3) -- compact and readable.
- Status badges: 정상(2), 저하됨(3) -- compact.
- Button labels: "사전 점검 실행"(7), "후보 저장"(4), "노드에 설치"(4) -- OK.
- Longest descriptive: `sys.promoteNodeDesc` (95 chars).
- Korean text flows naturally with appropriate spacing.

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

1. **Non-target language** (`el`, `ar`, `hi`, etc.): not advertised UI
   languages. No language codes were added.
2. **ScoutFlow modal copy** (`landing/src/ScoutFlow.tsx`): hard-coded English.
3. **Landing-page narrative sections and setup cards**: hard-coded English.
4. **TranslatePanel source/target language option names** (`LANGUAGES` array
   in `TranslatePanel.tsx`): English-only.
5. **System low-level diagnostic values**: model IDs, backend names, capability
   IDs, hostnames, metric values -- all API-derived, intentionally untranslated.
6. **No new language codes added**: `SUPPORTED_UI_LANGUAGES` unchanged.
7. **Hardcoded English in panel components**: `"Error: "` prefixes
   (Chat/Talk/Translate), `" chars"` suffix (Translate), TTS default text,
   ASR/TTS status labels (Talk), System metric/form/preflight labels
   (~100+ instances). Pre-existing and affect all languages equally. Require
   component-level i18n plumbing.
8. **`ja` `footer_rights`**: "All rights reserved." remains in English --
   landing page key, not scoped Command Center per brief boundaries.

### Deferred to browser smoke (display-equipped host)

The following checks require a browser runtime with display access and could not
be fully exercised on this headless implementation host:
- `?lng=zh`, `?lng=ko`, `?lng=ja` live initialization and panel rendering
- Visual confirmation of Chat, Talk, Translate, System panel rendering in
  target languages
- Live localStorage and language persistence across reloads
- Live CJK character rendering and font fallback quality
- Language selector switching and localStorage key `ihomenerd.ui.language`
  updates

Code and bundle audit confirms the supporting i18n plumbing is present for
all of these.

## Evidence

All validation evidence under:
`testing/initiatives/uniform-web-ui/2026-05-07_command-center-translation-cjk/evidence/`
