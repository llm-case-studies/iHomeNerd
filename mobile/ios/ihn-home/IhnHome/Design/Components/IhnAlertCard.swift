import SwiftUI

// Renamed from IhnAlert to avoid colliding with SwiftUI's Alert presentation.

struct IhnAlertCard: View {
    let tone: IhnTone
    let title: String
    let message: String
    let timestamp: String?

    init(tone: IhnTone, title: String, message: String, timestamp: String? = nil) {
        self.tone = tone
        self.title = title
        self.message = message
        self.timestamp = timestamp
    }

    var body: some View {
        HStack(alignment: .top, spacing: 10) {
            ZStack {
                RoundedRectangle(cornerRadius: 6)
                    .fill(tone.fg.opacity(0.13))
                    .frame(width: 28, height: 28)
                Image(systemName: iconName)
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(tone.fg)
            }

            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(IhnFont.sans(13, weight: .semibold))
                    .foregroundStyle(IhnColor.textPrimary)
                Text(message)
                    .font(IhnFont.sans(12))
                    .foregroundStyle(IhnColor.textSecondary)
                    .lineLimit(3)
            }

            Spacer(minLength: 0)

            if let timestamp {
                Text(timestamp)
                    .font(IhnFont.mono(11))
                    .foregroundStyle(IhnColor.textSecondary)
            }
        }
        .padding(12)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(tone.fg.opacity(0.06))
                .overlay(RoundedRectangle(cornerRadius: 12).strokeBorder(tone.softBd, lineWidth: 1))
        )
    }

    private var iconName: String {
        switch tone {
        case .err:    return "exclamationmark.triangle.fill"
        case .warn:   return "info.circle.fill"
        case .ok:     return "checkmark.circle.fill"
        case .accent: return "info.circle.fill"
        case .neutral: return "info.circle.fill"
        }
    }
}
