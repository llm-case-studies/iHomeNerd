import SwiftUI

enum IhnButtonVariant {
    case primary, secondary, danger
}

struct IhnButton: View {
    let title: String
    var icon: String? = nil
    var variant: IhnButtonVariant = .primary
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 8) {
                if let icon { Image(systemName: icon) }
                Text(title)
            }
            .font(IhnFont.sans(15, weight: .semibold))
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .padding(.horizontal, 16)
            .background(background)
            .foregroundStyle(foreground)
            .overlay(
                RoundedRectangle(cornerRadius: IhnRadius.lg)
                    .strokeBorder(borderColor, lineWidth: 1)
            )
            .clipShape(RoundedRectangle(cornerRadius: IhnRadius.lg))
        }
        .buttonStyle(.plain)
    }

    private var background: Color {
        switch variant {
        case .primary:    return IhnColor.accent
        case .secondary:  return IhnColor.bgSurface
        case .danger:     return Color.clear
        }
    }

    private var foreground: Color {
        switch variant {
        case .primary:    return .white
        case .secondary:  return IhnColor.textPrimary
        case .danger:     return IhnColor.error
        }
    }

    private var borderColor: Color {
        switch variant {
        case .primary:    return Color.clear
        case .secondary:  return IhnColor.border
        case .danger:     return IhnColor.errorSoftBd
        }
    }
}
