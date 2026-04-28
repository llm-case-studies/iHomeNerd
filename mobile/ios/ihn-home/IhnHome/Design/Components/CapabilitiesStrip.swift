import SwiftUI

// Compact view of which capabilities the served-by node currently offers.
// Maps the flat `{name: bool}` from /capabilities into chips with friendly
// labels. Intentionally small — the dense capability detail (tier,
// latency_class, languages, quality_modes) can live on a future detail
// screen. This is the "what can this node do for me" glance.

struct CapabilitiesStrip: View {
    let response: CapabilitiesResponse?

    private static let displayOrder: [(key: String, label: String, icon: String)] = [
        ("transcribe_audio",   "ASR",            "waveform"),
        ("synthesize_speech",  "TTS",            "speaker.wave.2.fill"),
        ("translate_text",     "Translate",      "character.bubble"),
        ("compare_pinyin",     "Pinyin compare", "character.book.closed"),
        ("normalize_pinyin",   "Pinyin norm",    "text.alignleft")
    ]

    var body: some View {
        if let flat = response?.capabilities, !flat.isEmpty {
            VStack(alignment: .leading, spacing: 0) {
                FlowRow(spacing: 6) {
                    ForEach(Self.displayOrder, id: \.key) { spec in
                        let on = flat[spec.key] ?? false
                        if flat.keys.contains(spec.key) {
                            CapabilityChip(label: spec.label, icon: spec.icon, on: on)
                        }
                    }
                }
                .padding(.horizontal, 16)
            }
        }
    }
}

private struct CapabilityChip: View {
    let label: String
    let icon: String
    let on: Bool

    var body: some View {
        HStack(spacing: 5) {
            Image(systemName: icon)
                .font(.system(size: 10, weight: .semibold))
            Text(label)
                .font(IhnFont.sans(11, weight: .medium))
        }
        .foregroundStyle(on ? IhnColor.success : IhnColor.textTertiary)
        .padding(.vertical, 5)
        .padding(.horizontal, 9)
        .background(
            Capsule()
                .fill(on ? IhnColor.successSoftBg : IhnColor.bgInput)
                .overlay(Capsule().strokeBorder(on ? IhnColor.successSoftBd : IhnColor.border, lineWidth: 1))
        )
    }
}

// Minimal flow-layout container so chips wrap onto multiple lines without
// stretching to fill the grid.
private struct FlowRow<Content: View>: View {
    let spacing: CGFloat
    @ViewBuilder let content: Content

    init(spacing: CGFloat = 6, @ViewBuilder content: () -> Content) {
        self.spacing = spacing
        self.content = content()
    }

    var body: some View {
        FlowLayout(spacing: spacing) { content }
    }
}

private struct FlowLayout: Layout {
    let spacing: CGFloat

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let maxW = proposal.width ?? .infinity
        var lineW: CGFloat = 0
        var totalH: CGFloat = 0
        var lineH: CGFloat = 0
        for v in subviews {
            let s = v.sizeThatFits(.unspecified)
            if lineW + s.width > maxW {
                totalH += lineH + spacing
                lineW = 0
                lineH = 0
            }
            lineW += s.width + spacing
            lineH = max(lineH, s.height)
        }
        totalH += lineH
        return CGSize(width: maxW.isFinite ? maxW : lineW, height: totalH)
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        var x: CGFloat = bounds.minX
        var y: CGFloat = bounds.minY
        var lineH: CGFloat = 0
        for v in subviews {
            let s = v.sizeThatFits(.unspecified)
            if x + s.width > bounds.maxX {
                x = bounds.minX
                y += lineH + spacing
                lineH = 0
            }
            v.place(at: CGPoint(x: x, y: y), proposal: ProposedViewSize(s))
            x += s.width + spacing
            lineH = max(lineH, s.height)
        }
    }
}
