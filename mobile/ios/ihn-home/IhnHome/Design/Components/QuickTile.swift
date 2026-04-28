import SwiftUI

struct QuickTile: View {
    let icon: String
    let label: String
    let sublabel: String?
    var tone: IhnTone = .neutral
    var badge: Int? = nil
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            ZStack(alignment: .topTrailing) {
                VStack(alignment: .leading, spacing: 10) {
                    ZStack {
                        RoundedRectangle(cornerRadius: 10)
                            .fill(tone.fg.opacity(0.10))
                            .overlay(RoundedRectangle(cornerRadius: 10).strokeBorder(tone.fg.opacity(0.20), lineWidth: 1))
                            .frame(width: 32, height: 32)
                        Image(systemName: icon)
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundStyle(tone.fg)
                    }
                    VStack(alignment: .leading, spacing: 2) {
                        Text(label)
                            .font(IhnFont.sans(14, weight: .semibold))
                            .foregroundStyle(IhnColor.textPrimary)
                        if let sublabel {
                            Text(sublabel)
                                .font(IhnFont.sans(11))
                                .foregroundStyle(IhnColor.textSecondary)
                                .lineLimit(1)
                        }
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(14)
                .background(
                    RoundedRectangle(cornerRadius: 16)
                        .fill(IhnColor.bgSurface)
                        .overlay(RoundedRectangle(cornerRadius: 16).strokeBorder(IhnColor.border, lineWidth: 1))
                )

                if let badge {
                    Text("\(badge)")
                        .font(IhnFont.sans(10, weight: .semibold))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 5)
                        .frame(minWidth: 18, minHeight: 18)
                        .background(Capsule().fill(IhnColor.error))
                        .padding(10)
                }
            }
        }
        .buttonStyle(.plain)
    }
}
