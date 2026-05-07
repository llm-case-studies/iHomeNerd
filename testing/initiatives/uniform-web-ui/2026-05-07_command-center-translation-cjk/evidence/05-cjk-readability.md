# CJK Readability and Visual-Fit Audit

## Chinese (zh)

- **Spacing**: No English-style spacing between Chinese characters. Natural CJK flow. Full-width Chinese punctuation used (。，：).
- **Tab labels**: 聊天(2), 语音(2), 文档(2), 翻译(2), 调查(2), 代理(2), 构建器(3), 系统(2) - all compact (2-3 chars).
- **Status badges**: 健康(2), 降级(2), 在线(2) - compact, well within badge dimensions.
- **Button labels**: "运行预检"(4), "保存候选"(4), "安装到节点"(5) - compact action buttons.
- **Descriptive strings**: `sys.promoteNodeDesc` at 74 chars - fits in roomy System panel sections.
- **Punctuation**: Ellipsis (`...`) used for ongoing ops; Chinese punctuation (，。) used in sentences; half-width `?` which is standard modern Chinese UI convention.
- **Technical tokens**: `iHomeNerd`, `Nerd`, `ASR`, `TTS`, `SSH`, `Docker`, `Ollama`, `launchd`, `mac-mini`, `iMac` preserved untranslated.
- **Visual density**: No overflow, no awkward wrapping concerns. Tab dimensions adequate.

## Korean (ko)

- **Spacing**: Natural Korean spacing throughout - words and particles properly separated with standard Korean spacing conventions. No double spaces or collapsed spacing.
- **Tab labels**: 채팅(2), 대화(2), 문서(2), 번역(2), 조사(2), 에이전트(4), 빌더(2), 시스템(3) - compact and readable. "에이전트" is the longest at 4 chars.
- **Status badges**: 정상(2), 저하됨(3), 온라인(3) - compact.
- **Button labels**: "사전 점검 실행"(7), "후보 저장"(4), "노드에 설치"(5) - acceptable for Korean word lengths.
- **Descriptive strings**: `sys.promoteNodeDesc` at 95 chars. Korean naturally produces longer strings due to grammatical particles, but still fits in descriptive panel sections.
- **Punctuation**: Korean punctuation used appropriately. Ellipsis pattern preserved.
- **readability**: Natural Korean flow with appropriate spacing. Words and grammar particles are correctly separated per Korean orthography.

## Japanese (ja)

- **Spacing**: No English-style spacing between Japanese characters/morphemes. Uses native punctuation (。、,). Half-width spaces used appropriately between katakana loan words and kanji for readability.
- **Tab labels**: チャット(4), トーク(3), ドキュメント(6), 翻訳(2), 調査(2), エージェント(6), ビルダー(4), システム(4). Longer katakana tabs (ドキュメント, エージェント) at 6 chars but still within tab dimensions. No overflow.
- **Status badges**: 正常(2), 低下(2), オンライン(5) - compact.
- **Button labels**: "プリフライトの実行"(8), "候補を保存"(5), "ノードにインストール"(8) - longer due to katakana, but acceptable for action buttons.
- **Descriptive strings**: `sys.promoteNodeDesc` at 104 chars - longer than English (~30% more) due to polite/formal grammatical forms, but fits in System panel descriptive sections.
- **Katakana usage**: Technical loanwords use katakana naturally (チャット, ノード, ランタイム, コントロールプレーン).
- **Known issue**: `ja.footer_rights` is still English ("All rights reserved.") - pre-existing, landing page key, not scoped Command Center per brief boundaries.

## Overall Visual-Fit Verdict

No primary-control overflow or critical layout pressure identified. Tab labels, status badges, and action buttons remain compact across all three CJK languages. Descriptive strings are naturally longer than English (Japanese ~10-30% longer due to grammatical forms) but appear in roomy sections where wrapping is expected. No English fallback strings found for scoped Command Center keys.

## Chinese/Korean Punctuation Notes

- Korean uses `(으)로` pattern in `talk.recognizedWith` ("{{language}}(으)로 인식됨") - this is correct Korean grammar for the subject marker that varies by batchim (final consonant). The placeholder `{{language}}` precedes it, and i18next will interpolate the language name. This is a minor edge case: the `(으)` variation depends on the interpolated value's ending, which can't be fully handled at the template level. Noted as a grammatical best-effort, not a bug.

## Result: PASS (with noted ja footer_rights gap)
