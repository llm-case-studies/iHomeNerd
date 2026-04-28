# iOS

Native SwiftUI controller-class app for iHomeNerd.

The actual project lives at:
- [`ihn-home/`](ihn-home/README.md)

Initial target:
- iOS 17.0 deployment (iPhone 11+ on the supported-iOS path)
- SwiftUI
- Bonjour discovery + manual IP fallback
- Home CA install via `.mobileconfig`
- Trust health, node overview, alerts, travel session

The iOS app is **controller-first today** and is currently behind the Android
node-class track. Longer-term, iOS role should be determined by hardware and
runtime capability, not by OS class. Right now, though, Android remains the
reference node-class host at [`../android/ihn-home/`](../android/ihn-home/README.md).

Important trust note:
- current iOS networking still contains a dev-only TLS trust bypass
- that is not the intended shipped trust model
- see [`../docs/TRUST_AND_TLS_POLICY_2026-04-28.md`](../docs/TRUST_AND_TLS_POLICY_2026-04-28.md)

For the device tier breakdown and the session-hosted local inference
benchmark plan (relevant for iPhone 15 Pro / 16 Pro / 17 Pro class), see:
- [`../docs/IOS_TIER_TABLE_2026-04-25.md`](../docs/IOS_TIER_TABLE_2026-04-25.md)
- [`../docs/IOS_BENCHMARK_PLAN_2026-04-25.md`](../docs/IOS_BENCHMARK_PLAN_2026-04-25.md)
