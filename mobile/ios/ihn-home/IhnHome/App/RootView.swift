import SwiftUI

struct RootView: View {
    @State private var tab: Tab = .home

    enum Tab: Hashable {
        case home, alerts, trust, travel
    }

    var body: some View {
        TabView(selection: $tab) {
            NavigationStack {
                HomeScreen()
            }
            .tabItem { Label("Home", systemImage: "house.fill") }
            .tag(Tab.home)

            NavigationStack {
                AlertsScreen()
            }
            .tabItem { Label("Alerts", systemImage: "bell.fill") }
            .tag(Tab.alerts)

            NavigationStack {
                TrustScreen()
            }
            .tabItem { Label("Trust", systemImage: "checkmark.shield.fill") }
            .tag(Tab.trust)

            NavigationStack {
                TravelScreen()
            }
            .tabItem { Label("Travel", systemImage: "airplane") }
            .tag(Tab.travel)
        }
        .tint(IhnColor.accent)
    }
}

#Preview {
    RootView()
        .environmentObject(AppState())
        .preferredColorScheme(.dark)
}
