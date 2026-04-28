import SwiftUI

struct PairScreen: View {
    @Environment(\.dismiss) private var dismiss
    @State private var installCode = "NERD-8F4K-2QX9"

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Pair new node").ihnH1()
                    Text("Scan this code on the new device to install your Home CA.")
                        .ihnSecondary()
                }
                .padding(.horizontal, 20)
                .padding(.top, 10)

                FauxQR()
                    .frame(width: 240, height: 240)
                    .padding(20)
                    .frame(maxWidth: .infinity)

                VStack(alignment: .leading, spacing: 10) {
                    Text("OR TYPE THE INSTALL CODE")
                        .font(IhnFont.sans(11, weight: .medium))
                        .tracking(1.0)
                        .foregroundStyle(IhnColor.textSecondary)
                    Text(installCode)
                        .font(IhnFont.mono(18, weight: .medium))
                        .tracking(1.5)
                        .foregroundStyle(IhnColor.textPrimary)
                }
                .padding(14)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(
                    RoundedRectangle(cornerRadius: 12)
                        .fill(IhnColor.bgSurface)
                        .overlay(RoundedRectangle(cornerRadius: 12).strokeBorder(IhnColor.border, lineWidth: 1))
                )
                .padding(.horizontal, 16)

                IhnButton(title: "Done", variant: .secondary) { dismiss() }
                    .padding(16)
            }
        }
        .background(IhnColor.bgPrimary.ignoresSafeArea())
        .toolbar {
            ToolbarItem(placement: .topBarLeading) {
                Button("Cancel") { dismiss() }
                    .foregroundStyle(IhnColor.accent)
            }
        }
    }
}

// Stylized QR — just a placeholder shape, not a real code. Real QR lives once
// the gateway's pairing endpoint is wired up.
private struct FauxQR: View {
    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 20)
                .fill(IhnColor.bgSurface)
                .overlay(RoundedRectangle(cornerRadius: 20).strokeBorder(IhnColor.border, lineWidth: 1))

            Canvas { ctx, size in
                let cell = size.width / 21
                func draw(_ x: Int, _ y: Int) {
                    let r = CGRect(x: CGFloat(x) * cell, y: CGFloat(y) * cell, width: cell, height: cell)
                    ctx.fill(Path(r), with: .color(IhnColor.textPrimary))
                }
                for y in 0..<21 {
                    for x in 0..<21 {
                        let isFinder = (x < 7 && y < 7) || (x > 13 && y < 7) || (x < 7 && y > 13)
                        if isFinder { continue }
                        let seed = (x * 31 + y * 17 + 7) % 11
                        if seed < 5 { draw(x, y) }
                    }
                }
                // Finder patterns
                for (ox, oy) in [(0,0), (14,0), (0,14)] {
                    let outer = CGRect(x: CGFloat(ox) * cell, y: CGFloat(oy) * cell, width: 7 * cell, height: 7 * cell)
                    ctx.fill(Path(outer), with: .color(IhnColor.textPrimary))
                    let mid = CGRect(x: CGFloat(ox+1) * cell, y: CGFloat(oy+1) * cell, width: 5 * cell, height: 5 * cell)
                    ctx.fill(Path(mid), with: .color(IhnColor.bgSurface))
                    let inner = CGRect(x: CGFloat(ox+2) * cell, y: CGFloat(oy+2) * cell, width: 3 * cell, height: 3 * cell)
                    ctx.fill(Path(inner), with: .color(IhnColor.textPrimary))
                }
            }
            .padding(20)
        }
    }
}

#Preview {
    NavigationStack { PairScreen() }
        .preferredColorScheme(.dark)
}
