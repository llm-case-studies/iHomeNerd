# Command Center Translation CJK

## Goal

Add reviewed first-pass Chinese, Korean, and Japanese translations for the
scoped Command Center keys that still fall back to English.

This completes the current Command Center language resource pass for all ten
advertised UI languages.

## Why This Sprint Exists

The previous localization waves covered:

```text
es, fr, ru, de, it, pt
```

The remaining UI languages are:

```text
zh, ko, ja
```

This group deserves its own sprint because CJK translation has different visual
and linguistic risks: no word spaces in Chinese/Japanese, compact but dense
strings, script-specific punctuation, and line-breaking behavior that should be
checked in the actual Command Center layout.
