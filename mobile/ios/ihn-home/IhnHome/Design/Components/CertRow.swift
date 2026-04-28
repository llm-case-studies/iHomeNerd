import SwiftUI

struct CertRow: View {
    let host: String
    let state: CertState
    let fingerprint: String
    var isLast: Bool = false

    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 12) {
                Circle()
                    .fill(tone.fg)
                    .frame(width: 8, height: 8)

                VStack(alignment: .leading, spacing: 1) {
                    Text(host)
                        .font(IhnFont.sans(14, weight: .medium))
                        .foregroundStyle(IhnColor.textPrimary)
                    Text(fingerprint)
                        .font(IhnFont.mono(11))
                        .foregroundStyle(IhnColor.textSecondary)
                }
                Spacer(minLength: 0)
                IhnChip(tone: tone, text: label, dot: false)
            }
            .padding(.vertical, 12)
            .padding(.horizontal, 16)

            if !isLast {
                Rectangle()
                    .fill(IhnColor.border)
                    .frame(height: 1)
            }
        }
    }

    private var tone: IhnTone {
        switch state {
        case .trusted:   return .ok
        case .mismatch:  return .err
        case .stale:     return .warn
        case .needs:     return .neutral
        }
    }

    private var label: String {
        switch state {
        case .trusted:   return "trusted"
        case .mismatch:  return "mismatch"
        case .stale:     return "stale"
        case .needs:     return "needs install"
        }
    }
}
