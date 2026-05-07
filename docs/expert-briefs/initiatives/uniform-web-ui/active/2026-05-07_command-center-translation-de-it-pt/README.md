# Command Center Translation DE/IT/PT

## Goal

Add reviewed first-pass German, Italian, and Portuguese translations for the
same scoped Command Center keys that Spanish, French, and Russian now cover.

This is the second localization wave for the shared Command Center surface. It
keeps the proven sprint shape: no language plumbing changes, no backend work,
and no broad landing/ScoutFlow localization.

## Why This Sprint Exists

The `es` / `fr` / `ru` pilot proved the workflow: key coverage audit,
placeholder preservation, plural-form checks, build evidence, and language-role
separation.

The next useful group is:

```text
de, it, pt
```

German is a layout stress test because labels tend to run longer. Italian and
Portuguese round out the remaining Latin-script UI languages before a separate
CJK-focused pass for `zh`, `ko`, and `ja`.
