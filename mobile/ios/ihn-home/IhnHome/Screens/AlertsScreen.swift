import SwiftUI

struct AlertsScreen: View {
    @EnvironmentObject private var state: AppState

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Alerts").ihnH1()
                    Text("From your Home · last 24 h").ihnSecondary()
                }
                .padding(.horizontal, 20)
                .padding(.top, 10)

                if !blockers.isEmpty {
                    Eyebrow(text: "Blocker")
                    VStack(spacing: 10) {
                        ForEach(blockers) { a in
                            IhnAlertCard(tone: .err, title: a.title, message: a.body, timestamp: a.timestamp)
                        }
                    }
                    .padding(.horizontal, 16)
                }

                if !warnings.isEmpty {
                    Eyebrow(text: "Warnings", topPadding: 16)
                    VStack(spacing: 10) {
                        ForEach(warnings) { a in
                            IhnAlertCard(tone: .warn, title: a.title, message: a.body, timestamp: a.timestamp)
                        }
                    }
                    .padding(.horizontal, 16)
                }

                if !resolved.isEmpty {
                    Eyebrow(text: "Resolved", topPadding: 16)
                    VStack(spacing: 10) {
                        ForEach(resolved) { a in
                            IhnAlertCard(tone: .ok, title: a.title, message: a.body, timestamp: a.timestamp)
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.bottom, 24)
                }
            }
        }
        .background(IhnColor.bgPrimary.ignoresSafeArea())
        .navigationBarHidden(true)
    }

    private var blockers: [AlertItem] { state.alerts.filter { $0.severity == .blocker } }
    private var warnings: [AlertItem] { state.alerts.filter { $0.severity == .warn    } }
    private var resolved: [AlertItem] { state.alerts.filter { $0.severity == .ok      } }
}

#Preview {
    NavigationStack { AlertsScreen() }
        .environmentObject(AppState())
        .preferredColorScheme(.dark)
}
