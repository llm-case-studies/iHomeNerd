---
name: ihomenerd-design
description: Use this skill to generate well-branded interfaces and assets for iHomeNerd, either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping the local-first home AI control plane.
user-invocable: true
---

Read the README.md file within this skill, and explore the other available files.

iHomeNerd is a local-first home AI infrastructure — a trust domain, control
plane, and local runtime for a multi-node AI home. The voice is calm ops
engineer: technical, precise, honest about scope. The visual direction is calm
infrastructure control plane, not smart-home toy, not cyberpunk, not
chatbot-forward.

Key files in this skill:
- `README.md` — content fundamentals, visual foundations, iconography
- `colors_and_type.css` — all design tokens as CSS custom properties
- `ui_kits/command_center/` — dense web dashboard at :17777 (laptop/tablet)
- `ui_kits/ios_controller/` — compact controller-class native app
- `ui_kits/android_node/` — node-class app that hosts the local runtime
- `assets/` — brand marks, icon guidance
- `preview/` — swatches, specimens, component state cards

Core rules before producing anything:
- Dark theme is primary. Single blue accent (#4f8cff). Status colors at 10%
  tinted background + 20% tinted border, never full saturation.
- Fonts: Inter (UI), Space Grotesk (display), JetBrains Mono (code/fingerprints/IPs).
- Lucide is the only icon library. 🏠 is the only emoji. No custom SVGs.
- Sentence case everywhere. Second person. No "we". No "✨ AI magic".
- Borders do the work shadows would. Flat surfaces, restrained motion.
- Do NOT mix in PronunCo drills, lesson screens, or vertical-app content.
  Keep iHN focused on trust, nodes, health, models, updates, travel mode,
  and handoff/take-home flows.

If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy
assets out and create static HTML files for the user to view. If working on
production code, you can copy assets and read the rules here to become an
expert in designing with this brand.

If the user invokes this skill without any other guidance, ask them what they
want to build or design, ask some questions, and act as an expert designer who
outputs HTML artifacts _or_ production code, depending on the need.
