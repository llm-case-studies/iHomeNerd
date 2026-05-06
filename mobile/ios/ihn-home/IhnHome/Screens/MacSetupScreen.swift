import SwiftUI
import UIKit

struct MacSetupScreen: View {
    @EnvironmentObject private var runtime: NodeRuntime
    @State private var copiedURL: String?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Mac Brain").ihnH1()
                    Text("Start on this iPhone, then promote an M-series Mac into the always-on home brain.")
                        .ihnSecondary()
                        .frame(maxWidth: 340, alignment: .leading)
                }
                .padding(.horizontal, 20)
                .padding(.top, 10)

                statusCard
                    .padding(16)

                if runtime.isRunning, !runtime.pairingRequests.isEmpty {
                    pairingRequestsSection
                        .padding(16)
                }

                VStack(spacing: 10) {
                    IhnButton(
                        title: runtime.isRunning ? "iPhone setup server is running" : "Start iPhone setup server",
                        icon: runtime.isRunning ? "checkmark.circle.fill" : "play.fill",
                        variant: runtime.isRunning ? .secondary : .primary
                    ) {
                        if !runtime.isRunning {
                            runtime.start()
                        }
                    }

                    if runtime.isRunning {
                        IhnButton(title: "Stop setup server", icon: "stop.fill", variant: .danger) {
                            runtime.stop()
                        }
                    }
                }
                .padding(.horizontal, 16)

                Eyebrow(text: "Open from your Mac")

                VStack(alignment: .leading, spacing: 10) {
                    if setupURLs.isEmpty {
                        Text(runtime.isRunning
                             ? "No reachable IPv4 address detected yet."
                             : "Start the setup server to get a local Mac setup address.")
                            .ihnSecondary()
                    } else {
                        ForEach(setupURLs, id: \.self) { url in
                            Button {
                                UIPasteboard.general.string = url
                                copiedURL = url
                            } label: {
                                HStack(alignment: .center, spacing: 10) {
                                    Image(systemName: copiedURL == url ? "checkmark.circle.fill" : "doc.on.doc")
                                        .foregroundStyle(copiedURL == url ? IhnColor.success : IhnColor.accent)
                                    Text(url)
                                        .font(IhnFont.mono(12))
                                        .foregroundStyle(IhnColor.textPrimary)
                                        .lineLimit(2)
                                        .multilineTextAlignment(.leading)
                                    Spacer(minLength: 0)
                                }
                                .padding(12)
                                .background(
                                    RoundedRectangle(cornerRadius: IhnRadius.card)
                                        .fill(IhnColor.bgSurface)
                                        .overlay(RoundedRectangle(cornerRadius: IhnRadius.card).strokeBorder(IhnColor.border, lineWidth: 1))
                                )
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    Text("Use the same Wi-Fi network. The Mac connects to this iPhone's local setup page; the iPhone does not silently install anything on the Mac.")
                        .ihnSecondary()
                        .padding(.top, 4)
                }
                .padding(.horizontal, 16)

                Eyebrow(text: "Flow")

                VStack(spacing: 8) {
                    FlowRow(index: 1, title: "Approve the Mac", description: "The Mac opens this iPhone's local setup page and the phone asks you to approve the pairing.")
                    FlowRow(index: 2, title: "Run a trusted Mac installer", description: "Production Mac software should be Mac App Store or Developer ID signed and notarized.")
                    FlowRow(index: 3, title: "Native MLX brain", description: "On Apple Silicon, the Mac installs as an iHN launchd node and uses MLX for local chat.")
                    FlowRow(index: 4, title: "iPhone becomes controller", description: "This iPhone remains a portable node and remote while the Mac handles always-on work.")
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 28)
            }
        }
        .background(IhnColor.bgPrimary.ignoresSafeArea())
        .navigationBarHidden(true)
        .task {
            while !Task.isCancelled {
                await runtime.refreshPairingState()
                try? await Task.sleep(nanoseconds: 2_000_000_000)
            }
        }
    }

    private var setupURLs: [String] {
        runtime.lanAddresses.map { "http://\($0):\(runtime.bootstrapPort)/setup/mac" }
    }

    private var statusCard: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(runtime.isRunning ? "READY FOR MAC" : "PHONE FIRST")
                .font(IhnFont.sans(11, weight: .semibold))
                .tracking(1.0)
                .foregroundStyle(runtime.isRunning ? IhnColor.success : IhnColor.accent)
            Text(runtime.isRunning ? "Mac setup page is available" : "Use this phone as the first node")
                .font(IhnFont.display(20, weight: .semibold))
                .foregroundStyle(IhnColor.textPrimary)
                .tracking(-0.2)
            Text(runtime.isRunning
                 ? "Open the local setup address from the Mac you want to promote."
                 : "Strong iPhones can host a session node now. When you want always-on service and larger models, promote a Mac.")
                .ihnSecondary()
            if runtime.isRunning, runtime.pendingPairingCount > 0 {
                Text("\(runtime.pendingPairingCount) pending pairing request\(runtime.pendingPairingCount == 1 ? "" : "s")")
                    .font(IhnFont.sans(13, weight: .semibold))
                    .foregroundStyle(IhnColor.warning)
                    .padding(.top, 2)
            }
            if runtime.isRunning, !runtime.caFingerprintSHA256.isEmpty {
                Text("Home CA \(elide(runtime.caFingerprintSHA256))")
                    .font(IhnFont.mono(11))
                    .foregroundStyle(IhnColor.textSecondary)
                    .padding(.top, 4)
            }
        }
        .padding(18)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(runtime.isRunning ? IhnColor.successSoftBg : IhnColor.accentSoftBg)
                .overlay(
                    RoundedRectangle(cornerRadius: 16)
                        .strokeBorder(runtime.isRunning ? IhnColor.successSoftBd : IhnColor.accentSoftBd, lineWidth: 1)
                )
        )
    }

    private var pairingRequestsSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("PAIRING REQUESTS")
                .font(IhnFont.sans(11, weight: .semibold))
                .tracking(1.0)
                .foregroundStyle(IhnColor.warning)

            ForEach(runtime.pairingRequests) { req in
                pairingRequestCard(req)
            }
        }
    }

    private func pairingRequestCard(_ req: PairingRequest) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                VStack(alignment: .leading, spacing: 3) {
                    Text(req.hostname)
                        .font(IhnFont.sans(15, weight: .semibold))
                        .foregroundStyle(IhnColor.textPrimary)
                    Text(req.ip)
                        .font(IhnFont.mono(12))
                        .foregroundStyle(IhnColor.textSecondary)
                }
                Spacer()
                statusBadge(req.status)
            }

            HStack(spacing: 12) {
                if !req.arch.isEmpty {
                    Label(req.arch, systemImage: "cpu")
                        .font(IhnFont.mono(10))
                        .foregroundStyle(IhnColor.textSecondary)
                }
                if !req.backend.isEmpty {
                    Label(req.backend, systemImage: "brain")
                        .font(IhnFont.mono(10))
                        .foregroundStyle(IhnColor.textSecondary)
                }
                Text(relativeAge(req.createdAt))
                    .font(IhnFont.mono(10))
                    .foregroundStyle(IhnColor.textSecondary)
            }

            Text(elideRequestId(req.id))
                .font(IhnFont.mono(9))
                .foregroundStyle(IhnColor.textTertiary)
                .padding(.top, 2)

            if req.status == .pending {
                HStack(spacing: 10) {
                    IhnButton(title: "Approve", icon: "checkmark.shield.fill", variant: .primary) {
                        Task { await runtime.approvePairing(id: req.id) }
                    }
                    IhnButton(title: "Deny", icon: "xmark.shield.fill", variant: .danger) {
                        Task { await runtime.denyPairing(id: req.id) }
                    }
                }
                .padding(.top, 4)
            }
        }
        .padding(14)
        .background(
            RoundedRectangle(cornerRadius: IhnRadius.card)
                .fill(IhnColor.bgSurface)
                .overlay(RoundedRectangle(cornerRadius: IhnRadius.card).strokeBorder(req.status == .pending ? IhnColor.warning.opacity(0.4) : IhnColor.border, lineWidth: 1))
        )
    }

    private func statusBadge(_ status: PairingStatus) -> some View {
        let (label, color): (String, Color) = {
            switch status {
            case .pending: return ("PENDING", IhnColor.warning)
            case .approved: return ("APPROVED", IhnColor.success)
            case .denied: return ("DENIED", IhnColor.error)
            case .expired: return ("EXPIRED", IhnColor.textSecondary)
            }
        }()
        return Text(label)
            .font(IhnFont.sans(10, weight: .bold))
            .tracking(0.8)
            .foregroundStyle(color)
            .padding(.horizontal, 8)
            .padding(.vertical, 3)
            .background(color.opacity(0.12))
            .clipShape(Capsule())
    }

    private func relativeAge(_ date: Date) -> String {
        let interval = Date().timeIntervalSince(date)
        if interval < 60 { return "just now" }
        if interval < 3600 { return "\(Int(interval / 60))m ago" }
        return "\(Int(interval / 3600))h ago"
    }

    private func elideRequestId(_ id: String) -> String {
        guard id.count > 12 else { return id }
        return "\(id.prefix(8))…"
    }

    private func elide(_ raw: String) -> String {
        let pairs = raw.split(separator: ":")
        guard pairs.count >= 6 else { return raw }
        return "\(pairs.prefix(3).joined(separator: ":")):...:\(pairs.suffix(3).joined(separator: ":"))"
    }
}

private struct FlowRow: View {
    let index: Int
    let title: String
    let description: String

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Text("\(index)")
                .font(IhnFont.mono(12, weight: .semibold))
                .foregroundStyle(.white)
                .frame(width: 26, height: 26)
                .background(Circle().fill(IhnColor.accent))
            VStack(alignment: .leading, spacing: 3) {
                Text(title)
                    .font(IhnFont.sans(15, weight: .semibold))
                    .foregroundStyle(IhnColor.textPrimary)
                Text(description)
                    .ihnSecondary()
            }
            Spacer(minLength: 0)
        }
        .padding(14)
        .background(
            RoundedRectangle(cornerRadius: IhnRadius.card)
                .fill(IhnColor.bgSurface)
                .overlay(RoundedRectangle(cornerRadius: IhnRadius.card).strokeBorder(IhnColor.border, lineWidth: 1))
        )
    }
}

#Preview {
    NavigationStack { MacSetupScreen() }
        .environmentObject(NodeRuntime())
        .preferredColorScheme(.dark)
}
