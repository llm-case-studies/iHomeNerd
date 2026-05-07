# Key Coverage Audit - Command Center Translation DE/IT/PT

## Scope

- Frontend: `frontend/src/lib/i18n.ts`
- Landing: `landing/src/i18n.ts`
- Target languages: de, it, pt

## Frontend i18n Key Counts

| Language | Keys | Missing from en | Extra beyond en | Status |
|----------|------|----------------|-----------------|--------|
| en       | 185  | -              | -               | baseline |
| de       | 185  | 0              | 0               | PASS |
| it       | 185  | 0              | 0               | PASS |
| pt       | 185  | 0              | 0               | PASS |

All three target languages have full 185-key parity with English.
Zero scoped Command Center keys are missing.

## Landing i18n Key Counts

| Language | Keys | Missing from en | Extra beyond en | Status |
|----------|------|----------------|-----------------|--------|
| en       | 185  | -              | -               | baseline |
| de       | 185  | 0              | 0               | PASS |
| it       | 185  | 0              | 0               | PASS |
| pt       | 185  | 0              | 0               | PASS |

Landing i18n is fully aligned with frontend i18n (same 185 keys, no discrepancies).

## Namespace Coverage

The following namespaces are covered with full de/it/pt translations:

- `chat.*` - 5 keys (greeting, placeholder, capabilityInfo, notInstalled, notAvailablePlaceholder, errorMessage)
- `talk.*` - 23 keys (listening, transcribing, recognizedWith, voiceLabel, micPrompt, etc., including _one/_other plural pairs)
- `trans.*` - 8 keys (placeholder, willAppear, notAvailable, translating, copyTitle, notInstalledHint, routeLabel)
- `sys.*` - 33 keys (loading, healthy, degraded, activeModels, activeSessions, freeStorage, uptime, nodeLoad, nodeLoadDesc, lastChatRun, lastAsrRun, lastTtsRun, homeNodes, controlPlane, controlPlaneDesc, promoteNode, promoteNodeDesc, sshNote, preflightSummary, preflightHint, managedNodes, noManagedNodes, runPreflight, saveCandidate, installOnNode, checking, saving, installing, capabilityRegistry, connectedApps, noPlugins, gatewayDesc, nodesCount_one/other)
- `help.*` - 11 keys (title, close, videoTitle, videoPlaceholder, tabsTitle, tabs.chat, tabs.talk, tabs.docs, tabs.translate, tabs.investigate, tabs.agents, tabs.builder, tabs.system)
- `tab_*` - 8 keys (chat, talk, docs, translate, investigate, agents, builder, system)
- `docs_*` - 6 keys (title, copilot, desc, empty, placeholder)
- `inv_*` - 3 keys (title, desc, run)
- `agent_*` - 4 keys (title, desc, workspace, assign)
- `build_*` - 3 keys (title, desc, btn)
- `app_title`, `status_online` - 2 keys

Verdict: PASS
