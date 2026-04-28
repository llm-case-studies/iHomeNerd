import SwiftUI

struct TravelScreen: View {
    @EnvironmentObject private var state: AppState

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Travel session").ihnH1()
                    if let session = state.travelSession {
                        Text("\(session.nodeName) · \(session.networkLabel) · \(session.durationLabel)")
                            .ihnSecondary()
                    } else {
                        Text("No active session")
                            .ihnSecondary()
                    }
                }
                .padding(.horizontal, 20)
                .padding(.top, 10)

                if let session = state.travelSession {
                    SessionCard(session: session)
                        .padding(16)

                    Eyebrow(text: "Handoff")

                    VStack(spacing: 10) {
                        IhnButton(title: "Take this Home", variant: .primary) { }
                        IhnButton(title: "Create my own Home", variant: .secondary) { }
                        IhnButton(title: "End session", icon: "power", variant: .danger) { }
                    }
                    .padding(.horizontal, 16)

                    Text("Take this Home installs \(session.homeLabel)'s Home CA permanently on this node. Create my own Home starts a fresh trust domain.")
                        .ihnSecondary()
                        .padding(.horizontal, 20)
                        .padding(.top, 14)
                        .padding(.bottom, 28)
                } else {
                    Text("When you're connected to a travel iHN node — beach session, classroom, conference — it'll show up here with handoff options.")
                        .ihnSecondary()
                        .padding(.horizontal, 20)
                        .padding(.top, 24)
                }
            }
        }
        .background(IhnColor.bgPrimary.ignoresSafeArea())
        .navigationBarHidden(true)
    }
}

private struct SessionCard: View {
    let session: TravelSession

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("GUEST SESSION")
                .font(IhnFont.sans(11, weight: .semibold))
                .tracking(1.0)
                .foregroundStyle(IhnColor.accent)
            Text("Connected to \(session.homeLabel)")
                .font(IhnFont.display(20, weight: .semibold))
                .foregroundStyle(IhnColor.textPrimary)
                .tracking(-0.2)
            Text("This node is borrowing your Home's trust. Ending the session clears it.")
                .font(IhnFont.sans(12))
                .foregroundStyle(IhnColor.textSecondary)
                .padding(.top, 4)
        }
        .padding(18)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(IhnColor.accentSoftBg)
                .overlay(RoundedRectangle(cornerRadius: 16).strokeBorder(IhnColor.accentSoftBd, lineWidth: 1))
        )
    }
}

#Preview {
    NavigationStack { TravelScreen() }
        .environmentObject(AppState())
        .preferredColorScheme(.dark)
}
