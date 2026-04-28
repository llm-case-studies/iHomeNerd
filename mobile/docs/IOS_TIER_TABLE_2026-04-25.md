# iOS Device Tier Table

**Status:** working draft
**Date:** 2026-04-25
**Owner:** Alex

---

## 1. Why this doc exists

iHN's product narrative is "give old phones a real job." That phrase only
holds up if every phone tier maps to a credible role. This table is the
mapping — it drives engineering choices (deployment target, feature gating)
and eventually the landing copy.

## 2. The tier table

> **Calibration note (2026-04-26).** An earlier draft of this table treated A14 / A15 as "Whisper-tiny floor only" tier based on theoretical TOPS comparisons. Real measurements landed: **Gemma 4 2B runs responsively on A14 (iPhone 12 PM)**, and on the Snapdragon 778G (Motorola Edge 2021, comparable Android tier) it runs **Gemma 4 2B responsively and Gemma 4 4B at Lily-from-Duolingo-class latency**. The chip-class projection underestimated mid-tier real-world capability. This revision reflects measured behavior; entries still marked "expected" are projections that haven't been measured yet.

| Tier | Phones | Chip | RAM | Role | Source |
|---|---|---|---|---|---|
| **Strong native** | iPhone 15 Pro / 15 Pro Max / 16 / 16 Pro / 17 / 17 Pro | A17 Pro / A18 / A19 | 8 GB | Controller + session-hosted full voice loop (Whisper + small LLM + Kokoro), foreground; 4B-class dialogue should be comfortable, deck-compose use cases too | expected |
| **Capable native** | iPhone 14 Pro / 15 / 15 Plus / 16 / 16 Plus | A16 / A18 | 6 GB | Controller + 2B–4B dialogue; voice loop probably "usable" range | expected |
| **Capable native** | iPhone 12 / 12 mini / 12 Pro / 12 Pro Max / 13 / 14 | A14 / A15 | 4–6 GB | **Measured: Gemma 4 2B responsive on A14 6 GB (iPhone 12 PM)**; controller + 2B dialogue + Whisper-tiny realistic; 4B may not be available via Apple's runtime path on these | mixed |
| **Floor native** | iPhone 11 / 11 Pro / 11 Pro Max | A13 | 4 GB | Controller, pair/trust, light helpers; on-device 2B unmeasured but plausible given user's report | unmeasured |
| **Web only** | iPhone 7 / 8 / X / SE 1 | A10 / A11 | 2–3 GB | Safari → `https://gateway.local:17777`. Uses gateway-hosted services. **The clearest "old phone, real job" tier.** | by design |
| **Display piece** | iPhone 4 / 5 / 5s / 6 | A4 / A6 / A7 / A8 | 0.5–1 GB | Drawer / museum | by design |

iPhone XS / XR / SE 2 (A12) sit between floor native and web only — iOS 17 still supports them, but they're outside the test fleet and not on the supported-iOS path going forward.

## 3. Why iOS 17 deployment target

Three reasons, in order:

1. **Includes the floor test fleet.** iPhone 11 / 11 Pro / 11 Pro Max all run
   iOS 17. Wife's iPhone 11 Pro Max sets the floor.
2. **Modern SwiftUI.** `@Observable`, `NavigationStack`, modern Bonjour/
   `NWBrowser` ergonomics, sheet presentation modernization. iOS 16 target
   would force older patterns and complicate the codebase.
3. **iPhone 7/8/X get a better job.** Targeting iOS 15 to include them costs
   us a lot of SwiftUI ergonomics for devices that get a more reliable role
   as Safari clients to the gateway. The web tier is structurally simpler
   and ages much better than maintaining a SwiftUI fork that runs on a 2016
   phone.

## 4. Feature-gating contract

Code paths that vary by tier should gate on **device chip class**, not iOS
version, because all native tiers run iOS 17+:

| Capability | Min tier (best estimate) |
|---|---|
| Controller core (pair, trust, alerts, nodes, models) | Floor native |
| Bonjour discovery, Local Network permission flow | Floor native |
| `.mobileconfig` Home CA install | Floor native |
| Whisper-tiny on-device ASR | Floor native (unmeasured but plausible) |
| 2B-class dialogue model (text chat responsiveness) | **Capable native (A14+) — measured on iPhone 12 PM** |
| 4B-class dialogue model | Capable native (A16+) likely; Strong native (A17 Pro+) confirmed comfortable |
| Full mic→ASR→reply→Kokoro voice loop at < 1.5s | Strong native (A17 Pro+) — expected |
| Background continuation via `BGContinuedProcessingTask` | Strong native (A17 Pro+) — the heavier work needs the headroom |

These are still **best estimates pending instrumentation**. The bench
plan in `IOS_BENCHMARK_PLAN_2026-04-25.md` is the source of truth for
"what we've actually measured" once we start running it.

The chip detection happens once at app start and is exposed via
`AppState.chipClass`. UI affordances for higher-tier features stay
hidden on lower tiers rather than showing a "your phone can't do this"
state.

## 5. Test fleet (current)

| Phone | Owner | Chip | RAM | Tier | Role in testing |
|---|---|---|---|---|---|
| iPhone 11 Pro Max | wife | A13 | 4 GB | Floor native | Validates the controller floor and Bonjour permission UX |
| iPhone 12 Pro Max | Alex | A14 | 6 GB | Mid native | Whisper-tiny floor test, controller perf baseline |
| iPhone 15 Pro Max | Alex | A17 Pro | 8 GB | Strong native | The full Codex benchmark target — ASR + dialogue + Kokoro end-to-end |
| iPhone 7 | Alex | A10 | 2 GB | Web only | Validates the Safari-only role end-to-end |

Gap to flag: no A18 / A19 (iPhone 16 / 17 Pro) device available for
testing the very latest tier.

## 6. Landing copy implications

When iHN's landing page talks about phones, it should say:

> Every phone in your house gets a role. Your Pro Max runs voice on-device.
> Your spare older iPhone joins the gateway over Wi-Fi and uses your home's
> services through Safari. The pocket-sized Pro Max isn't doing the AI —
> your home is. Your iPhone is just the screen and microphone.

It should NOT say:

> Runs natively on every iPhone.

Because that's only true for one definition of "every," and the more
honest tier story is also the better marketing story.

## 7. Next moves

1. Wire the chip-class detector in `AppState.chipClass`.
2. Hide on-device-inference UI on tiers below their minimum.
3. Bench Whisper-tiny on A13 / A14 / A17 Pro and capture results in
   `IOS_BENCHMARK_PLAN_2026-04-25.md`.
4. Source an A18 / A19 device or borrow time on one for the upper tier.
