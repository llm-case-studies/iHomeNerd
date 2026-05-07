# Key Coverage Audit

## Frontend i18n.ts

All 10 languages have 185 keys with 100% parity:

| Language | Keys | Missing from en | Parity |
|----------|------|-----------------|--------|
| en       | 185  | 0               | baseline |
| zh       | 185  | 0               | PASS |
| ko       | 185  | 0               | PASS |
| ja       | 185  | 0               | PASS |
| es       | 185  | 0               | PASS |
| fr       | 185  | 0               | PASS |
| ru       | 185  | 0               | PASS |
| de       | 185  | 0               | PASS |
| it       | 185  | 0               | PASS |
| pt       | 185  | 0               | PASS |

## Landing i18n.ts

Same coverage: 185 keys per language, 0 missing from English, 0 discrepancies between frontend and landing English key sets.

## CJK Coverage Detail

- **zh**: 185 keys (previously 111, +74 added)
- **ko**: 185 keys (previously 111, +74 added)
- **ja**: 185 keys (previously 111, +74 added)

All 74 previously-fallback Command Center keys now have translations in all three CJK languages.

## Frontend vs Landing Alignment

- 185 common English keys, 0 frontend-only, 0 landing-only
- zh: 185 keys in both, 2 intentional value differences (landing uses "Live Image" variant for nav_open_cc, hero_btn_launch)
- ko: 185 keys in both, 2 intentional value differences
- ja: 185 keys in both, 2 intentional value differences

The 2 value differences are expected: landing has localized navigation paths (e.g., "Try Live Image" / "Download Live Image") while frontend uses Command Center terminology. All scoped Command Center keys match identically.

## Result: PASS
