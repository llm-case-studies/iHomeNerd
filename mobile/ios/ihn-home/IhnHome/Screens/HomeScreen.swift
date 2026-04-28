import SwiftUI

struct HomeScreen: View {
    @EnvironmentObject private var state: AppState
    @State private var showPair = false
    @State private var showRepair = false

    var body: some View {
        ScrollView {
            VStack(spacing: 0) {
                StickyHeader(home: state.homeName, trust: state.trustState, fetch: state.fetchState) {
                    Task { await state.refresh() }
                }

                if let info = state.servedBy {
                    ServedByCard(info: info, liveClientCount: state.liveClientCount)
                        .padding(.top, 16)
                }

                CapabilitiesStrip(response: state.snapshot?.capabilities)
                    .padding(.top, 12)

                TrustHero(state: state.trustState, fingerprint: state.homeCAFingerprint)
                    .padding(.top, 16)

                if state.trustState != .verified {
                    IhnButton(
                        title: state.trustState == .mismatch ? "Re-pair Acer-HL" : "Verify trust now",
                        variant: .primary
                    ) {
                        showRepair = true
                    }
                    .padding(.horizontal, 16)
                    .padding(.top, 12)
                }

                Eyebrow(text: "Quick actions")

                LazyVGrid(columns: [.init(.flexible(), spacing: 10), .init(.flexible(), spacing: 10)], spacing: 10) {
                    QuickTile(icon: "qrcode", label: "Pair new node", sublabel: "Scan install code", tone: .accent) {
                        showPair = true
                    }
                    QuickTile(icon: "bell.fill", label: "Alerts", sublabel: "2 active", tone: .warn, badge: 2) { }
                    QuickTile(icon: "arrow.clockwise", label: "Verify trust", sublabel: "Re-check all", tone: .ok) {
                        Task { await state.refresh() }
                    }
                    QuickTile(icon: "airplane", label: "Travel session", sublabel: "Running · 42m", tone: .accent) { }
                }
                .padding(.horizontal, 16)

                Eyebrow(text: "Nodes · \(state.nodes.count) · \(onlineCount) online", topPadding: 4)

                VStack(spacing: 8) {
                    ForEach(state.nodes) { node in
                        NodePill(node: node)
                    }
                }
                .padding(.horizontal, 16)

                Color.clear.frame(height: 24)
            }
        }
        .background(IhnColor.bgPrimary.ignoresSafeArea())
        .toolbar(.hidden, for: .navigationBar)
        .task { await state.refresh() }
        .sheet(isPresented: $showPair) { NavigationStack { PairScreen() } }
        .sheet(isPresented: $showRepair) { NavigationStack { RepairScreen() } }
    }

    private var onlineCount: Int {
        state.nodes.filter { $0.health == .ok }.count
    }
}

private struct StickyHeader: View {
    let home: String
    let trust: TrustState
    let fetch: FetchState
    let onRefresh: () -> Void

    var body: some View {
        HStack(alignment: .center) {
            HStack(spacing: 8) {
                Image(systemName: "house.fill")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundStyle(IhnColor.accent)
                VStack(alignment: .leading, spacing: -1) {
                    Text("YOUR HOME")
                        .font(IhnFont.sans(11, weight: .medium))
                        .tracking(0.7)
                        .foregroundStyle(IhnColor.textSecondary)
                    Text(home)
                        .font(IhnFont.sans(15, weight: .semibold))
                        .foregroundStyle(IhnColor.textPrimary)
                    Text(fetch.label)
                        .font(IhnFont.sans(10))
                        .foregroundStyle(IhnColor.textTertiary)
                        .lineLimit(1)
                }
            }
            Spacer()
            Button(action: onRefresh) {
                HStack(spacing: 6) {
                    Circle().fill(toneFor(trust).fg).frame(width: 6, height: 6)
                    Text(label(trust))
                        .font(IhnFont.sans(11, weight: .semibold))
                        .foregroundStyle(toneFor(trust).fg)
                    Image(systemName: "arrow.clockwise")
                        .font(.system(size: 10, weight: .semibold))
                        .foregroundStyle(toneFor(trust).fg)
                }
                .padding(.vertical, 5)
                .padding(.horizontal, 10)
                .background(
                    Capsule()
                        .fill(toneFor(trust).fg.opacity(0.08))
                        .overlay(Capsule().strokeBorder(toneFor(trust).fg.opacity(0.30), lineWidth: 1))
                )
            }
            .buttonStyle(.plain)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .background(IhnColor.bgPrimary.opacity(0.88))
        .overlay(Rectangle().fill(IhnColor.border.opacity(0.6)).frame(height: 1), alignment: .bottom)
    }

    private func toneFor(_ t: TrustState) -> IhnTone {
        switch t { case .verified: return .ok; case .stale: return .warn; case .mismatch: return .err }
    }

    private func label(_ t: TrustState) -> String {
        switch t { case .verified: return "trusted"; case .stale: return "stale"; case .mismatch: return "mismatch" }
    }
}

#Preview {
    NavigationStack { HomeScreen() }
        .environmentObject(AppState())
        .preferredColorScheme(.dark)
}
