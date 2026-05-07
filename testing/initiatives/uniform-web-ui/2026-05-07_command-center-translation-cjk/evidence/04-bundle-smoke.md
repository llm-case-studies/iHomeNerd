# Bundle Smoke Verification

Built JS bundles audited for CJK translations in minified output.

## Frontend Bundle (`backend/app/static/assets/index-Cx_OzpLy.js` - 635 KB)

### zh Primary Strings
| Key | Status |
|-----|--------|
| chat.greeting: "你好！我是 iHomeNerd..." | FOUND |
| talk.listening: "正在聆听..." | FOUND |
| talk.transcribing: "本地转录中..." | FOUND |
| trans.translating: "翻译中..." | FOUND |
| sys.loading: "正在加载系统状态..." | FOUND |
| sys.healthy: "健康" | FOUND |
| sys.degraded: "降级" | FOUND |

### ko Primary Strings
| Key | Status |
|-----|--------|
| chat.greeting: "안녕하세요! 저는 iHomeNerd..." | FOUND |
| talk.listening: "듣고 있습니다..." | FOUND |
| talk.transcribing: "로컬로 변환 중..." | FOUND |
| trans.translating: "번역 중..." | FOUND |
| sys.loading: "시스템 상태 로딩 중..." | FOUND |
| sys.healthy: "정상" | FOUND |
| sys.degraded: "저하됨" | FOUND |

### ja Primary Strings
| Key | Status |
|-----|--------|
| chat.greeting: "こんにちは！私は iHomeNerd..." | FOUND |
| talk.listening: "聞いています..." | FOUND |
| talk.transcribing: "ローカルで書き起こし中..." | FOUND |
| trans.translating: "翻訳中..." | FOUND |
| sys.loading: "システムステータスを読み込み中..." | FOUND |
| sys.healthy: "正常" | FOUND |
| sys.degraded: "低下" | FOUND |

## Landing Bundle (`landing/dist/assets/index-D3jq6cgS.js` - 389 KB)

All same primary strings verified present in landing bundle as well.

## English Fallback Check

English originals (`Hello! I am iHomeNerd`, `Listening...`, etc.) each appear exactly 1x in the frontend bundle - this is the `en` language resource, not a CJK fallback. Since all 185 keys have translations in every language, i18next will select the appropriate language resource and no scoped key will fall back to English.

## Result: PASS
