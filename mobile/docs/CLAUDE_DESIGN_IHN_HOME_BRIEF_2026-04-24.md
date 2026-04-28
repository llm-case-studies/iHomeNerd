# Claude Design Brief: iHN Home Mobile UI

Use this brief in Claude Design to explore the **controller-class** native
mobile UI for iHomeNerd.

## 1. Goal

Design a native mobile app called `iHN Home`.

This version of the app is the controller, scout, and trust helper for a local
multi-node AI home. It is not a generic chatbot app and it is not a cloud AI
product.

It is also not the full dense Command Center. That larger-screen experience is
handled by the web UI served by iHN itself.

The app should feel:
- trustworthy
- technical but calm
- local-first
- operational
- clear under pressure

Avoid:
- generic assistant bubbles as the main identity
- “AI magic” visuals
- crypto or cyberpunk aesthetics
- consumer wellness app clichés

## 2. Product framing

iHomeNerd is a local AI service team for the home.

It can route work across different nodes:
- gateway/controller node
- GPU worker
- CPU or edge specialist
- travel node

Different models and runtimes may handle:
- chat
- speech
- transcription
- translation
- vision
- OCR
- document retrieval
- network scans
- automation

The controller-class mobile app’s job is to:
- discover the home
- pair to the gateway
- help install or verify trust
- show node health and roles
- run selected actions
- surface alerts

## 3. Core screens to design

Design a polished first-pass flow for these screens:

1. Pair to Home
- discover nearby gateway on LAN
- show hostname, role, fingerprint, and trust state
- clear CTA to pair

2. Trust Setup
- explain Home CA simply
- show trust installed / not installed
- show certificate fingerprint
- explain what to do if trust is broken

3. Home Overview
- gateway card
- node list
- online / degraded / offline status
- suggested node roles
- quick health summary

4. Node Detail
- node name, IP, role
- capabilities
- model summary
- accelerator summary
- actions like restart, preflight, SSH Doctor

5. Alerts / Events
- trust mismatch
- node offline
- update available
- worker degraded

6. Travel Mode
- connect to a portable travel brain
- show that the phone is using a nearby Android iHN node over hotspot or LAN

This brief should stay focused on the compact controller experience, not on the
full hosted `:17777` Command Center.

## 4. UX constraints

- mobile-first native UI, not a desktop dashboard squeezed onto a phone
- clear hierarchy
- excellent dark theme
- also credible in light theme
- avoid clutter
- use strong typography and status color semantics
- make trust and node state readable at a glance
- include empty states and degraded states

## 5. Design language

Visual direction:
- modern infrastructure control plane
- confident but not enterprise-boring
- subtle depth, careful contrast, restrained motion
- status chips, cards, role badges, and trust indicators

Possible influences:
- pro observability tools
- premium mobile networking apps
- thoughtful home control surfaces

Do not make it look like:
- ChatGPT clone
- messaging app
- smart-home toy app
- generic analytics template
- miniaturized desktop admin console

## 6. Screens content details

### Pair to Home
- headline: `Pair with your Home`
- nearby gateway card with:
  - `HP-Envy-Ubuntu`
  - `gateway`
  - `192.168.0.229`
  - `Home CA fingerprint`
- CTA: `Pair securely`

### Trust screen
- simple explanation:
  - `This phone trusts your Home CA`
  - `Each node presents a cert signed by the same Home CA`
- status examples:
  - trusted
  - needs install
  - mismatch

### Home Overview
Show example nodes:
- `HP-Envy-Ubuntu` as gateway
- `msi-raider-linux` as GPU worker
- `Acer-HL` as light specialist

Use realistic role labels:
- gateway
- llm-worker
- voice-worker
- vision-worker
- docs
- radar
- automation

### Node Detail
For MSI example include:
- `RTX 4070 Laptop GPU`
- `32 GB RAM`
- multiple installed models
- suitable for chat, code, vision

For HP example include:
- gateway
- docs / radar / automation
- lighter model inventory

## 7. Deliverables to ask Claude Design for

Ask for:
- high-fidelity mobile app screens
- a coherent multi-screen flow
- dark and light presentation where useful
- polished status design
- realistic data
- interactive prototype if available

If Claude Design supports export, ask for:
- standalone HTML export
- handoff notes suitable for native implementation

## 8. Suggested prompt

```text
Design a native mobile app called iHN Home for a local-first home AI system.

This is not a generic chatbot app. It is a controller, scout, and trust helper
for a multi-node local AI home. The app helps users pair with their home
gateway, verify household trust, monitor nodes, view suggested roles, and run
selected actions like restart runtime, preflight, and SSH Doctor.

This brief is for the compact controller-class app, not for the full dense web
Command Center hosted by iHN on :17777.

Design these screens:
1. Pair to Home
2. Trust Setup / Trust Health
3. Home Overview
4. Node Detail
5. Alerts / Events
6. Travel Mode connection to a portable nearby iHN node

The product should feel trustworthy, operational, local-first, and calm under
pressure. Avoid generic AI assistant chat aesthetics. Use a refined control
plane visual language with strong typography, clear status chips, role badges,
and trust indicators.

Example nodes:
- HP-Envy-Ubuntu as gateway
- msi-raider-linux as GPU worker
- Acer-HL as a light specialist

Show realistic statuses like online, degraded, offline, trust mismatch, update
available, and worker overloaded.

Important constraints:
- mobile-native feel, not a desktop dashboard squeezed down
- dark theme first, but still credible in light theme
- clear hierarchy and excellent readability
- trust and security should feel understandable, not scary

Please generate a polished multi-screen mobile concept and keep the language
technical, clear, and human.
```

## 9. Review checklist

Reject outputs that:
- center the app around chat bubbles
- hide trust state
- treat the system as one giant AI model
- look like a crypto dashboard
- confuse gateway, worker, and travel-node roles
- use generic average SaaS cards without a clear operational voice
- try to squeeze the entire desktop Command Center into phone screens
