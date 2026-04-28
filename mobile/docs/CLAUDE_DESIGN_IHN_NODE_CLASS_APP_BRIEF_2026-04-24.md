# Claude Design Brief: iHN Node-Class Mobile App

Use this brief to generate UI for the **node-class** mobile app, primarily the
Android travel-brain version of iHN.

This brief is about iHomeNerd as a portable node host and controller. It is
not about app-specific business flows.

## 1. Goal

Design a native mobile app called `iHN Home` that can:
- act as a controller
- manage trust
- and, on Android, host the local iHN runtime and serve the full Command Center

The native UI should focus on:
- trust
- this-node status
- hotspot / client state
- model packs
- alerts
- quick actions

It should not try to reproduce every dense `:17777` screen natively.

## 2. Key concept

This app is:
- a **native shell**
- around a **local iHN runtime**
- that can serve the full web Command Center to larger screens

## 3. Screens to design

1. First-run bootstrap
- start local node
- set Home name
- initialize trust
- choose travel / personal mode

2. This Node
- runtime status
- IP / hotspot name
- client count
- battery / thermal / charging
- storage

3. Trust
- Home CA fingerprint
- node cert status
- trust test
- repair actions

4. Models
- installed packs
- available updates
- recommended packs for this hardware
- storage impact

5. Quick Actions
- start / stop runtime
- restart runtime
- open local Command Center URL
- show QR for pairing
- start take-home flow

6. Session / Handoff
- active session type
- connected users
- `Take this Home`
- `Create my own Home`

## 4. Product boundary

Do not include:
- PronunCo drill screens
- class lesson UX
- chat-first assistant UI
- app-specific domain work

The app may mention:
- connected apps
- connected learners
- active session

But the UI should remain centered on iHN infrastructure.

## 5. Suggested prompt

```text
Design a native mobile app called iHN Home for Android that acts as a portable
local AI node and controller. This app is a native shell around a local iHN
runtime. It manages trust, model packs, hotspot/client state, runtime health,
and quick actions, while the full dense Command Center is served separately on
:17777 for laptop/tablet screens.

Design these screens:
1. First-run bootstrap
2. This Node
3. Trust
4. Models
5. Quick Actions
6. Session / Handoff

Important: do not include PronunCo drills or other app-specific learning flows.
This UI is about iHomeNerd itself as portable infrastructure.

The visual direction should feel trustworthy, local-first, technical, and calm
under pressure. Show realistic fields like hotspot name, connected clients,
Home CA fingerprint, model pack status, battery, thermal, and storage.
```

## 6. Review checklist

Reject outputs that:
- duplicate the entire desktop dashboard in phone form
- treat the app like a chatbot
- bury trust and runtime state
- drift into app-specific learning/product screens
