# Sprint Pack: Adapter Families and Client Ports

**Sprint type:** discussion-only  
**Initiative:** `uniform-web-ui`  
**Date:** 2026-05-05

This sprint exists because the first boundary review did useful pruning, but it
still leaned too heavily on named client apps such as `PronunCo`.

The next question is more architectural:

> Should iHN be organized primarily around client identities, or around
> recurring need categories and adapter families that many clients can share?

The intended outcome is not a finished doctrine. The intended outcome is a
stronger draft that separates:

- server-side adapter families hosted close to iHN
- client-side app cores and capability ports
- provider/storage adapters inside client apps

Files:

- `01-seed.md` - framing, hypotheses, and concrete questions
- `02-feedback-template.md` - structured response guide
- `03-kickoff-prompt.md` - reusable panel kickoff note

## Participant expectations

Contributors should:

- read `01-seed.md` first
- preserve the good boundary decisions from the first discussion sprint
- challenge whether client names are the right architecture unit
- propose 5-7 reusable adapter families rather than 20 app-specific helpers
- distinguish server-side adapters from client-side adapters explicitly

Contributors should **not**:

- restart the entire core/plugin/app-owned debate from zero
- collapse provider adapters and app workflow into one layer
- assume every client deserves its own node-side namespace
- jump into code proposals unless a small code sketch clarifies a boundary

## Expected deliverables

Each participant should ideally leave:

1. one completed response using `02-feedback-template.md`, or equivalent
2. one proposed server-side adapter-family map
3. one proposed client-side app-core/port/adapter map
4. one or two open tensions worth preserving for the next coding sprints

Exit condition:

- we have a stable-enough draft of adapter families and client-side port model
- we know which client repos should host the first mirror discussions
- we can cut later coding/testing sprints with less risk of client-name
  overfitting
