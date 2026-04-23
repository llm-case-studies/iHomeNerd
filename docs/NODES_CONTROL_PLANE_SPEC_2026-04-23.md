# iHomeNerd Nodes & Control Plane Spec

**Status:** draft  
**Date:** 2026-04-23  
**Owner:** Alex

---

## 1. Why this exists

iHomeNerd should not stop at "one local AI box."

In a real home, the better shape is:
- one always-on **gateway / control plane**
- zero or more **worker nodes**
- different hardware doing different jobs well

The gateway is still the stable entry point for apps and users, but it should also become the operational control surface for the home cluster.

---

## 2. Terminology

### 2.1 Gateway / Control Plane

The gateway is the node users and apps connect to first.

It should own:
- routing and capability discovery
- Home CA trust and node identity
- update checks
- install / promote flows
- node inventory and health
- managed node actions

It does **not** need to be the strongest machine.

Preferred traits:
- always on
- low drama
- stable network identity
- enough CPU/RAM for docs, routing, automation, and background tasks

### 2.2 Worker Node

A worker node is any machine that contributes hardware or services to the home cluster.

Examples:
- GPU worker for chat, code, and multimodal work
- Coral / edge node for low-latency vision loops
- CPU specialist for OCR, indexing, wake-word, translation, or automation

### 2.3 Managed Node

A managed node is a node the gateway can operate directly using a known control channel.

Minimum managed-node requirements:
- reachable over SSH or equivalent remote transport
- known runtime model (`docker compose`, `systemd`, or both)
- Home CA and node identity installed
- explicit operator consent

---

## 3. Core UX

The current **System** view should grow a first-class **Home Nodes** section.

Each node card should show:
- hostname and IP
- gateway vs worker role
- hardware summary: RAM, GPU, accelerator
- installed models
- recommended default fit
- strengths
- managed vs unmanaged state
- update state

Potential nodes that are not yet running iHomeNerd should continue to appear in **Investigate** until promoted.

---

## 4. Model-fit table

Users need an opinionated answer to "what should run where?"

The control plane should present a table like this:

| Node Type | Best For | Typical Models / Services | Avoid by Default |
|---|---|---|---|
| Gateway / Control Plane | routing, docs, automation, trust, updates | `gemma3:1b`, `llama3.2:1b`, embeddings, OCR, background tools | large interactive chat/code workloads |
| GPU Worker | chat, code, multimodal, image-heavy tasks | `gemma4:e4b`, `gemma3:12b`, `llama3:8b`, `codellama:13b` | idle always-on orchestration if another node can stay up |
| Light Specialist | speech, translation, OCR, simple automations | `gemma3:1b`, `llama3.2:1b`, Whisper/TTS, small vision or OCR helpers | 4B+ defaults on weak hardware |
| Coral / Edge Vision | camera loops, detection, event triggers | detector stack, edge routing, small captioning helpers | large local chat and multi-user interactive workloads |

Important product truth:
- small specialized models are often the right default
- "bigger" is not automatically "better"
- default placement should optimize for reliability, responsiveness, and task fit

---

## 5. Update checks

The gateway should provide Cockpit-like visibility, but split updates into separate lanes.

### 5.1 System updates

Per managed node:
- OS packages pending
- security updates available
- reboot required or not
- Docker / NVIDIA runtime version drift
- disk pressure and storage alerts

### 5.2 iHomeNerd updates

Per managed node:
- current iHN version / commit / image tag
- newer version available
- release channel (`stable`, `preview`, `dev`)
- breaking changes / migration warnings

### 5.3 UX rule

Checking for updates should be cheap and safe.

Applying updates should always be explicit:
- `Check`
- `Review`
- `Apply`
- `Restart service`

Do not blur "system package updates" and "iHN app updates" into one button.

---

## 6. Promote-to-Node flow

If the gateway discovers a Linux machine on the LAN and the operator has SSH access, the UI should support:

**Investigate -> Promote to Node**

### 6.1 Preflight

Run from the gateway:
- SSH reachability
- OS detection
- Docker availability or installability
- GPU / Coral / RAM / disk probe
- Home CA trust plan
- risk check: is this machine already in use?

### 6.2 Operator choices

Before install:
- role suggestion
- recommended model pack
- storage footprint estimate
- CPU-only vs GPU mode
- managed runtime type (`docker compose` vs `systemd`)

### 6.3 Install

The gateway should be able to:
- copy bootstrap bundle
- copy or reference Home CA
- install or update iHN runtime
- start service
- verify health and trust
- register node with the gateway

### 6.4 Post-install

The new node should appear in **Home Nodes** with:
- hardware summary
- capabilities
- recommended fit
- managed state

---

## 7. Managed start / stop

Yes, the gateway should do this, but only for **managed nodes**.

That makes it more than a gateway. The right term becomes:

> **home control plane**

### 7.1 Safe scope

Supported first:
- start iHN service
- stop iHN service
- restart iHN service
- pause heavy worker activity
- drain a node before update

Transport:
- SSH
- `systemctl`
- `docker compose up/down/restart`

### 7.2 Do not overclaim

There is a big difference between:
- stopping the **iHN runtime**
- powering a whole machine off
- powering a whole machine on

Power-on should only be offered when supported by:
- Wake-on-LAN
- IPMI / BMC
- vendor-specific remote management

### 7.3 Safety rules

Never offer blind stop/restart for:
- the current gateway itself without clear confirmation
- nodes with active sessions unless the user sees the impact
- nodes not yet marked as managed

---

## 8. Node states

Every node should have one of these states:

- `discovered`: visible on LAN, not yet evaluated
- `candidate`: preflight passed, ready for promotion
- `managed`: iHN runtime installed and controllable
- `degraded`: reachable but health or trust issue
- `offline`: expected node not reachable
- `draining`: temporarily not taking new work
- `updating`: applying system or iHN updates

---

## 9. Recommended first implementation

### Phase 1

- `/cluster/nodes` inventory
- role suggestions from hardware + capability hints
- Home Nodes section in System panel
- model-fit summaries

### Phase 2

- update checks UI
- managed-node metadata
- SSH preflight
- Promote-to-Node flow

### Phase 3

- managed start / stop / restart
- drain worker
- service update and rollback

### Phase 4

- Wake-on-LAN aware power actions
- scheduled worker sleep/wake
- policy-based routing across nodes

---

## 10. Concrete examples from the current home

### HP-Envy

Best fit:
- gateway / docs / automation / radar

Why:
- always-on friendly
- strong RAM profile
- no GPU pressure

### MSI Raider

Best fit:
- GPU worker
- chat / code / multimodal

Why:
- RTX 4070 laptop GPU
- enough RAM and existing model inventory

### Acer-HL

Best fit:
- light specialist after promotion

Why:
- reachable over SSH
- Docker installed
- older 2GB GPU and 8GB RAM make it better for small focused tasks than for large-model chat

---

## 11. Product line

Public framing should be:

> iHomeNerd is a local AI service team for your home, coordinated by a control plane.

Not:
- one giant model
- one giant box
- one mysterious helper process

