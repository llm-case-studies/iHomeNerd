import SwiftUI

struct RepairScreen: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var state: AppState

    private struct Step: Identifiable {
        let id = UUID()
        let label: String
        let kind: Kind
        enum Kind { case done, active, pending }
    }

    private let steps: [Step] = [
        .init(label: "Revoking stale cert",         kind: .done),
        .init(label: "Generating new key on Acer-HL", kind: .done),
        .init(label: "Signing with Home CA",        kind: .active),
        .init(label: "Verifying chain",             kind: .pending)
    ]

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Re-pairing Acer-HL").ihnH1()
                    Text("This takes a few seconds. Trust will be re-verified automatically.")
                        .ihnSecondary()
                }
                .padding(.horizontal, 20)
                .padding(.top, 10)

                VStack(alignment: .leading, spacing: 12) {
                    ForEach(Array(steps.enumerated()), id: \.element.id) { idx, step in
                        HStack(spacing: 12) {
                            stepBubble(step: step, index: idx)
                            Text(step.label)
                                .font(IhnFont.sans(14))
                                .foregroundStyle(step.kind == .pending ? IhnColor.textSecondary : IhnColor.textPrimary)
                            Spacer(minLength: 0)
                        }
                    }
                }
                .padding(16)
                .background(
                    RoundedRectangle(cornerRadius: 14)
                        .fill(IhnColor.bgSurface)
                        .overlay(RoundedRectangle(cornerRadius: 14).strokeBorder(IhnColor.border, lineWidth: 1))
                )
                .padding(16)

                IhnButton(title: "Run in background", variant: .secondary) { dismiss() }
                    .padding(.horizontal, 16)

                Color.clear.frame(height: 28)
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

    @ViewBuilder
    private func stepBubble(step: Step, index: Int) -> some View {
        let color: Color = {
            switch step.kind {
            case .done:    return IhnColor.success
            case .active:  return IhnColor.accent
            case .pending: return IhnColor.textTertiary
            }
        }()
        ZStack {
            Circle()
                .fill(color.opacity(0.10))
                .overlay(Circle().strokeBorder(color.opacity(0.30), lineWidth: 1))
                .frame(width: 26, height: 26)
            switch step.kind {
            case .done:
                Image(systemName: "checkmark")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundStyle(color)
            case .active:
                Circle().fill(color).frame(width: 8, height: 8)
            case .pending:
                Text("\(index + 1)")
                    .font(IhnFont.sans(11, weight: .medium))
                    .foregroundStyle(color)
            }
        }
    }
}

#Preview {
    NavigationStack { RepairScreen() }
        .environmentObject(AppState())
        .preferredColorScheme(.dark)
}
