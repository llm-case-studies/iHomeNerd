import SwiftUI

@main
struct IhnHomeApp: App {
    @StateObject private var state = AppState()
    @StateObject private var runtime = NodeRuntime()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(state)
                .environmentObject(runtime)
                .preferredColorScheme(.dark)
                .task { runtime.startIfPreviouslyHosting() }
        }
    }
}
