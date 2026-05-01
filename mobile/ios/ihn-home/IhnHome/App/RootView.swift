import SwiftUI

struct RootView: View {
    @State private var tab: Tab = .home

    enum Tab: Hashable {
        case home, node, speak, listen, trust, models
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
                ListenScreen()
            }
            .tabItem { Label("Listen", systemImage: "mic.fill") }
            .tag(Tab.listen)

            NavigationStack {
                TrustScreen()
            }
            .tabItem { Label("Trust", systemImage: "checkmark.shield.fill") }
            .tag(Tab.trust)

            NavigationStack {
                ModelsScreen()
            }
            .tabItem { Label("Models", systemImage: "cpu") }
            .tag(Tab.models)
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
