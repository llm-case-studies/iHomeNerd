import SwiftUI

// Tiny uppercase label that introduces a section. Used everywhere — quick
// actions, nodes, alerts, handoff.

struct Eyebrow: View {
    let text: String
    var topPadding: CGFloat = 6

    var body: some View {
        Text(text)
            .font(IhnFont.sans(11, weight: .medium))
            .tracking(1.2)
            .textCase(.uppercase)
            .foregroundStyle(IhnColor.textSecondary)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.top, topPadding)
            .padding(.bottom, 8)
            .padding(.horizontal, 20)
    }
}
