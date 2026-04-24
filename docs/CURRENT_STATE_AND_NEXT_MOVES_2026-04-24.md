# iHomeNerd Current State And Next Moves

**Status:** working draft  
**Date:** 2026-04-24  
**Owner:** Alex

---

## 1. Why this doc exists

The project has moved from "single local AI box" toward:
- one gateway / control plane
- multiple optional nodes
- multiple install and trust paths

That is good progress, but it also means the current live environment can be misleading when different nodes are running different iHN revisions or different runtime styles.

This document records:
- what is working today
- what is partially working but still misleading
- the highest-priority next moves

See also:
- `docs/NODES_CONTROL_PLANE_SPEC_2026-04-23.md`
- `docs/HOST_ASSIST_VISION_2026-04-24.md`
- `docs/MOBILE_STRATEGY_2026-04-24.md`

---

## 2. What is working today

### 2.1 Core product shape

iHomeNerd is already functioning as:
- a local HTTPS command center
- a capability-routed local AI stack
- a LAN-discoverable node
- a first gateway / control-plane prototype

The current stack already covers more than "one LLM":
- chat
- translation
- docs / RAG
- speech-related capabilities
- image analysis hooks
- Local Radar / Investigate
- managed-node preflight and lifecycle work

### 2.2 Try-now path

The current honest first-run path is:
- Linux node with SSH already working
- Docker install
- browser access from another machine on the LAN

That path has been validated on real home hardware.

### 2.3 Control plane

The gateway can now:
- inventory cluster nodes
- suggest node roles from hardware and capabilities
- run SSH preflight on candidate nodes
- register candidates
- promote Linux nodes
- promote macOS nodes in code via a launchd-based path
- start / stop / restart managed runtimes
- check split update lanes in the UI model

### 2.4 Real node fit is becoming visible

The home cluster model is now grounded enough to talk about real roles:
- gateway / control plane
- GPU worker
- light specialist
- future Coral / edge specialist

### 2.5 Remote hardware-compat behavior

The misleading "every target shows MSI's RTX" behavior has been fixed.

Current behavior:
- local node scan -> local real hardware probe
- remote iHN node scan -> uses that remote node's own `/discover` telemetry
- plain LAN device -> explicitly says remote hardware inspection is not available yet

That is less magical, but much more honest.

---

## 3. What is partially working but still unstable

### 3.1 Deployment consistency across nodes

This is the biggest operational issue right now.

Different nodes may be running:
- different commits
- different runtime styles
- different update histories
- different local changes

In practice, that makes bug triage confusing:
- some issues are old code
- some are current code
- some are stale frontend assets
- some are runtime/environment differences

Until node rollout is more consistent, system behavior will feel less deterministic than it really is.

### 3.2 Node naming on Dockerized nodes

Dockerized nodes can lose useful LAN name resolution for non-iHN devices.

Observed behavior:
- host-process nodes can resolve `.local` names more reliably
- Dockerized nodes often fall back to `Device (IP)`

Root cause:
- the container cannot reliably use the host's mDNS / Avahi context
- so device enrichment inside the container is weaker than on the host

This is not a model problem. It is an environment / host-assist problem.

### 3.3 Remote hardware inspection

Current remote hardware scan behavior is intentionally conservative.

Supported:
- scan local node directly
- summarize another node already running iHN

Not yet supported:
- true remote hardware probe for a plain LAN device before iHN is installed

That means Macs, Windows machines, and mystery devices still need:
- Gateway Control preflight
- or later a proper host-assisted remote hardware probe

### 3.4 Gateway SSH assumptions

The control plane uses the gateway's SSH identity, not the operator laptop's.

That means:
- your laptop might be able to SSH to a target
- while the gateway cannot

Current UI now warns about this, but the product still needs an operator-friendly fix path.

### 3.5 Home CA / trust is not operationally solid yet

Architecturally, the target is correct:
- one Home CA per household
- per-node server certs signed by that Home CA

Code support exists for shared CA reuse and import.

But operationally, trust still feels fragile:
- users can still hit repeated browser "Advanced" flows
- CA reuse across nodes is not yet visible enough in the UI
- there is no clear "trust health" surface
- there is no household CA fingerprint / chain status page
- reinstall / rebuild flows can still make trust feel inconsistent even when the underlying CA model is correct

The HP observation is the right warning sign:
- the product intent is "trust once per household"
- the lived experience can still degrade back into "trust per node again"

That gap needs product-level attention, not just certificate-generation code.

---

## 4. The current CA / cert truth

### 4.1 Desired trust model

The intended trust model is:
- one Home CA for the home
- trusted once on each user device
- each node gets a server cert signed by that Home CA
- node IP / hostname changes should require server-cert refresh only, not CA re-trust

### 4.2 Current code direction

The code already supports:
- CA generation
- server cert generation with LAN IP and hostnames
- shared CA reuse / import
- Apple trust profile download
- trust test endpoint

### 4.3 What is missing

The missing piece is not basic crypto. It is control-plane visibility and recovery.

The gateway should be able to answer:
- Which Home CA is active for this household?
- What is its fingerprint?
- Which nodes are using it?
- Which nodes are serving certs signed by it?
- Which user devices have successfully validated it recently?
- Did a node fall back to another CA or regenerate unexpectedly?

### 4.4 Next trust deliverables

The next trust-focused features should be:
- Home CA fingerprint and active-household trust card in System
- per-node cert chain status
- "this node matches the household Home CA" indicator
- explicit stale / mismatched / unknown trust states
- browser/device trust verification results
- cleaner recovery flow when trust is missing

---

## 5. Highest-priority next moves

### 5.1 Stabilize rollouts

Before adding too much more behavior, reduce node drift.

Needed:
- versioned release path
- predictable update channel
- same code path across gateway and workers
- less ad-hoc file copying
- more "update this node to this revision" behavior

### 5.2 Build host-assist

Host-assist is now justified by real failures, not theory.

Top host-assist jobs:
- host LAN name cache for Dockerized nodes
- Home CA / trust health
- SSH Doctor and key bootstrap
- OS / runtime update checks
- hardware and device inventory that containers cannot see cleanly

### 5.3 Add SSH Doctor

The gateway should not just say "preflight failed."

It should diagnose:
- port closed
- timeout
- auth denied
- host key mismatch
- remote login disabled
- missing OpenSSH server
- missing gateway key trust

And it should offer concrete recovery steps per OS.

### 5.4 Make remote probes honest and useful

Remote probes should move from:
- fake certainty

to:
- real telemetry when available
- explicit limitations when not
- guided escalation into SSH preflight when needed

### 5.5 Make trust feel household-level

This is both a product and operations priority.

The user should feel:
- "I trusted my home"

not:
- "I keep clicking through cert warnings on random nodes"

### 5.6 Kick off mobile as a control surface, not a second brain

Native mobile should begin as:
- scout
- controller
- trust / pairing helper
- notifications / monitoring surface

not as:
- the place where heavy local inference runs

---

## 6. Practical recommended order

1. Release consistency and version visibility across nodes.
2. Host-assist for LAN naming and trust health.
3. SSH Doctor and key-bootstrap flow.
4. Host-assisted remote hardware preflight for non-iHN devices.
5. Native mobile v1 as a household controller.

---

## 7. Bottom line

The project is past the "toy local dashboard" stage.

The next set of problems are not mostly model problems. They are:
- trust
- deployment consistency
- host integration
- cluster operations
- user-facing recovery flows

That is a good sign. It means the architecture is now colliding with real home-systems concerns.
