# iHN Home for iOS

Native SwiftUI controller-class app for iHomeNerd. Pair with the home gateway,
verify trust, monitor nodes, run quick actions.

## Scope

This is the **controller-first** iOS app per `docs/MOBILE_STRATEGY_2026-04-24.md`.
Longer-term, iOS role should be capability-driven in the same spirit as the
Android track, but the current scaffold is still behind Android in both runtime
hosting and trust compliance.

In scope:
- Pair to Home (Bonjour discovery + manual IP fallback)
- Trust health (Home CA fingerprint, per-node cert state)
- Home overview (gateway + nodes, online/degraded/offline)
- Alerts
- Travel session view, take-home handoff
- Model packs (browse / apply)

Not in scope (yet):
- Hosting a fully compliant on-device iHN runtime with Home-CA-backed trust
- PronunCo drills or other vertical-app workflows
- Session-hosted local LLM dialogue (queued for the A17 Pro+ benchmark phase —
  see `mobile/docs/IOS_BENCHMARK_PLAN_2026-04-25.md`)

Trust policy note:
- the intended iHN trust model is shared across backend, Android, and future iOS nodes
- one Home CA per trust domain
- per-node runtime certs signed by that Home CA
- bootstrap over HTTP `:17778`, runtime over HTTPS `:17777`
- current iOS client code still contains a dev-only trust bypass while the
  Home CA install flow is unfinished

See:
- `docs/TRUST_AND_TLS_POLICY_2026-04-28.md`

## Device support

Deployment target: **iOS 17.0**. Includes:

| Phone | Chip | Tier |
|---|---|---|
| iPhone 11 / 11 Pro / 11 Pro Max | A13 | controller floor |
| iPhone 12 / 12 mini / 12 Pro / 12 Pro Max | A14 | controller + light helpers |
| iPhone 13 / 14 (and Plus) | A15 | controller + light helpers |
| iPhone 14 Pro / 15 / 15 Plus | A16 | controller + better helpers |
| iPhone 15 Pro / 15 Pro Max | A17 Pro | session-hosted dialogue tier |
| iPhone 16 / 16 Plus / 16 Pro / 16 Pro Max | A18 / A18 Pro | session-hosted dialogue tier |
| iPhone 17 / 17 Pro / 17 Pro Max | A19 / A19 Pro | session-hosted dialogue tier |

iPhone XS / XR / SE 2 also fit (iOS 17 supports A12+) but are outside the test
fleet and not on the supported-iOS path going forward.

iPhone 7 / 8 / X are intentionally NOT a native target — they keep their
"old phone, real job" role as **web clients** to the gateway-hosted Command
Center on `:17777` over Safari. See the tier table in
`mobile/docs/IOS_TIER_TABLE_2026-04-25.md`.

## Dev environment

This repo lives on Linux. iOS builds run on a Mac on the LAN. The standard
build host is `mac-mini-m1.local` (Apple Silicon M1 — see
`docs/CURRENT_STATE_AND_NEXT_MOVES_2026-04-24.md` for the household
hardware ladder).

The signing path uses Xcode's **Personal Team** — no $99/yr Apple Developer
Program membership required:

- Apps run on simulator without any signing.
- Apps run on a real iPhone with 7-day signing renewal — re-build from Xcode
  every week.
- Capped at 3 devices per Apple ID.
- TestFlight / App Store distribution NOT available on this path. That's fine
  for the validation phase; we revisit when the product is ready to ship.

## Build flow

The `Makefile` orchestrates remote builds over ssh. From this Linux box:

```bash
# one-time on a fresh Mac mini
make remote-bootstrap

# sync + generate Xcode project + build for simulator
make remote-build

# show available simulator destinations
make remote-list-sims

# build for a different simulator
make remote-build SIM_DEVICE='iPhone 15 Pro'

# build against a different Mac host
make remote-build MAC_HOST=imac-macos.local
```

Under the hood, `remote-build`:

1. `rsync`s this directory to `~/ihn-home-ios` on the Mac (excluding generated
   `.xcodeproj` and build output)
2. Runs `xcodegen generate` on the Mac to produce `IhnHome.xcodeproj` from
   `project.yml`
3. Runs `xcodebuild` for the simulator destination

The `.xcodeproj` is **generated, not committed** — `project.yml` is the
canonical source.

## First real-device install

One-time path, the first time the app goes onto a physical iPhone:

1. On the iPhone: **Settings → Privacy & Security → Developer Mode** → ON.
   (The phone reboots once to enable it.)
2. Plug the iPhone into the Mac mini with a USB-C cable. Trust the Mac when
   prompted on the phone.
3. On the Mac: open `IhnHome.xcodeproj` in Xcode. Pick the iPhone in the
   destination dropdown.
4. Project settings → **Signing & Capabilities** → set **Team** to your
   Personal Team (created automatically when you signed your Apple ID into
   Xcode).
5. Hit Run. First install takes ~30 seconds.
6. On the iPhone, the app won't launch yet — go to **Settings → General →
   VPN & Device Management → Developer App** → trust your Apple ID. App now
   launches.

After this, "Connect via Network" in the Xcode device dropdown lets you
deploy without the cable as long as both devices are on the same Wi-Fi.

## Project layout

```text
mobile/ios/ihn-home/
├── Makefile               # remote-build orchestration (Linux → Mac)
├── project.yml            # XcodeGen spec — canonical project source
├── IhnHome/
│   ├── App/               # @main entry, app-level state, root view
│   ├── Design/            # color tokens, typography, reusable components
│   │   └── Components/    # IhnChip, IhnButton, TrustHero, NodePill, …
│   ├── Screens/           # HomeScreen, TrustScreen, PairScreen, …
│   ├── Networking/        # API client, Bonjour browser, models
│   └── Resources/
│       ├── Info.plist
│       └── Assets.xcassets/
└── README.md
```

## Contract surface (talks to)

The app talks to the same endpoints already served by the gateway and the
Android node runtime:

- `GET /discover` — node identity, role, capabilities
- `GET /setup/trust-status` — Home CA fingerprint and trust state
- `GET /setup/ca.crt` — Home CA download (for trust install)
- `GET /health` — runtime health
- `GET /system/stats` — battery / CPU / RAM / storage / connected clients
- `GET /cluster/nodes` — gateway-side cluster view
- `GET /v1/mobile/model-packs` — installed and available packs

See `mobile/android/ihn-home/README.md` for the equivalent Android contract.

## Status

First scaffold landed 2026-04-25. Screens render with mock data. Networking
and Bonjour are stubbed and ready to wire up next iteration.
