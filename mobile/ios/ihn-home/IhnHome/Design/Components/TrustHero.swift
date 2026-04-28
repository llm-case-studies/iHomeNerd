import SwiftUI

// The hero card that opens the Home screen. Trust as the first thing the
// user sees, per the design seed (mobile/design/.../ios_controller/app.jsx).

struct TrustHero: View {
    let state: TrustState
    let fingerprint: String

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(alignment: .top, spacing: 14) {
                ZStack {
                    RoundedRectangle(cornerRadius: 16)
                        .fill(tone.fg.opacity(0.12))
                        .overlay(RoundedRectangle(cornerRadius: 16).strokeBorder(tone.fg.opacity(0.30), lineWidth: 1))
                        .frame(width: 56, height: 56)
                    Image(systemName: state == .verified ? "checkmark.shield.fill" : "shield.fill")
                        .font(.system(size: 26, weight: .medium))
                        .foregroundStyle(tone.fg)
                        .opacity(state == .verified ? 1.0 : 0.95)
                }

                VStack(alignment: .leading, spacing: 4) {
                    Text(headline)
                        .font(IhnFont.display(22, weight: .bold))
                        .foregroundStyle(IhnColor.textPrimary)
                        .tracking(-0.2)
                    Text(subline)
                        .font(IhnFont.sans(13))
                        .foregroundStyle(IhnColor.textSecondary)
                }

                Spacer(minLength: 0)
            }

            HStack {
                Text(fingerprint)
                    .font(IhnFont.mono(11))
                    .tracking(0.5)
                    .foregroundStyle(IhnColor.textPrimary)
                Spacer()
                Text("HOME CA")
                    .font(IhnFont.sans(10, weight: .medium))
                    .tracking(1.2)
                    .foregroundStyle(tone.fg)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 10)
            .background(
                RoundedRectangle(cornerRadius: 8)
                    .fill(Color(hex: 0x0F1117, opacity: 0.5))
                    .overlay(RoundedRectangle(cornerRadius: 8).strokeBorder(IhnColor.border, lineWidth: 1))
            )
        }
        .padding(20)
        .background(
            RoundedRectangle(cornerRadius: 20)
                .fill(tone.softBg)
                .overlay(RoundedRectangle(cornerRadius: 20).strokeBorder(tone.fg.opacity(0.30), lineWidth: 1))
        )
        .padding(.horizontal, 16)
    }

    private var tone: IhnTone {
        switch state {
        case .verified: return .ok
        case .stale:    return .warn
        case .mismatch: return .err
        }
    }

    private var headline: String {
        switch state {
        case .verified: return "Home CA verified"
        case .stale:    return "Verification stale"
        case .mismatch: return "Trust mismatch"
        }
    }

    private var subline: String {
        switch state {
        case .verified: return "4 h ago · all nodes match"
        case .stale:    return "Last check 3 days ago"
        case .mismatch: return "1 node doesn't match Home CA"
        }
    }
}
