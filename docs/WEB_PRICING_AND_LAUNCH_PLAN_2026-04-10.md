# iHomeNerd Web, Pricing, and Launch Plan

**Status:** discussion draft
**Date:** 2026-04-10
**Owner:** Alex

---

## 1. Why revive iHomeNerd now

iHomeNerd is worth reviving because it now has a concrete job: become the first credible **local companion** for PronunCo while also being useful on its own.

That combination matters. If iHomeNerd is only a helper daemon for another app, many users will suspect it is:
- spyware
- a sneaky upsell
- a technical trap

If it is a clear standalone product with its own web UI, its own use cases, and its own value, the trust story becomes much stronger.

The working truth is:

> One local AI brain, many skills, many apps.

PronunCo should be the first polished integration demo, not the only reason iHomeNerd exists.

## 2. What should be on the web

### 2.1 Primary site

Use **ihomenerd.com** as the main site. It should explain the product first and only then invite download/install.

Recommended main navigation:
- Home
- Features
- Integrations
- Hardware
- Pricing
- Download
- Trust / Privacy
- Docs / GitHub

### 2.2 Business-facing site

Use **iofficenerd.com** as a business-facing variant, not a fully separate product site at first.

Practical options:
- redirect to `ihomenerd.com/office`
- or serve the same site with office-first copy and a different hero

The important distinction is messaging, not a separate codebase or a separate product promise.

### 2.3 Homepage structure

Recommended homepage sections:
1. Hero
   - `Your local AI brain for documents, translation, cameras, and connected apps.`
2. Trust strip
   - runs on your hardware
   - localhost by default
   - open core
   - no cloud required
3. Four concrete use cases
   - tax/document copilot
   - translate + transcribe
   - camera digest
   - power apps like PronunCo
4. How it works
   - install
   - connect models
   - use dashboard or connect apps
5. Integrations
   - PronunCo first
   - TelPro-Bro later
6. Hardware tiers
   - old laptop
   - gaming PC
   - Mac mini / Mac Studio
   - office box
7. Pricing
8. Download CTA

### 2.4 Pages worth shipping early

- **Download / Install**
  - quick start
  - Docker
  - GitHub
  - hardware notes
- **Trust / Privacy**
  - localhost by default
  - LAN is opt-in
  - pairing required for LAN
  - what data is stored and where
- **Integrations**
  - PronunCo local companion
- **Use cases**
  - tax copilot
  - documents
  - cameras
  - translation/transcription

## 3. Launch use cases

The public site should not lead with abstract platform language. It should lead with jobs people already understand.

### 3.1 Best initial use cases

| Use case | Why it works |
|---|---|
| **Tax copilot** | High-trust, concrete, explains the value of local docs + retrieval + reasoning immediately |
| **TurboTax chooser / checker** | Solves a real confusion point without pretending to replace tax software or a CPA |
| **Translate + transcribe** | Frequent utility, easy to demo, easy to understand |
| **Camera digest** | Strong privacy + convenience story |
| **PronunCo local companion** | Gives the product a serious app-integration story on day one |

### 3.2 What to avoid on the site

Do not lead with:
- vague "AI platform" language
- every possible capability at once
- heavy camera/vision complexity before the user understands the simpler benefits
- a long list of models/vendors

## 4. Pricing shape

### 4.1 Recommended layers

| Layer | Price | Purpose |
|---|---|---|
| **Open core / Free** | Free | Build trust; prove daily usefulness |
| **Pro** | ~$5-10/month | Better packaging, richer skills, premium convenience |
| **Office** | custom / support-backed | Multi-user, team, LAN mesh, business support |
| **App-specific premium** | separate | PronunCo or other apps price their own premium value |

### 4.2 What should stay free

Free should remain genuinely useful:
- local chat
- local translate
- local transcribe
- basic docs ask/search
- localhost dashboard and API

If the free layer feels fake, trust collapses.

### 4.3 What belongs in Pro

- polished installers / update flows
- tested model bundles / presets
- richer document workflows
- advanced camera modes
- better digests and notifications
- premium support for integrations

### 4.4 What belongs in Office

- multi-user support
- admin settings
- LAN mesh helpers
- audit / policy bundles
- deployment and support relationship

## 5. Relationship to PronunCo

iHomeNerd should be presented as a product that:
- is useful without PronunCo
- integrates beautifully with PronunCo
- helps PronunCo offer local/offline intelligence without rewriting its entire app around one model vendor

Recommended wording for the web:
- `Works on its own.`
- `Can also power apps like PronunCo.`
- `Keep cloud services for gold-standard tasks; move privacy-sensitive or offline-friendly tasks local.`

### 5.1 PronunCo capabilities that fit first

- lesson companion extraction
- translation
- drill generation
- score explanation
- persona dialogue

Not first:
- pronunciation scoring replacement
- TTS replacement

## 6. Trust and adoption angle

A major adoption risk is that users may see a local companion as suspicious. The site should address that directly.

### 6.1 Trust claims worth making

- runs on your hardware
- open core
- localhost by default
- LAN is opt-in
- you can inspect the API and the code
- useful even if you never connect another app

### 6.2 Trust claims to avoid

- "fully secure"
- "best tax advice"
- "replaces your accountant"
- "works magically on any hardware"

## 7. Recommended first launch message

### Option A
`Your local AI brain for documents, translation, cameras, and connected apps.`

### Option B
`Ask your own documents, translate privately, and power apps like PronunCo — on your own hardware.`

### Option C
`One local AI brain. Many skills. Many apps.`

## 8. Immediate next product steps

1. Finish the standalone MVP story on the website.
2. Make `Tax copilot + TurboTax chooser/checker` a first-class example.
3. Make PronunCo the first polished integration page and demo.
4. Decide whether `iofficenerd.com` is initially a redirect or a business landing variant.
5. Keep the first public promise small and believable.

## 9. Open questions

- Is Pro a subscription only, or also a one-time license plus optional support?
- How much of camera/vision belongs in the first public site versus later?
- Should the first installer bundle only chat/translate/transcribe, with docs and cameras as optional modules?
- Should office support be framed as `iOfficeNerd` from day one or introduced later after home adoption?
