import SwiftUI

struct RootView: View {
    @State private var tab: Tab = .home

    enum Tab: Hashable {
        case home, node, speak, trust, travel
    }

    var body: some View {
        TabView(selection: $tab) {
            NavigationStack {
                HomeScreen()
            }
            .tabItem { Label("Home", systemImage: "house.fill") }
            .tag(Tab.home)

            NavigationStack {
                NodeScreen()
            }
            .tabItem { Label("Node", systemImage: "antenna.radiowaves.left.and.right") }
            .tag(Tab.node)

            NavigationStack {
                SpeakScreen()
            }
            .tabItem { Label("Speak", systemImage: "speaker.wave.2.fill") }
            .tag(Tab.speak)

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
        .environmentObject(NodeRuntime())
        .preferredColorScheme(.dark)
}
