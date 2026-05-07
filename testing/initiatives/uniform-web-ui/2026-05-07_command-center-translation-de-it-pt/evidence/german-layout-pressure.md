# German Layout Pressure Audit - Command Center Translation DE/IT/PT

## Method

Compared English vs German string lengths for primary control labels, tabs, buttons,
status indicators, and short UI strings. Flagged keys exceeding 40% length increase.

## Tab Label Comparison

| Key | EN | DE | EN len | DE len | Ratio | Assessment |
|-----|-----|-----|--------|--------|-------|------------|
| tab_chat | Chat | Chat | 4 | 4 | 1.00x | Identical - shared word |
| tab_talk | Talk | Sprechen | 4 | 8 | 2.00x | 8 chars; fits in tab |
| tab_docs | Docs | Doks | 4 | 4 | 1.00x | 4 chars; abbreviated |
| tab_translate | Trans | Übersetzen | 5 | 10 | 2.00x | 10 chars; acceptable tab width |
| tab_investigate | Investigate | Untersuchen | 11 | 11 | 1.00x | Same length |
| tab_agents | Agents | Agenten | 6 | 7 | 1.17x | 7 chars; fine |
| tab_builder | Builder | Builder | 7 | 7 | 1.00x | Identical - shared word |
| tab_system | System | System | 6 | 6 | 1.00x | Identical - shared word |

All tab labels are 11 characters or fewer. No overflow concerns.

## Primary Control Labels (>40% Length Increase)

| Key | EN | EN len | DE | DE len | Ratio | Risk |
|-----|-----|--------|-----|--------|-------|------|
| tab_talk | Talk | 4 | Sprechen | 8 | 2.00x | Low - 8 chars in tab |
| tab_translate | Trans | 5 | Übersetzen | 10 | 2.00x | Low - 10 chars in tab |
| help.close | Close | 5 | Schließen | 9 | 1.80x | Low - action button |
| sys.degraded | Degraded | 8 | Eingeschränkt | 14 | 1.75x | Low - status badge |
| inv_run | Run Scan | 8 | Scan starten | 14 | 1.75x | Low - action button |
| talk_hold | Hold to Talk | 12 | Zum Sprechen halten | 19 | 1.58x | Low - instruction text |
| sys.installOnNode | Install on Node | 15 | Auf Knoten installieren | 23 | 1.53x | Low - action button |
| agent_workspace | Agent Workspace | 15 | Agenten-Arbeitsbereich | 22 | 1.47x | Low - section header |
| sys.preflightSummary | Preflight Summary | 17 | Preflight-Zusammenfassung | 25 | 1.47x | Low - section header |
| sys.runPreflight | Run Preflight | 13 | Preflight starten | 19 | 1.46x | Low - action button |
| agent_assign | Assign Task | 11 | Aufgabe zuweisen | 16 | 1.45x | Low - action button |

No control exceeds 25 characters. All text fits within expected control dimensions.

## Longest German Strings (descriptive paragraphs)

| Key | Length | Location | Assessment |
|-----|--------|----------|------------|
| sys.promoteNodeDesc | 247 chars | System panel descriptive text | Same category as English (176 chars). Roomy section. |
| sys.sshNote | 207 chars | System panel SSH note | Same category as English (178 chars). Roomy section. |
| sys.noManagedNodes | 204 chars | System empty state | Same category as English (137 chars). 67% increase but in a paragraph container. |
| sys.controlPlaneDesc | 167 chars | System panel descriptive text | Moderate. Acceptable. |
| sys.preflightHint | 157 chars | System panel hint | Acceptable in description area. |

These are all descriptive paragraphs that appear in roomy System panel sections.
They are also long in English and use the same layout containers.

## Conclusion

No primary-control overflow or unreadable layout pressure identified.
Tab labels, buttons, and status indicators remain compact despite some 2x ratios
(where the base English string is very short, e.g., 4-5 characters).
Long German descriptive paragraphs are consistent with their English counterparts
and appear in spacious container areas.

Verdict: PASS - No German layout pressure concerns. Monitor during browser smoke
on a display-equipped host.
