import SwiftUI

// Color tokens lifted from mobile/design/claude/2026-04-24-initial-concepts/colors_and_type.css.
// Dark theme is primary. Light theme tokens are aspirational and not yet wired.

extension Color {
    init(hex: UInt32, opacity: Double = 1.0) {
        let r = Double((hex >> 16) & 0xFF) / 255
        let g = Double((hex >>  8) & 0xFF) / 255
        let b = Double( hex        & 0xFF) / 255
        self.init(.sRGB, red: r, green: g, blue: b, opacity: opacity)
    }
}

enum IhnColor {
    // Surfaces
    static let bgPrimary    = Color(hex: 0x0F1117)
    static let bgSurface    = Color(hex: 0x1A1D27)
    static let bgInput      = Color(hex: 0x252830)
    static let border       = Color(hex: 0x2E3140)

    // Text
    static let textPrimary    = Color(hex: 0xE4E6EB)
    static let textSecondary  = Color(hex: 0x8B8FA3)
    static let textTertiary   = Color(hex: 0x5A5F72)

    // Accent
    static let accent       = Color(hex: 0x4F8CFF)
    static let accentHover  = Color(hex: 0x6BA0FF)
    static let accentSoftBg = Color(hex: 0x4F8CFF, opacity: 0.10)
    static let accentSoftBd = Color(hex: 0x4F8CFF, opacity: 0.20)

    // Status
    static let success       = Color(hex: 0x34D399)
    static let warning       = Color(hex: 0xFBBF24)
    static let error         = Color(hex: 0xF87171)

    static let successSoftBg = Color(hex: 0x34D399, opacity: 0.10)
    static let successSoftBd = Color(hex: 0x34D399, opacity: 0.20)
    static let warningSoftBg = Color(hex: 0xFBBF24, opacity: 0.10)
    static let warningSoftBd = Color(hex: 0xFBBF24, opacity: 0.20)
    static let errorSoftBg   = Color(hex: 0xF87171, opacity: 0.10)
    static let errorSoftBd   = Color(hex: 0xF87171, opacity: 0.20)
}

enum IhnTone {
    case ok, warn, err, accent, neutral

    var fg: Color {
        switch self {
        case .ok:       return IhnColor.success
        case .warn:     return IhnColor.warning
        case .err:      return IhnColor.error
        case .accent:   return IhnColor.accent
        case .neutral:  return IhnColor.textSecondary
        }
    }

    var softBg: Color {
        switch self {
        case .ok:       return IhnColor.successSoftBg
        case .warn:     return IhnColor.warningSoftBg
        case .err:      return IhnColor.errorSoftBg
        case .accent:   return IhnColor.accentSoftBg
        case .neutral:  return IhnColor.bgInput
        }
    }

    var softBd: Color {
        switch self {
        case .ok:       return IhnColor.successSoftBd
        case .warn:     return IhnColor.warningSoftBd
        case .err:      return IhnColor.errorSoftBd
        case .accent:   return IhnColor.accentSoftBd
        case .neutral:  return IhnColor.border
        }
    }
}

enum IhnRadius {
    static let input:  CGFloat =  6
    static let button: CGFloat =  6
    static let card:   CGFloat =  8
    static let lg:     CGFloat = 12
    static let xl:     CGFloat = 16
    static let xxl:    CGFloat = 24
    static let pill:   CGFloat = 9999
}

enum IhnSpace {
    static let xs:  CGFloat =  4
    static let sm:  CGFloat =  8
    static let md:  CGFloat = 12
    static let lg:  CGFloat = 16
    static let xl:  CGFloat = 20
    static let xxl: CGFloat = 24
}
