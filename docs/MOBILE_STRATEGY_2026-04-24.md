# iHomeNerd Mobile Strategy

**Status:** working draft  
**Date:** 2026-04-24  
**Owner:** Alex

---

## 1. Core principle

Mobile should not be treated as one thing.

There are two valid mobile roles:
- **controller-class app** — pairs, trusts, monitors, alerts, and controls
- **node-class app** — does the above and can also host a local iHN runtime

The right design depends on platform and use case.

## 2. Product split

### 2.1 Controller-class app

This app is:
- a scout
- a controller
- a trust helper
- a notification surface

It should:
- discover the gateway on the LAN
- pair with the home
- install / verify trust
- show gateway and node health
- surface alerts and summaries
- run selected actions

It should not try to:
- mirror every dense Command Center screen
- become the only operator surface
- fake a full cluster workstation on a small screen

### 2.2 Node-class app

This app does everything the controller-class app does, and also:
- owns or starts the local iHN runtime on the device
- serves the full web Command Center on `:17777`
- exposes the device as a nearby iHN node on LAN or hotspot

This is the right shape for:
- a dedicated Android travel brain
- first-node / virgin-environment setup
- portable “study now” or “work now” sessions

## 3. UX split

### 3.1 Native UI should handle

- first-run bootstrap
- pairing
- trust / cert install and repair
- home overview
- this-node overview
- travel mode / hotspot state
- alerts
- quick actions
- model pack lookup and update actions
- “open full Command Center on another screen”

### 3.2 Full Command Center should remain web UI

The dense operational UI should stay in the full web Command Center:
- Investigate
- Builder
- detailed System views
- high-density node management
- rich multi-panel workflows

That web UI can be:
- hosted by a home gateway
- or hosted by a node-class Android app in travel mode

The goal is:
- **native UI for trust and control**
- **web UI for dense operations**

## 4. Platform direction

### 4.1 iOS

Best fit:
- controller-class app
- trust helper
- pairing surface
- status and alerts
- camera / mic as optional inputs later

Likely stack:
- SwiftUI
- local-network permission flow
- Bonjour / local discovery
- native networking client
- trust helpers around `.mobileconfig`

Constraints:
- background execution limits
- not a strong fit for an always-on local runtime
- not a strong fit for “portable travel brain” hosting

### 4.2 Android

Best fit:
- controller-class app
- and later a node-class app

Likely stack:
- Kotlin
- Jetpack Compose
- local network discovery
- native HTTPS client with explicit trust guidance

Android-specific strengths:
- better path to a portable travel brain
- more plausible local runtime hosting
- stronger fit for hotspot-based “local hub” behavior

Android-specific constraints:
- vendor differences around trust install
- still needs careful handling of power, thermal, and background behavior

## 5. Relationship to host-assist

Mobile strategy and host-assist are connected.

The mobile app should not have to guess:
- which CA is active
- whether trust is healthy
- whether the gateway can SSH into a node
- whether a node is degraded because of cert drift or auth failure
- which `.local` names the host actually sees

That data should come from the gateway and host-assist layer.

In other words:
- host-assist helps the gateway know the truth
- mobile helps the user act on that truth

## 6. Travel brain model

The first strong node-class mobile story is:
- dedicated Android travel node
- hotspot enabled
- laptop / tablet / phones join that local network
- Android app starts the local iHN runtime
- full Command Center is served from that Android node on `:17777`

This creates a portable local-first environment for:
- classes
- workshops
- travel
- offline field work
- small-group study sessions

## 7. Shared session -> personal Home handoff

One important rule:
- a temporary shared session should not automatically become a permanent shared trust domain

So the long-term shape should support:
- **temporary shared travel/class environment**
- **clean handoff into an independent personal Home**

Examples:
- teacher-led PronunCo class
- beach study session with friends
- workshop node at a conference

The key missing product concept is:
- `Take this Home`
- or `Create my own Home from this session`

That flow should:
- copy allowed assets
- create a new personal Home CA
- stop long-term dependence on the temporary shared domain

## 8. Class and course trust domains

For educational use, the right trust model is:
- permanent teacher/personal Home CA
- separate temporary **class CA**
- student personal Home CA after handoff

The class CA should be:
- temporary
- scoped to one class or cohort
- revocable or expiring

Students should not stay permanently inside the teacher’s trust domain.

## 9. Suggested mobile v1 feature set

### 9.1 Pair to Home

- discover gateway on LAN
- show hostname / fingerprint / role
- install trust artifact
- verify secure connection

### 9.2 Home Overview

- gateway card
- node list
- worker roles
- online / degraded / offline states
- update counts

### 9.3 Trust View

- Home CA fingerprint
- node cert status
- phone trust verified / not verified
- recovery actions

### 9.4 This Node

- this device role
- runtime state
- battery / thermal / storage
- hotspot / client count
- installed model packs

### 9.5 Quick Actions

- restart runtime
- check updates
- run preflight
- run SSH Doctor
- drain worker
- open full Command Center

### 9.6 Alerts

- node offline
- trust mismatch
- update available
- client connected
- model pack issue

## 10. What can wait until later

- full native parity with the web dashboard
- phone as heavy worker for large models
- mobile-first builder workflows
- deep app-specific business logic in iHN UI

## 11. Recommended sequencing

1. Finish gateway trust and host-assist foundations.
2. Build native controller UI for pairing, trust, alerts, and quick actions.
3. On Android, add node-class runtime hosting and `:17777` serving.
4. Add travel mode and portable-node UX.
5. Add shared-session -> personal-Home handoff.
6. Add class-mode trust domains and educational handoff flows.

## 12. Bottom line

The right mobile story is not:

> “Put the whole dense desktop UI onto a phone.”

And it is not:

> “Make every mobile app host the full brain.”

The right story is:

> “Use native mobile for pairing, trust, alerts, models, and control — and let node-class Android devices host the full Command Center when they need to act as portable iHN nodes.”
