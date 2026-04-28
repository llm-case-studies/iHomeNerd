# iHomeNerd Home And Mobile Vision Roadmap

**Status:** working draft  
**Date:** 2026-04-24  
**Owner:** Alex

---

## 1. Why this doc exists

The product now has three overlapping ideas that need to stay coherent:
- **Home** as a trust and control domain
- **Mobile** as controller and, on Android, portable node host
- **Take-home / class flows** that move people from temporary shared setups into their own independent Homes

This document turns those ideas into one roadmap.

## 2. Product truth

iHomeNerd is:
- a local trust domain
- a local control plane
- a local capability router
- a web Command Center
- and, on some devices, a portable node runtime

It is not:
- just one chatbot
- just one LLM
- just a helper process for another app

Apps like PronunCo can use iHN, but iHN itself remains:
- useful on its own
- visible as its own product
- responsible for trust, control, nodes, and local runtime management

## 3. The main objects

### 3.1 Home

A **Home** is the main ownership and trust boundary.

Each Home should have:
- one active Home CA
- one or more signed node certs
- one gateway / control plane
- optional worker nodes
- one operator story for trust, updates, and recovery

### 3.2 Node

A node is a machine that participates in a Home.

Examples:
- gateway
- GPU worker
- light specialist
- travel node
- class node

### 3.3 Session

A session is a temporary operating context.

Examples:
- travel session on a beach
- classroom session
- workshop session

A session may be temporary even if it uses real iHN runtime and trust.

### 3.4 Take-home flow

A take-home flow is the transition from:
- temporary shared trust domain
to
- student’s or friend’s own long-term Home

That transition must be explicit.

## 4. Architectural model

### 4.1 Dense UI stays in the full Command Center

The busy operational screens remain in the full web UI on `:17777`.

That web UI may be hosted by:
- home gateway
- Linux node
- Android travel node

### 4.2 Native UI stays compact and high-value

Native UI should focus on:
- pairing
- trust
- alerts
- this-node status
- model packs
- quick actions
- travel controls

### 4.3 Native node-class apps can still host the full system

For Android specifically, a node-class app should be able to:
- start the local runtime
- host the full Command Center
- act as the first iHN in a virgin environment

## 5. Roadmap

### Phase 1: Stable Home trust and control

Goal:
- trust once per Home should feel real

Deliverables:
- Home CA fingerprint view
- per-node chain status
- trust health
- SSH Doctor
- update checks
- cleaner rollout consistency

### Phase 2: Native controller app

Goal:
- pairing, trust, alerts, and quick actions feel better than browser-only flows

Deliverables:
- Pair to Home
- Trust Health
- Home Overview
- This Node
- Alerts

### Phase 3: Android portable node

Goal:
- Android can act as a real travel iHN node

Prerequisite gate:
- iHN install/update path on Android is clean and repeatable
- full web UI and API are reachable over real LAN and hotspot, not just locally or over USB forwarding
- joining devices can discover the node IP and complete trust/bootstrap cleanly
- operator can see hotspot/client/network state from the node itself

Deliverables:
- native shell starts local runtime
- full `:17777` Command Center served on hotspot / LAN
- API endpoints are reachable from peer devices on hotspot / LAN
- model pack manager
- hotspot/client overview
- battery / thermal / storage view

### Phase 4: Spare-hardware validation ladder

Goal:
- prove that older household hardware can fill real iHN ecosystem roles

Prerequisites:
- Android portable-node networking works without USB dependency
- deploy/update flow is streamlined enough to repeat across old laptops and desktops
- version visibility is clear enough that test results are tied to a real build/revision

Deliverables:
- test older Android devices against the current iHN implementation
- record whether each device can host UI only, full local API, or useful local model workloads
- validate deploy flow on old general-purpose machines such as `Acer-HL`
- revive and test the aging gaming rig with the `24 GB` GPU tier for heavier local work
- publish a compatibility table that maps hardware roles to ecosystem fit

Example fit labels:
- `iHN Core`
- `On-My-Watch`
- `EdgeKite`
- `PronunCo`
- `Tax`
- `iMedisys`

### Phase 5: Shared-session workflows

Goal:
- temporary class or travel sessions work cleanly

Deliverables:
- session-aware copy
- QR pairing
- temporary session trust domain visibility
- guest/client experience

### Phase 6: Take-home and graduate flows

Goal:
- move users from temporary shared setup into their own Home

Deliverables:
- `Take this Home`
- asset transfer rules
- new personal Home CA creation
- ownership boundary reset
- clean exit from class/session trust

## 6. Example journey

### 6.1 Portable study session

- Android travel node starts iHN
- laptop joins hotspot
- full Command Center opens from Android node
- participants use apps and local services during the session

### 6.2 Continuation after the session

- one participant chooses `Create my own Home`
- their laptop or Android node becomes a new iHN Home
- allowed materials transfer
- the new Home gets its own CA
- the original travel node is no longer the long-term trust anchor

## 7. Design boundary for iHN UI

iHN UI should cover:
- trust
- pairing
- nodes
- health
- roles
- models
- updates
- portable-node status
- handoff / take-home

iHN UI should not drift into:
- PronunCo drills
- lesson content editing
- course grading workflow
- product-specific content operations for other apps

Those belong in the app that uses iHN, not in iHN itself.

## 8. Bottom line

The long-term product shape is:
- one Home as trust domain
- many optional nodes
- native mobile as control surface
- Android as optional portable node host
- full dense UI served over `:17777`
- temporary sessions that can cleanly graduate into new personal Homes
