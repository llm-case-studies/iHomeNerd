import SwiftUI

struct NodeScreen: View {
    @EnvironmentObject private var runtime: NodeRuntime

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                VStack(alignment: .leading, spacing: 6) {
                    Text("This node").ihnH1()
                    Text(runtime.isRunning
                         ? "Serving on :\(runtime.port) · advertised as iHomeNerd on \(runtime.advertisedHostname)"
                         : "NodeRuntime stopped — flip the toggle to host this iPhone as an iHN node.")
                        .ihnSecondary()
                }
                .padding(.horizontal, 20)
                .padding(.top, 10)

                Toggle(isOn: Binding(
                    get: { runtime.isRunning },
                    set: { newValue in
                        if newValue { runtime.start() } else { runtime.stop() }
                    }
                )) {
                    HStack(spacing: 8) {
                        Image(systemName: runtime.isRunning ? "wifi" : "wifi.slash")
                            .foregroundStyle(runtime.isRunning ? IhnColor.accent : IhnColor.textSecondary)
                        Text(runtime.isRunning ? "Hosting iHN node" : "Host as iHN node")
                            .font(IhnFont.sans(15, weight: .medium))
                            .foregroundStyle(IhnColor.textPrimary)
                    }
                }
                .toggleStyle(SwitchToggleStyle(tint: IhnColor.accent))
                .padding(.horizontal, 20)
                .padding(.top, 18)

                if runtime.isRunning {
                    runningCard
                        .padding(16)
                }

                if let err = runtime.lastError {
                    Text(err)
                        .ihnSecondary()
                        .foregroundStyle(.red)
                        .padding(.horizontal, 20)
                        .padding(.top, 12)
                }

                if let connErr = runtime.lastConnectionError {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Last connection error (\(runtime.connectionFailures) total)")
                            .font(IhnFont.sans(11, weight: .semibold))
                            .tracking(1.0)
                            .foregroundStyle(.orange)
                        Text(connErr)
                            .font(IhnFont.mono(11))
                            .foregroundStyle(IhnColor.textSecondary)
                            .textSelection(.enabled)
                    }
                    .padding(.horizontal, 20)
                    .padding(.top, 12)
                }

                Eyebrow(text: "How to reach it")
                VStack(alignment: .leading, spacing: 10) {
                    Text("From any LAN client, browse:")
                        .ihnSecondary()
                    ForEach(runtime.lanAddresses, id: \.self) { ip in
                        HStack {
                            Image(systemName: "link")
                                .foregroundStyle(IhnColor.accent)
                            Text("https://\(ip):\(runtime.port)/")
                                .font(IhnFont.mono(13))
                                .foregroundStyle(IhnColor.textPrimary)
                                .textSelection(.enabled)
                        }
                    }
                    if runtime.lanAddresses.isEmpty && runtime.isRunning {
                        Text("No reachable IPv4 address detected on this device.")
                            .ihnSecondary()
                    }
                    Text("avahi-browse -rt _ihomenerd._tcp from a Linux box should also list this node while the toggle is on.")
                        .ihnSecondary()
                        .padding(.top, 6)
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 28)
            }
        }
        .background(IhnColor.bgPrimary.ignoresSafeArea())
        .navigationBarHidden(true)
    }

    private var runningCard: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("LIVE")
                .font(IhnFont.sans(11, weight: .semibold))
                .tracking(1.0)
                .foregroundStyle(IhnColor.accent)
            Text("\(runtime.requestCount) request\(runtime.requestCount == 1 ? "" : "s") served")
                .font(IhnFont.display(20, weight: .semibold))
                .foregroundStyle(IhnColor.textPrimary)
                .tracking(-0.2)
            if !runtime.fingerprintSHA256.isEmpty {
                Text("SHA-256 \(elide(runtime.fingerprintSHA256))")
                    .font(IhnFont.mono(11))
                    .foregroundStyle(IhnColor.textSecondary)
                    .padding(.top, 4)
            }
            if !runtime.signingPreflight.isEmpty {
                Text("Signing: \(runtime.signingPreflight)")
                    .font(IhnFont.mono(14))
                    .foregroundStyle(runtime.signingPreflight.hasPrefix("OK")
                                     ? IhnColor.textSecondary : .red)
                    .textSelection(.enabled)
                    .fixedSize(horizontal: false, vertical: true)
                    .padding(.top, 6)
            }
            if let started = runtime.startedAt {
                Text("Started \(Self.timeFmt.string(from: started))")
                    .font(IhnFont.sans(12))
                    .foregroundStyle(IhnColor.textSecondary)
            }
        }
        .padding(18)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(IhnColor.accentSoftBg)
                .overlay(RoundedRectangle(cornerRadius: 16).strokeBorder(IhnColor.accentSoftBd, lineWidth: 1))
        )
    }

    private func elide(_ raw: String) -> String {
        let pairs = raw.split(separator: ":")
        guard pairs.count >= 6 else { return raw }
        let head = pairs.prefix(3).joined(separator: ":")
        let tail = pairs.suffix(3).joined(separator: ":")
        return "\(head):…:\(tail)"
    }

    private static let timeFmt: DateFormatter = {
        let f = DateFormatter()
        f.timeStyle = .short
        return f
    }()
}

#Preview {
    NavigationStack { NodeScreen() }
        .environmentObject(NodeRuntime())
        .preferredColorScheme(.dark)
}
