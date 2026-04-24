# iHomeNerd Mobile Strategy

**Status:** kickoff draft  
**Date:** 2026-04-24  
**Owner:** Alex

---

## 1. Core principle

The first native mobile app should be a:
- scout
- controller
- trust helper
- notification surface

It should not try to be the main local AI brain.

The phone is usually:
- not always on in the same way as a gateway
- not the right place for heavier home-cluster orchestration
- not where household trust and node management should primarily live

So the right opening move is:

> **Native mobile as the remote for the home brain, not the home brain itself.**

---

## 2. Product role for v1

### 2.1 What mobile v1 should do

- discover the gateway on the LAN
- pair with the home
- install / verify household trust
- show gateway and node health
- show active roles and basic capabilities
- run or trigger common actions
- surface alerts and summaries
- help with onboarding and trust setup

### 2.2 What mobile v1 should not do

- host the main LLM stack
- pretend to be a worker node for heavy models
- become the only control plane
- hide trust and network complexity with fake magic

---

## 3. Best v1 use cases

### 3.1 Trust and pairing helper

The phone is a good place to:
- discover a new home gateway
- install the Home CA trust artifact
- verify trust worked
- show "this phone trusts this home"

This is especially useful for iOS and Android because trust flows are awkward in the browser alone.

### 3.2 Home status dashboard

Users should be able to see:
- gateway online/offline
- node list
- worker roles
- update status
- trust health
- current alerts

### 3.3 Notifications and summaries

Examples:
- camera digest is ready
- node is offline
- update available
- trust mismatch detected
- GPU worker is draining or degraded

### 3.4 Lightweight action surface

Examples:
- restart node runtime
- run SSH Doctor
- approve key install
- wake or drain node
- start a scan
- open docs or camera digest

---

## 4. iOS direction

### 4.1 Best fit

iOS is well suited for:
- discovery
- pairing
- trust profile install
- status and notifications
- camera / mic as inputs to the home

### 4.2 Likely stack

- SwiftUI
- local-network permission flow
- Bonjour / local discovery
- native networking client
- profile / trust helpers around `.mobileconfig`

### 4.3 iOS-specific strengths

- polished onboarding
- good notification UX
- strong pairing / trust presentation
- natural "remote for the home" experience

### 4.4 iOS-specific constraints

- local-network privacy prompts
- background execution limits
- trust installation still has user steps
- not a good target for pretending to be an always-on worker

---

## 5. Android direction

### 5.1 Best fit

Android is also well suited for:
- discovery
- status
- notifications
- trust setup assistance
- controller workflows

### 5.2 Likely stack

- Kotlin
- Jetpack Compose
- local network discovery
- native HTTPS client with explicit trust guidance

### 5.3 Android-specific opportunities

- potentially stronger device integration later
- more flexible local-network behaviors
- better path for power users and homelab-style operators

### 5.4 Android-specific constraints

- certificate install flows vary by vendor
- trust steps are less uniform than users expect
- background behavior still needs careful shaping

---

## 6. Relationship to host-assist

Mobile strategy and host-assist are connected.

The mobile app should not have to guess:
- which CA is active
- whether trust is healthy
- whether the gateway can SSH into a node
- whether a node is degraded because of cert drift or auth failure

That data should come from the gateway and host-assist layer.

In other words:
- host-assist helps the gateway know the truth
- mobile helps the user act on that truth

---

## 7. Suggested mobile v1 feature set

### 7.1 Pair to Home

- discover gateway on LAN
- show hostname / fingerprint / role
- install trust artifact
- verify secure connection

### 7.2 Home Overview

- gateway card
- node list
- worker roles
- online / degraded / offline states
- update counts

### 7.3 Trust View

- Home CA fingerprint
- node cert status
- phone trust verified / not verified
- recovery actions

### 7.4 Node Actions

- restart runtime
- check updates
- run preflight
- run SSH Doctor
- drain worker

### 7.5 Alerts

- node offline
- trust mismatch
- update available
- camera digest ready

---

## 8. What can wait until later

- on-device inference as a major feature
- phone as worker node
- deep file / photo ingestion from mobile
- rich mobile-first builder workflows
- full Home Assistant-style device control

---

## 9. Recommended sequencing

1. Keep web UI as the main operator surface.
2. Finish gateway trust and host-assist foundations.
3. Build native mobile v1 as controller / scout / trust helper.
4. Add notifications and selected node actions.
5. Only later consider heavier native mobile intelligence.

---

## 10. Bottom line

The right native mobile story is not:

> "Run iHomeNerd on your phone."

The right story is:

> "Your phone is the cleanest way to pair with, trust, monitor, and control your home AI cluster."
