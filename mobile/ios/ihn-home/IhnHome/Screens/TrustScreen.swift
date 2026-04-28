import SwiftUI

struct TrustScreen: View {
    @EnvironmentObject private var state: AppState
    @State private var showPair = false
    @State private var showRepair = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Trust").ihnH1()
                    Text("Trust once per household. Every node's cert chains to the same Home CA.")
                        .ihnSecondary()
                        .frame(maxWidth: 320, alignment: .leading)
                }
                .padding(.horizontal, 20)
                .padding(.top, 10)

                TrustHero(state: state.trustState, fingerprint: state.homeCAFingerprint)
                    .padding(.top, 16)

                Eyebrow(text: "Per-node cert state")

                VStack(spacing: 0) {
                    ForEach(Array(state.nodes.enumerated()), id: \.element.id) { idx, node in
                        CertRow(
                            host: node.host,
                            state: node.cert,
                            fingerprint: node.fingerprint ?? "no cert installed",
                            isLast: idx == state.nodes.count - 1
                        )
                    }
                }
                .background(
                    RoundedRectangle(cornerRadius: 14)
                        .fill(IhnColor.bgSurface)
                        .overlay(RoundedRectangle(cornerRadius: 14).strokeBorder(IhnColor.border, lineWidth: 1))
                )
                .padding(.horizontal, 16)

                VStack(spacing: 10) {
                    if state.nodes.contains(where: { $0.cert == .mismatch }) {
                        IhnButton(title: "Re-pair Acer-HL", variant: .primary) { showRepair = true }
                    }
                    IhnButton(title: "Install CA on pi-garage", icon: "qrcode", variant: .secondary) { showPair = true }
                }
                .padding(16)

                Text("A mismatch means the node's cert chain no longer matches the Home CA on file. Re-pair to regenerate and re-trust.")
                    .ihnSecondary()
                    .padding(.horizontal, 20)
                    .padding(.bottom, 28)
            }
        }
        .background(IhnColor.bgPrimary.ignoresSafeArea())
        .navigationBarHidden(true)
        .sheet(isPresented: $showPair) { NavigationStack { PairScreen() } }
        .sheet(isPresented: $showRepair) { NavigationStack { RepairScreen() } }
    }
}

#Preview {
    NavigationStack { TrustScreen() }
        .environmentObject(AppState())
        .preferredColorScheme(.dark)
}
