# iHomeNerd Design System

A calm infrastructure control plane for the home — not a smart-home toy, not a
cyberpunk dashboard, not a chatbot. This design system captures the visual and
content language used across iHomeNerd's surfaces: the dense web Command
Center, the public staging/landing page, and the two emerging native mobile
apps (iOS controller, Android node-class).

## What is iHomeNerd?

iHomeNerd is a **local-first home AI infrastructure** — a trust domain, a
control plane, and a local runtime for a multi-node AI home. It runs on your
own hardware. Localhost by default. Open core.

The system is shaped like a small cluster, not a single box:

- one always-on **gateway / control plane** (the stable entry point)
- zero or more **worker nodes** (GPU, edge, CPU specialist)
- optional **travel nodes** (Android-hosted, portable)

All nodes are bound to a single **Home CA** — "trust once per household,"
never "click through browser warnings per node forever." Trust is the central
UX idea, not a footer checkbox.

## Surfaces covered in this system

| Surface | Class | Target | Source |
|---|---|---|---|
| **Command Center** | Web, dense | Laptop / tablet at `https://<gateway>:17777` | `frontend/` in the iHomeNerd repo |
| **Landing / staging** | Web, marketing-adjacent | `staging.ihomenerd.com` public preview | `landing/` in the iHomeNerd repo |
| **iHN Home (iOS)** | Native mobile, controller-class | Pairing, trust, alerts, node control | Design briefs only — not yet shipped |
| **iHN Home (Android)** | Native mobile, node-class | Hosts a local iHN runtime; travel node | Design briefs only — not yet shipped |

## Sources (archive / for reference)

The user supplied these read-only sources. Listed verbatim so a future reader
can trace back even without the same file-system access.

**Local mounted docs** (under `docs/`):
- `docs/MOBILE_REPO_STRATEGY_2026-04-24.md`
- `docs/CLAUDE_DESIGN_IHN_HOME_BRIEF_2026-04-24.md` — iOS controller brief
- `docs/CLAUDE_DESIGN_IHN_NODE_CLASS_APP_BRIEF_2026-04-24.md` — Android node brief
- `docs/CLAUDE_DESIGN_IHN_COMMAND_CENTER_BRIEF_2026-04-24.md` — web Command Center brief

**GitHub** — `llm-case-studies/iHomeNerd` (default `main`):
- `README.md`
- `frontend/` — the Command Center React + Vite app
- `landing/` — the staging.ihomenerd.com React + Vite app
- `docs/UI_CONTRACT_2026-04-13.md` — canonical design tokens + API contract
- `docs/NODES_CONTROL_PLANE_SPEC_2026-04-23.md` — node states, promote flow, SSH doctor, trust
- `docs/PRODUCT_SPEC.md`, `docs/WHITEPAPER_ROADMAP_2026-04-13.md`

The imported slice of the frontend lives in this project under `frontend/`
and `landing/` (read-only reference — do not treat as authoritative source;
go back to the repo if something looks stale).

---

## Index / manifest

Root files:
- `README.md` — this file.
- `colors_and_type.css` — all design tokens (colors, type ramp, radii, spacing, shadow) as CSS custom properties + semantic helper classes. Import this in any prototype.
- `SKILL.md` — the cross-compatible agent skill descriptor.
- `assets/` — brand marks and iconography notes.
- `fonts/` — see "Fonts" below.
- `preview/` — individual design-system cards (swatches, specimens, component states). Rendered into the Design System tab.
- `ui_kits/` — per-surface UI kits:
  - `ui_kits/command_center/` — web, 1440-wide dense dashboard
  - `ui_kits/ios_controller/` — 390-wide mobile controller
  - `ui_kits/android_node/` — 412-wide node-class travel app
- `frontend/`, `landing/` — imported source from the live repo (reference).

---

## Fonts

| Role | Family | Weights used | Source |
|---|---|---|---|
| Display | **Space Grotesk** | 500, 600, 700 | Google Fonts |
| UI / body | **Inter** | 400, 500, 600, 700 | Google Fonts |
| Monospace | **JetBrains Mono** | 400, 500 | Google Fonts |

All three are Google-Fonts-served in the live code (`@import` at the top of
`index.css` in both `frontend/` and `landing/`). No self-hosted `.ttf`/`.woff2`
files ship in the repo today, so **no font substitutions were needed** — the
live product *is* Google Fonts.

If you export for offline / print / native, grab them from:
- https://fonts.google.com/specimen/Space+Grotesk
- https://fonts.google.com/specimen/Inter
- https://fonts.google.com/specimen/JetBrains+Mono

---

## CONTENT FUNDAMENTALS

The voice across iHomeNerd is best described as **calm ops engineer**. It is
technical, precise, and a little dry. It never oversells. It is not cute, not
"AI magic," not playful, and never marketing-breathless. When it warns, it
warns in plain sentences. When it reassures, it reassures with specifics.

### Vibe

- **Trustworthy and operational.** Favor concrete nouns (gateway, node,
  hotspot, fingerprint, runtime) over abstractions ("AI" used sparingly, "AI
  magic" never).
- **Calm under pressure.** Error states explain what happened and what to do.
  No alarming red walls, no apologies.
- **Honest about scope.** The product spec and landing copy openly admit
  "there is not yet a polished one-line `docker run ...` image" — that
  frankness is the voice.

### Person & address

- **Second person ("you") when talking to a user.** "Pair with your Home."
  "This phone trusts your Home CA."
- **First person plural avoided.** The product does not say "we" — it says
  what it *is* and what it *does*.
- **No emoji except one.** The house emoji `🏠` is used as the wordmark prefix
  in the header. Do not introduce others. No "✨ coming soon!", no "✅ done".

### Casing

- **Sentence case for everything** — titles, buttons, card headers. Do not
  Title-Case headlines. ("Pair with your Home", not "Pair With Your Home".)
- **Proper nouns stay cased** — `Home CA`, `iHomeNerd`, `RTX 4070`,
  `gemma3:4b`. Hostnames stay in their literal form: `HP-Envy-Ubuntu`,
  `msi-raider-linux`, `Acer-HL`.
- **UPPERCASE** is reserved for the landing eyebrow label ("PUBLIC REPO,
  PRIVATE DATA") and nowhere else.

### Concrete examples from the codebase

Good copy, lifted directly:

> "Your local AI brain for documents, translation, cameras, and connected apps.
>  Runs on your hardware. Localhost by default. Open core."
>
> "Pair with your Home"
>
> "This phone trusts your Home CA / Each node presents a cert signed by the
>  same Home CA"
>
> "trust once per household — not click through browser warnings per node
>  forever"
>
> "Checking for updates should be cheap and safe. Applying updates should
>  always be explicit."

Bad copy to avoid (made-up, representative of what *not* to do):

> ~~"✨ Your smart home, supercharged with AI!"~~
> ~~"Oops! Something went wrong. Please try again."~~
> ~~"Let's get you set up — it only takes a minute!"~~

### Status language

Every node, cert, and session has a **one-word state** drawn from this fixed
vocabulary. Do not invent synonyms.

- Nodes: `discovered`, `candidate`, `managed`, `degraded`, `offline`, `draining`, `updating`
- Runtime: `online`, `degraded`, `offline`
- Trust: `trusted`, `needs install`, `mismatch`, `stale`
- Updates: `none`, `available`, `applying`, `reboot required`
- Session: `running`, `stopped`, `handoff`

Keep chips short. "Trust mismatch" is a chip. "Trust chain appears to not
match the Home CA currently bound to this device" is a tooltip.

### Numbers, units, fingerprints

- Model IDs stay literal and lowercase with colons: `gemma3:4b`, `llama3.2:1b`.
- Hardware is spelled as the vendor spells it: `RTX 4070 Laptop GPU`,
  `32 GB RAM`, `2 GB VRAM`.
- Fingerprints are rendered in mono, colon-grouped, never wrapped mid-pair:
  `SHA256 4C:7E:3B:…:A1:FF`.
- Durations are short-form: `3h 12m`, `42s`, `2d 4h`.

---

## VISUAL FOUNDATIONS

### Color

Dark theme is the primary theme. Light theme is mentioned in the mobile brief
as "also credible in light theme" but no code ships it yet — treat it as
aspirational and derive from the dark palette.

The palette is deliberately narrow: **a single blue accent**, three **semantic
status colors**, and a cool near-black surface stack.

| Token | Hex | Role |
|---|---|---|
| `--bg-primary` | `#0f1117` | App canvas |
| `--bg-surface` | `#1a1d27` | Cards, header, nav |
| `--bg-input` | `#252830` | Inputs, hovered rows, code blocks |
| `--border-color` | `#2e3140` | All hairlines |
| `--text-primary` | `#e4e6eb` | Body text |
| `--text-secondary` | `#8b8fa3` | Descriptions, meta |
| `--accent` | `#4f8cff` | Primary action, links, active state |
| `--success` | `#34d399` | Online / trusted / ok |
| `--warning` | `#fbbf24` | Degraded / update available |
| `--error` | `#f87171` | Offline / mismatch / blocker |

Semantic colors **never appear at full saturation on a surface** — they are
always paired with a 10 % tinted background and a 20 % tinted border. This is
the canonical "status chip" pattern and is used in `CommandCenter.tsx`,
`InvestigatePanel.tsx`, and throughout:

```tsx
// canonical chip
<div className="bg-success/10 border border-success/20 rounded-full px-3 py-1">
  <span className="text-success">online</span>
</div>
```

**Do not use gradients except in one place:** the landing hero headline uses
a single `from-accent to-purple-400` gradient on the second line. Everywhere
else, the accent is used flat.

### Type

See the table in the Fonts section for families. The display font (**Space
Grotesk**) appears only on: the wordmark, landing hero + section headlines,
and large marketing H2s. Inside the Command Center, everything is Inter.
JetBrains Mono shows up for code, fingerprints, IP addresses, model IDs,
terminal transcripts, and any field a sysadmin would expect to copy-paste.

Type is **generous on the landing page** (hero at `text-5xl/7xl`, 72 px
desktop) and **compact inside the Command Center** (`text-sm` for tab labels,
`text-lg` for panel titles). Density is a design signal: marketing breathes,
ops doesn't.

### Spacing

Tailwind 4 scale, `4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 48 / 64`. The
Command Center uses `px-6 py-4` on the header, `p-5` on card interiors, and
`gap-6` between major columns. The landing uses `py-24` between sections.

### Backgrounds

Flat, very dark, slightly blueish. Not pure black. The landing page layers
**one subtle noise texture** (`grainy-gradients.vercel.app/noise.svg` at
`opacity-20 mix-blend-overlay`) over the hero and **one blurred accent glow**
(`bg-accent/20 blur-[120px] rounded-full`). These are the only two atmospheric
treatments in the entire product. Nothing else has gradients, patterns, or
imagery.

No hand-drawn illustrations. No photography. No iconographic hero art.
Placeholders inside the Command Center are honest — a card with a label that
says "coming soon" and a Lucide icon.

### Animation

Deliberately restrained.

- **Fades and position slides only**, via Framer Motion (`motion/react` in the
  codebase). No bounce, no springs-with-overshoot.
- **Online indicator pulses.** A `ping` / opacity animation on the live status
  dot is the one piece of idle motion allowed.
- **Radar sonar pulse.** Investigate panel's small indicator dot has a
  matching ping.
- Tab switches, panel loads, modal opens use simple opacity + `y: 4–8` slides.
- **No skeletons with shimmer.** Loading states show a Lucide `Loader2` with a
  `spin` class and short text like "Scanning…".
- Easing: browser default (roughly `ease-in-out`). Durations: 150–250 ms.

### Hover & press

- **Hover on interactive text/icon:** `text-text-secondary → text-text-primary`
  plus `bg-bg-input/50` background appearing. Never a color shift to blue
  unless the element *is* a primary action.
- **Hover on primary button:** `bg-accent → bg-accent-hover`.
- **Hover on card / row:** `bg-bg-surface → bg-bg-input` or a subtle border
  color shift from `border-color` to `accent/40`.
- **Press / active:** the landing CTAs use `hover:scale-105` — a mild 1.05
  grow, no press-shrink. The Command Center does not scale on press.
- **Focus ring:** inputs shift border to `accent` with no glow.
  `focus:outline-none focus:border-accent` is the canonical pattern.

### Borders, radii, shadows

- **Borders do the work shadows would.** The product is almost flat.
- Radii: `6 px` for inputs and small buttons, `8 px` for cards (the default),
  `12 px` for pill inputs and CTAs, `16 px` for hero CTAs, `24 px` for
  large panel containers (the big `rounded-2xl` Investigate shell).
- Full-round (`rounded-full`) is reserved for status chips and the small
  live-dot indicators.
- Shadows: essentially none inside the Command Center. The landing hero uses
  one big `blur-[120px]` accent glow behind the H1. Modal uses
  `shadow-pop` = `0 8px 24px rgba(0,0,0,.35)`.

### Transparency & blur

Used sparingly and always purposefully:

- **Sticky nav / header backdrop:** `bg-bg-surface/50 backdrop-blur-md` on
  both the landing nav and some floating headers inside panels.
- **Tinted status pills:** `bg-success/10` etc. (the 10/20 pattern).
- **Selection:** `selection:bg-accent/30` on the landing root.
- **No glassmorphism** as a stylistic motif. Blur is functional, not
  decorative.

### Imagery & iconography palette

If photography is ever used (it currently isn't), keep it cool, slightly
desaturated, with fine grain if any — the noise texture on the landing hero
is the only texture in the entire system. Never warm-toned stock. Never
bokeh. Never tech-abstract render-farm gradients.

### Cards

The canonical card:

```
bg-bg-surface                       /* #1a1d27 */
border: 1px solid var(--border-color)
border-radius: var(--radius-card)   /* 8px, or 24px for big panel shells */
padding: var(--space-5)             /* 20px */
shadow: none
```

Inside a card, the interior uses `bg-bg-input` for nested rows and inputs.
Headers inside cards are `.h3` (Inter 600 / 18 px) — *not* Space Grotesk.

### Fixed elements

- Header: sticky at top, 64 px tall, `bg-bg-surface` with bottom hairline.
- Nav tabs: directly below header, active tab underlined with a 2 px accent
  bar (`rounded-t-full`) — **not** a pill background. This is specific and
  distinctive.
- Floating elements: rare. The Command Center does not float action buttons.
  Mobile uses bottom nav (see iOS kit).

### Layout rules

- **Max width `7xl` (1280 px)** on the landing page, centered with `px-6`.
- **Max width `7xl` inside the Command Center** for the Investigate panel's
  two-column split. Other panels are full-width with internal padding.
- Two-column splits are typically `1/3 + 2/3` (Investigate) or `1/2 + 1/2`
  (Translate, Home Overview). Three-column grids are `grid lg:grid-cols-3`
  on landing.

---

## ICONOGRAPHY

**Primary icon system: [Lucide](https://lucide.dev/)** (`lucide-react` in
both `frontend/` and `landing/`). Every icon in the product is a Lucide icon.
Stroke-based, rounded joins, 1.5 px stroke, sized 14 / 16 / 18 / 20 px
depending on context. This is the single source of truth for iconography.

### Approach

- **Functional first.** Icons label actions and states, not decorate sections.
- **Pair with text** almost always. Tab labels show icon + word. Buttons show
  icon + word. The only unlabeled icons are the gear, help, and close
  affordances in the header.
- **Consistent sizing:** `size={14}` for chips, `size={16}` for tab/button,
  `size={18–20}` for card headers and modal titles.

### Icons in use (from the live code)

From `CommandCenter.tsx`:
`Settings`, `MessageSquare`, `Mic`, `FileText`, `Languages`, `Search`, `Bot`,
`Server`, `Package`, `Globe`, `HelpCircle`.

From `SystemPanel.tsx` (nodes + trust + ops):
`Activity`, `ArrowRightLeft`, `Clock`, `Cpu`, `HardDrive`, `Network`, `Play`,
`Power`, `RefreshCcw`, `ShieldCheck`, `Square`, `Terminal`, `Wrench`.

From `InvestigatePanel.tsx`:
`Wifi`, `Radio`, `Monitor`, `Smartphone`, `Server`, `AlertTriangle`, `Info`,
`CheckCircle2`, `FileImage`, `ShieldAlert`, `Loader2`.

From `LandingPage.tsx`:
`Shield`, `Lock`, `Zap`, `Brain`, `ArrowRight`, `Copy`, `Github`,
`ExternalLink`, `CheckCircle2`.

### Emoji & unicode

- **One emoji only: `🏠`.** Used as the literal brand mark in the Command
  Center header and landing nav. Do not add more.
- **No unicode pictographs** (no ✓, ✗, ⚡, ★). Use Lucide equivalents.
- **Unicode arrows allowed in copy** (→, ←) for flow indicators in
  documentation, but `ArrowRight` from Lucide is preferred in UI.
- The `▼` character appears once as a select-dropdown chevron. Leave it.

### No custom SVGs

The repo ships no custom icon SVGs, no sprite, no icon font. This design
system follows suit — `assets/logo-mark.svg` and `assets/logo-wordmark.svg`
are the only custom SVGs present, and they are stand-ins for contexts emoji
cannot render.

---
