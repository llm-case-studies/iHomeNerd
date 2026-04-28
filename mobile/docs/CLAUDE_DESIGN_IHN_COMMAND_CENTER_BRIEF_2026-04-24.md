# Claude Design Brief: iHN Full Command Center

Use this brief to generate the larger-screen iHN web Command Center UI.

This brief is intentionally about iHomeNerd itself, not about PronunCo,
TelPro-Bro, or any other app-specific content workflow.

## 1. Goal

Design the **full iHomeNerd Command Center** for laptop / tablet / desktop
screens.

This UI may be hosted by:
- a home gateway
- a Linux node
- an Android travel node running local iHN

The Command Center is the dense operational UI for:
- trust
- nodes
- updates
- investigate
- models
- install / promote flows
- health

## 2. Product boundary

This UI should **not** include:
- lesson drills
- pronunciation exercises
- class grading details
- app-specific workflow editors
- domain-specific product flows from PronunCo or other apps

It may include:
- app integrations inventory
- capability registry
- generic connected-app status

But the center of gravity must stay on iHN itself.

## 3. Screens / areas to design

1. Home Overview
- active Home name
- trust status
- gateway card
- node cards
- current alerts

2. Nodes / Control Plane
- node roles
- health
- preflight
- promote to node
- restart / stop / drain

3. Trust / CA Health
- Home CA fingerprint
- per-node cert chain status
- trusted / mismatch / stale states
- recovery actions

4. Models / Packs
- installed models
- recommended packs per node
- update availability
- storage and fit guidance

5. Investigate
- Local Radar
- target device
- safe/explicit scan results
- no fake remote hardware data

6. Travel / Session View
- portable node status
- hotspot/client count
- active session
- handoff / take-home actions

## 4. Visual direction

- calm infrastructure control plane
- technically serious
- high information density without chaos
- modern but not generic SaaS
- clean role badges, trust indicators, and health states

Avoid:
- chat-centric layouts
- marketing-site aesthetics
- smart-home toy UI
- cluttered observability parody

## 5. Suggested prompt

```text
Design the full iHomeNerd Command Center for laptop and tablet screens.

This is a dense operational control plane for a local-first AI home cluster.
It manages trust, Home CA health, node roles, model packs, updates, preflight,
and portable travel-node sessions. It is not a generic chatbot and it is not
an app-specific learning interface.

Design these areas:
1. Home Overview
2. Nodes / Control Plane
3. Trust / CA Health
4. Models / Packs
5. Investigate / Local Radar
6. Travel / Session View

Important: do not include PronunCo drills, lesson UIs, or other vertical-app
workflows. This UI is about iHomeNerd itself.

The design should feel like a refined local infrastructure cockpit: confident,
calm, high-signal, and trustworthy. Use strong typography, clear status chips,
role badges, and trust indicators. Show realistic example nodes like
HP-Envy-Ubuntu as gateway, msi-raider-linux as GPU worker, and Acer-HL as a
light specialist.
```

## 6. Review checklist

Reject outputs that:
- turn the Command Center into a chat app
- mix in PronunCo lesson screens
- hide trust and node state
- flatten everything into generic cards with no hierarchy
- lose the distinction between Home, node, session, and app integration
