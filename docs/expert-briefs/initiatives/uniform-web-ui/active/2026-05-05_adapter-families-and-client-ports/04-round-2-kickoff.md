# Round 2 Kickoff — Adapter Families and Client Ports

## Context

You are participating in Round 2 of a discussion sprint about **adapter
families and client ports** for the iHN platform. This builds on the completed
client surface boundary review (2 rounds, 7 reviewers) and the Round 1 adapter
families discussion (9 reviewers).

**Read before responding:**

1. `round-1-synthesis.md` — orchestrator synthesis of all 9 Round 1 responses
2. All Round 1 responses in `responses/` — read the other reviewers' work
3. `01-seed.md` — the original framing (for reference)

**Key decisions already made (do not re-litigate):**
- Core surface: ~16-20 route families, Tier 0/1
- Plugin namespace: `/v1/plugins/{plugin_id}/...`
- ASR/TTS/voices are core (being extracted to `domains/speech.py`)
- iHN is a general local AI platform (iOfficeNerd = commercial deployment)

## Your task for Round 2

Read the synthesis and the other reviewers' responses, then address these
**7 specific tensions** that Round 1 left unresolved:

### Tension 1: Is Monitoring/triage a real adapter family?
Round 1 split 5/4. The "no" camp says it's app-level orchestration of existing
primitives (vision + chat + rules). The "yes" camp says the structural pattern
(watch → detect → prioritize → route) is shared. **Pick a side and say why.**

### Tension 2: Should Planning/recommendation be dropped as a family?
Round 1 leaned 6/3 toward dropping. Most say it's chat + structured output +
domain rules — a client-side composition, not a server-side family. **Agree
or disagree?**

### Tension 3: Should Data/external connectors be the 7th family?
DeepSeek proposed this. 6 portfolio products need external connectors (legal
databases, medical APIs, threat feeds). Without a family, each client builds
its own bridges. **Is this a real family or a client-side concern?**

### Tension 4: Provider adapters — iHN-only or multi-provider client?
Model A (iHN as sole provider, node does backend switching) vs Model B
(client-side multi-provider ports with direct cloud connections). Gemini argues
Model B breaks privacy promises. DeepSeek says design for both but start with
Model A. **Which model should be the primary architecture?**

### Tension 5: Should "1 family = 1 plugin_id" be the mapping rule?
GLM proposed: one adapter family = one plugin pack = one plugin_id in the
namespace. This makes the relationship explicit and machine-checkable.
**Accept, modify, or reject?**

### Tension 6: When should client-mirror discussions start?
DeepSeek says wait — prototype capability ports in the Command Center first,
then mirror with a working reference. Kimi says start PronunCo mirror in
parallel. **Sequential or parallel?**

### Tension 7: Is policy/orchestration a separate layer or part of app core?
7/9 say separate layer. GLM says collapsing it avoids "weird indirection" on
mobile. All agree it belongs client-side. **Separate layer or not?**

## Response format

For each tension, state your position clearly. Then add:
- Any new insight from reading other reviewers' work
- One or two open questions you think should survive into the coding sprints

## Rules

- This is a discussion-only sprint — no coding, no testing
- You may change your Round 1 position based on what you read
- Be specific. Avoid "it depends" without saying what it depends on.

**Save your response to a file.** Use this exact path:

```
docs/expert-briefs/initiatives/uniform-web-ui/active/2026-05-05_adapter-families-and-client-ports/responses/<your-model-name>-round-2.md
```

For example: `responses/deepseek-round-2.md`, `responses/grok-round-2.md`.

Do not skip this step. Feedback that only exists in chat history is lost.
