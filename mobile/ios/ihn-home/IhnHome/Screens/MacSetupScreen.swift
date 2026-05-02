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
