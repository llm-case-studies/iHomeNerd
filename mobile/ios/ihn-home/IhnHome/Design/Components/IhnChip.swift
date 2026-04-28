import SwiftUI

struct IhnChip: View {
    let tone: IhnTone
    let text: String
    var dot: Bool = true

    var body: some View {
        HStack(spacing: 5) {
            if dot {
                Circle()
                    .fill(tone.fg)
                    .frame(width: 5, height: 5)
            }
            Text(text)
                .font(IhnFont.sans(11, weight: .medium))
                .foregroundStyle(tone.fg)
        }
        .padding(.vertical, 2)
        .padding(.horizontal, 8)
        .background(
            Capsule()
                .fill(tone.softBg)
                .overlay(Capsule().strokeBorder(tone.softBd, lineWidth: 1))
        )
    }
}
