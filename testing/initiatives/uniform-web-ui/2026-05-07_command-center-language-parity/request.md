# Test Request - Command Center Language Parity

**Date issued:** 2026-05-07
**Initiative:** `uniform-web-ui`
**Sprint:** `2026-05-07_command-center-language-parity`
**Target branch:** `feature/uniform-web-ui/command-center-language-parity`
**Validator branch:** `validation/uniform-web-ui/command-center-language-parity`
**Validator host:** `iMac-Debian`
**Runtime host:** any host that can run the Vite frontend and landing apps

## What You Are Validating

Validate that landing and Command Center now have coherent UI-language behavior:

1. both apps expose the same supported language options
2. `?lng=<code>` initializes UI language
3. selected language persists across reloads
4. landing can pass language into Command Center
5. `document.documentElement.lang` matches the selected UI language
6. visible Command Center shell and primary panel strings are no longer mostly
   hard-coded English
7. chat/Talk/Translate language roles remain distinct and do not regress

## Product Commit Under Test

Record:

```bash
git rev-parse HEAD
```

from the product branch under test.

## Required Checks

Run:

```bash
npm --prefix frontend run build
npm --prefix landing run build
python3 tools/branch-map/branch_map.py --repo . --base origin/main
```

If `npm` dependencies are unavailable, record the exact blocker rather than
inventing a result.

## UI Smoke

Smoke both apps in a browser or equivalent automated harness.

Minimum probes:

1. Open landing with `?lng=es`.
2. Confirm the language selector shows Spanish.
3. Confirm `document.documentElement.lang` is `es`.
4. Change to another language, for example `fr`.
5. Confirm local storage key records the new language.
6. Open Command Center from landing, or manually open it with the same `?lng=fr`.
7. Confirm Command Center initializes in that language.
8. Confirm app shell tabs and primary labels change language.
9. Reload Command Center and confirm the language persists.
10. Open Chat and confirm a message still sends with the selected language value.
11. Open Talk and confirm ASR/TTS controls still use BCP-47 language tags.
12. Open Translate and confirm source/target translation controls are not
    confused with the UI locale.

## Hard-Coded English Audit

Record any high-visibility English strings still present in Command Center.

Do not fail for low-level diagnostic labels such as model IDs, backend names,
capability IDs, hostnames, or metric names if the implementation result marks
them out of scope. Do fail if the main shell, tabs, Translate primary controls,
Talk primary controls, or top-level empty/error states remain obviously
English-only.

## Save Evidence

Save:

- build logs
- BranchMap output summary
- screenshots or text notes for `?lng=` initialization
- local storage / document lang evidence
- Command Center language selector evidence
- brief hard-coded English audit

under:

```text
testing/initiatives/uniform-web-ui/2026-05-07_command-center-language-parity/evidence/
```

## Result

Write findings to:

```text
testing/initiatives/uniform-web-ui/2026-05-07_command-center-language-parity/result.md
```

Include:

- pass/fail verdict
- product commit under test
- commands run
- language codes tested
- persistence/handoff result
- remaining English-only gaps
- any behavioral regression in Chat, Talk, or Translate
