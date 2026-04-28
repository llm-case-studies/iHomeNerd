import SwiftUI

// The brand calls for Inter (sans), Space Grotesk (display), JetBrains Mono (mono).
// v1 falls back to system fonts so the app builds without bundled .ttf assets.
// Bundling the real typefaces is a follow-up — see project.yml + Info.plist
// UIAppFonts when we add them.

enum IhnFont {
    // Sans (body, UI labels) — falls back to SF Pro
    static func sans(_ size: CGFloat, weight: Font.Weight = .regular) -> Font {
        .system(size: size, weight: weight, design: .default)
    }

    // Display (headlines, panel titles) — falls back to SF Pro Rounded for slightly
    // more character than plain SF Pro.
    static func display(_ size: CGFloat, weight: Font.Weight = .bold) -> Font {
        .system(size: size, weight: weight, design: .rounded)
    }

    // Mono (fingerprints, IPs, install codes) — falls back to SF Mono
    static func mono(_ size: CGFloat, weight: Font.Weight = .regular) -> Font {
        .system(size: size, weight: weight, design: .monospaced)
    }
}

// Convenience semantic styles, mapped to the .h1/.h2/.label/.mono classes from
// colors_and_type.css.

extension View {
    func ihnH1() -> some View {
        self.font(IhnFont.display(28, weight: .bold))
            .foregroundStyle(IhnColor.textPrimary)
            .tracking(-0.3)
    }

    func ihnH2() -> some View {
        self.font(IhnFont.display(22, weight: .semibold))
            .foregroundStyle(IhnColor.textPrimary)
            .tracking(-0.2)
    }

    func ihnPanelTitle() -> some View {
        self.font(IhnFont.sans(18, weight: .medium))
            .foregroundStyle(IhnColor.textPrimary)
    }

    func ihnBody() -> some View {
        self.font(IhnFont.sans(15, weight: .regular))
            .foregroundStyle(IhnColor.textPrimary)
    }

    func ihnSecondary() -> some View {
        self.font(IhnFont.sans(13, weight: .regular))
            .foregroundStyle(IhnColor.textSecondary)
    }

    func ihnLabel() -> some View {
        self.font(IhnFont.sans(12, weight: .medium))
            .foregroundStyle(IhnColor.textSecondary)
            .tracking(0.3)
    }

    func ihnOverline() -> some View {
        self.font(IhnFont.sans(11, weight: .medium))
            .foregroundStyle(IhnColor.textSecondary)
            .tracking(1.0)
            .textCase(.uppercase)
    }

    func ihnMono(_ size: CGFloat = 13) -> some View {
        self.font(IhnFont.mono(size))
            .foregroundStyle(IhnColor.textPrimary)
            .tracking(0.4)
    }
}
