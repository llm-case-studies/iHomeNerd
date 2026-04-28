import SwiftUI

struct NodePill: View {
    let node: NodeSummary
    var onTap: () -> Void = {}

    var body: some View {
        Button(action: onTap) {
            HStack(spacing: 12) {
                Circle()
                    .fill(node.health.tone.fg)
                    .frame(width: 10, height: 10)

                VStack(alignment: .leading, spacing: 2) {
                    HStack(spacing: 8) {
                        Text(node.host)
                            .font(IhnFont.sans(14, weight: .semibold))
                            .foregroundStyle(IhnColor.textPrimary)
                        Text("· \(node.role.displayLabel)")
                            .font(IhnFont.sans(11))
                            .foregroundStyle(IhnColor.textSecondary)
                    }
                    Text(node.stateLine)
                        .font(IhnFont.sans(11))
                        .foregroundStyle(IhnColor.textSecondary)
                        .lineLimit(1)
                }

                Spacer(minLength: 0)

                if node.cert == .mismatch {
                    IhnChip(tone: .err, text: "cert", dot: false)
                } else {
                    Image(systemName: "chevron.right")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(IhnColor.textTertiary)
                }
            }
            .padding(.vertical, 12)
            .padding(.horizontal, 14)
            .background(
                RoundedRectangle(cornerRadius: 14)
                    .fill(IhnColor.bgSurface)
                    .overlay(RoundedRectangle(cornerRadius: 14).strokeBorder(IhnColor.border, lineWidth: 1))
            )
        }
        .buttonStyle(.plain)
    }
}
