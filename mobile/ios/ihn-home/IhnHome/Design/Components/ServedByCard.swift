import SwiftUI

// The first card on Home. Carries the product's central proof claim:
// this page was served by a device on your LAN, not a cloud service.
// Show enough identity (hostname, IP, latency, OS, RAM) that the user
// can verify it themselves.

struct ServedByCard: View {
    let info: ServedByInfo
    let liveClientCount: Int

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 8) {
                Image(systemName: "antenna.radiowaves.left.and.right")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(IhnColor.success)
                Text("SERVED LOCALLY")
                    .font(IhnFont.sans(11, weight: .semibold))
                    .tracking(1.2)
                    .foregroundStyle(IhnColor.success)
                Spacer()
                if let latency = info.latencyMs {
                    Text("\(latency) ms")
                        .font(IhnFont.mono(11))
                        .foregroundStyle(IhnColor.textSecondary)
                }
            }

            VStack(alignment: .leading, spacing: 4) {
                Text(info.hostname)
                    .font(IhnFont.display(20, weight: .semibold))
                    .foregroundStyle(IhnColor.textPrimary)
                    .tracking(-0.2)
                    .lineLimit(1)

                HStack(spacing: 6) {
                    Text(info.ip)
                        .font(IhnFont.mono(12))
                        .foregroundStyle(IhnColor.textSecondary)
                    if let v = info.version {
                        Text("· v\(v)")
                            .font(IhnFont.sans(12))
                            .foregroundStyle(IhnColor.textSecondary)
                    }
                }
            }

            HStack(spacing: 8) {
                if let os = info.os, let arch = info.arch {
                    Tag("\(os) · \(arch)")
                }
                if let ram = info.ramGB {
                    Tag("\(ram) GB RAM")
                }
                if liveClientCount > 0 {
                    Tag("\(liveClientCount) connected", tone: .accent)
                }
            }

            Text("Not from any cloud. This page came from your home network.")
                .font(IhnFont.sans(11))
                .foregroundStyle(IhnColor.textTertiary)
                .padding(.top, 2)
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(IhnColor.successSoftBg)
                .overlay(RoundedRectangle(cornerRadius: 16).strokeBorder(IhnColor.successSoftBd, lineWidth: 1))
        )
        .padding(.horizontal, 16)
    }

    private struct Tag: View {
        let text: String
        var tone: IhnTone = .neutral

        init(_ text: String, tone: IhnTone = .neutral) {
            self.text = text
            self.tone = tone
        }

        var body: some View {
            Text(text)
                .font(IhnFont.sans(11, weight: .medium))
                .foregroundStyle(tone == .neutral ? IhnColor.textSecondary : tone.fg)
                .padding(.vertical, 3)
                .padding(.horizontal, 8)
                .background(
                    Capsule()
                        .fill(tone == .neutral ? IhnColor.bgInput : tone.softBg)
                        .overlay(Capsule().strokeBorder(tone == .neutral ? IhnColor.border : tone.softBd, lineWidth: 1))
                )
        }
    }
}
