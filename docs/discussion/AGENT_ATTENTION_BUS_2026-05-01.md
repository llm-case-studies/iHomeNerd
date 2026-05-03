# Discussion: Agent Attention Bus for iHomeNerd

**Status:** discussion seed  
**Date:** 2026-05-01  
**Owner:** Alex  
**Source:** OpenCode + Kimi model-switch monitoring handoff  
**Related:** `docs/copilot-handoffs/2026-05-01_kimi_mlx-model-switch-crash.md`

---

## 1. Why this doc exists

The recent OpenCode + Kimi workflow exposed a communication failure that is
larger than one model or one TUI. The agent mixed reasoning, instructions for
the user, monitoring output, and status into one stream. A blocking request
for the user to switch a node could easily be missed if the user was not
actively reading every line.

That is not just a presentation problem. It is an attention-routing problem.

iHomeNerd already assumes a world with:
- multiple local nodes
- long-running local jobs
- humans who may step away from the screen
- agent handoffs between tools, models, and runtimes
- noisy operational output that should not bury important asks

This discussion proposes a small typed event layer for agent communication:
an **Agent Attention Bus**.

---

## 2. Problem statement

Most agent sessions flatten very different information into one transcript:

- conversational replies to the user
- status updates
- tool output
- monitoring logs
- findings
- questions
- approval requests
- handoff notes
- rationale summaries

That makes everything equally visible and equally easy to miss.

The failure mode is concrete:

> The agent needs the user to switch a node before monitoring can continue,
> but that request is buried under reasoning and log output. The agent waits,
> the user is not at the screen, and no supervisor or dashboard knows that the
> run is blocked.

The system needs to distinguish "FYI" from "blocking human action required"
at the protocol level, not only through markdown headings.

---

## 3. Proposal

Introduce a typed event protocol for agent and orchestration communication.
The first version can be tiny: an MCP server or local service accepts
structured events, persists them, and routes important ones to the right
surface.

The point is not to create a new chat UI. The point is to give agents a better
way to say what kind of attention they need.

Example event:

```json
{
  "type": "user_action_required",
  "task_id": "mlx-model-switch-monitoring",
  "urgency": "blocking",
  "title": "Switch active node",
  "instruction": "Switch monitoring to the iPhone node before the run can continue.",
  "requires_ack": true,
  "timeout_minutes": 20,
  "channels": ["opencode", "dashboard"],
  "fallback": "escalate_to_supervisor"
}
```

That event can be rendered in OpenCode, shown on a dashboard, sent to a
notification channel, or escalated to a supervisor agent. It does not depend
on a human reading a mixed transcript in real time.

---

## 4. Initial event types

### `status_update`

Progress and phase information. Non-blocking by default.

Examples:
- "downloading model"
- "waiting for first health probe"
- "running smoke test"

### `monitoring_event`

Noisy or source-tagged operational output. Collapsible by default.

Examples:
- process logs
- health probe samples
- device metrics
- retry traces

### `finding`

A meaningful observation that should survive beyond the transcript.

Fields should include severity, confidence, evidence, and source.

Examples:
- "Android node advertises by IP but not stable `.local` hostname"
- "memory after model switch resembles double-load footprint"
- "ASR loopback path works, transcript quality is poor"

### `user_action_required`

A human action that blocks progress until acknowledged or completed.

Examples:
- switch a node
- connect a phone
- trust a certificate
- start a local runtime

### `approval_required`

An explicit yes/no decision before the agent proceeds.

Examples:
- install dependency
- run a destructive cleanup
- send notification outside the local machine
- promote a node

### `artifact_update`

An output artifact was created or changed.

Examples:
- discussion doc
- test report
- screenshot bundle
- generated handoff

### `supervisor_escalation`

Ask another agent or human reviewer to inspect a blocked or risky state.

Examples:
- unresolved model behavior
- ambiguous test result
- repeated monitoring failure
- user unavailable after timeout

### `handoff`

Resumable state for another actor.

Examples:
- current task state
- completed steps
- next best action
- known risks

---

## 5. Routing metadata

Every event should carry enough metadata for routing without prose parsing:

- `task_id`
- `run_id`
- `type`
- `title`
- `summary`
- `source`
- `audience`: user, supervisor, dashboard, log only
- `urgency`: info, warning, blocking, emergency
- `requires_ack`
- `timeout_minutes`
- `fallback`
- `dedupe_key`
- `evidence`
- `created_at`

The schema should be opinionated. Vague buckets like "thoughts" and "BTW" are
likely to blur together. The model should have to choose whether a message is
status, a finding, an action request, or an approval gate.

---

## 6. What this is not

This is not a proposal to stream raw hidden reasoning into a pane.

The useful public artifacts are:
- rationale summaries
- assumptions
- uncertainty
- decisions made
- evidence
- what action is needed next

Those are much more useful to a human or supervisor than an unfiltered inner
monologue, and they are safer to route into dashboards or notifications.

This is also not primarily a TUI project. A better OpenCode renderer would be
welcome, but the higher-leverage primitive is structured events first and
renderers second.

---

## 7. iHomeNerd fit

iHomeNerd is a good home for the general version because it already has local
orchestration pressure:

- multi-node control plane
- node promotion and lifecycle work
- local capability routing
- browser extension event paths
- trust and certificate flows
- mobile nodes that may require human interaction
- long-running local jobs like investigation, indexing, and future dedupe scans

The bus could become the local household coordination layer for:
- "this node needs attention"
- "this run is waiting on a phone"
- "this finding matters"
- "this operation needs approval"
- "this job can be resumed by another model"

---

## 8. BugWitness fit later

BugWitness should probably receive the more specific version after one or two
iHomeNerd discussion rounds.

BugWitness-specific extensions could include:
- repro evidence events
- browser/session artifacts
- failing-check diagnostics
- issue/PR linkage
- severity and confidence tuned for bug triage
- supervisor-agent review queues
- dashboards for active investigations
- notification policies for blocked investigations

In other words: iHomeNerd can define the general attention bus; BugWitness can
turn it into a sharper bug-investigation instrument.

---

## 9. MVP sketch

Start with a local MCP server or lightweight HTTP service that exposes:

1. `emit_status`
2. `emit_log`
3. `emit_finding`
4. `request_user_action`
5. `request_approval`
6. `escalate_to_supervisor`

MVP behavior:
- write every event to local JSONL
- expose a simple current-run view
- make `request_user_action` and `request_approval` interruptive
- support acknowledgement
- support timeout metadata
- avoid SMS/email/phone until routing policy is explicit

The first fixture should be the OpenCode + Kimi failure mode:

> A model-switch monitoring run requires the user to switch nodes. The request
> must appear as a blocking acknowledged event, not as a paragraph inside the
> transcript.

---

## 10. Panel discussion prompts

### Agent UX

What should be visible in the main conversation, what should be collapsed,
and what must interrupt the user?

### Orchestration

Is the event schema sufficient for dashboards, supervisor agents, and
resumable handoffs?

### Model behavior

Will Kimi, Qwen, Claude, Gemini, and local models reliably choose the right
event tools if the schema is opinionated enough?

### OpenCode / IDE integration

Which parts belong upstream in OC as panel rendering, and which belong in an
external MCP/event service?

### Privacy and safety

Which event fields are safe for email, SMS, or phone notification, and which
must remain local-only?

### iHomeNerd product fit

Should this become a generic local event bus for household AI jobs, or remain
agent-session infrastructure?

### BugWitness future fit

What extra fields would bug investigation need: evidence IDs, repro steps,
browser artifacts, CI links, severity, confidence, issue references?

---

## 11. Open questions

- Should the first implementation be MCP-only, HTTP-only, or both?
- Should events be stored in iHomeNerd persistence from the start, or plain
  JSONL until the schema settles?
- Should notification routing live in the bus, or should the bus emit to a
  separate notifier?
- How much dashboard work is enough for a useful first demo?
- Can the browser extension eventually route local notifications from the bus?
- What is the right acknowledgement model for "user did the thing" versus
  "user saw the request"?
- How should supervisor-agent escalation avoid creating another noisy stream?

---

## 12. Suggested next step

Run one discussion round on the event taxonomy and routing policy before
writing code.

If the shape still feels right, draft a second document:

`BugWitness Agent Attention Bus Extensions`

That follow-up should be more concrete about bug-investigation evidence,
finding lifecycle, supervisor queues, and notification escalation.
