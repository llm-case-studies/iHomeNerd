import SwiftUI
import MLXLLM
import MLXLMCommon

struct ModelsScreen: View {
    @EnvironmentObject private var state: AppState
    @State private var loadingModelId: String? = nil
    @State private var loadedModel: String? = nil
    @State private var errorMessage: String? = nil
    @State private var errorModelId: String? = nil

    // Sizes are repo-as-of-2026-05-01 figures (safetensors footprint on HF).
    // ramWhenLoadedMB ≈ download × 1.3 — covers KV cache + activations during
    // generation. These are headline numbers users actually feel; the param
    // count + quantization moves to a "Tech" footnote so it's documented but
    // not the lead.
    private let models: [OfflineModelOption] = [
        OfflineModelOption(
            name: "Qwen 2.5 Instruct",
            configuration: LLMRegistry.qwen2_5_1_5b,
            downloadSizeMB: 960,
            ramWhenLoadedMB: 1250,
            parameterSize: "1.5B parameters",
            quantization: "4-bit",
            note: "Balanced small chat model"
        ),
        OfflineModelOption(
            name: "Gemma 4 E2B Instruct",
            configuration: LLMRegistry.gemma4_e2b_it_4bit,
            downloadSizeMB: 1500,
            ramWhenLoadedMB: 2000,
            parameterSize: "2B parameters",
            quantization: "4-bit",
            note: "Google Gemma family"
        )
    ]

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Models").ihnH1()
                    Text("Manage offline language models hosted on this node.")
                        .ihnSecondary()
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
                .padding(.horizontal, 20)
                .padding(.top, 10)

                Eyebrow(text: "Apple Silicon MLX")

                VStack(spacing: 10) {
                    ForEach(models) { model in
                        VStack(alignment: .leading, spacing: 12) {
                            HStack(alignment: .top, spacing: 12) {
                                VStack(alignment: .leading, spacing: 5) {
                                    Text(model.name)
                                        .font(.system(size: 16, weight: .semibold))
                                        .foregroundColor(.white)
                                    Text(model.note)
                                        .font(.system(size: 13))
                                        .foregroundColor(IhnColor.textSecondary)
                                    Text("Download: ~\(formatSize(model.downloadSizeMB)) · RAM when loaded: ~\(formatSize(model.ramWhenLoadedMB))")
                                        .font(.system(size: 13, weight: .medium))
                                        .foregroundColor(IhnColor.textPrimary)
                                    Text("Tech: \(model.parameterSize) · \(model.quantization)")
                                        .font(.system(size: 12))
                                        .foregroundColor(IhnColor.textTertiary)
                                    Text(model.configuration.name)
                                        .font(.system(size: 11))
                                        .foregroundColor(IhnColor.textTertiary)
                                        .lineLimit(1)
                                        .truncationMode(.middle)
                                }

                                Spacer(minLength: 12)

                                statusLabel(for: model)
                            }

                            if let err = errorMessage, errorModelId == model.id {
                                Text(err)
                                    .foregroundColor(IhnColor.error)
                                    .font(.system(size: 13))
                            }

                            if loadingModelId == model.id {
                                ProgressView()
                                    .progressViewStyle(CircularProgressViewStyle(tint: .white))
                                    .frame(maxWidth: .infinity, alignment: .leading)
                            } else {
                                IhnButton(title: buttonTitle(for: model), variant: .primary) {
                                    loadModel(model)
                                }
                                .disabled(loadedModel == model.id || loadingModelId != nil)
                            }
                        }
                        .padding(16)
                        .background(
                            RoundedRectangle(cornerRadius: 14)
                                .fill(IhnColor.bgSurface)
                                .overlay(RoundedRectangle(cornerRadius: 14).strokeBorder(IhnColor.border, lineWidth: 1))
                        )
                    }
                }
                .padding(.horizontal, 16)
                
                Spacer(minLength: 40)
            }
        }
        .background(IhnColor.bgPrimary.ignoresSafeArea())
        .navigationBarHidden(true)
        .onAppear {
            Task {
                let modelName = await MLXEngine.shared.loadedModelName()
                await MainActor.run {
                    loadedModel = modelName
                }
            }
        }
    }

    @ViewBuilder
    private func statusLabel(for model: OfflineModelOption) -> some View {
        if loadedModel == model.id {
            Text("Loaded")
                .font(.system(size: 13, weight: .medium))
                .foregroundColor(IhnColor.success)
        } else if loadingModelId == model.id {
            Text("Loading")
                .font(.system(size: 13, weight: .medium))
                .foregroundColor(IhnColor.accent)
        } else {
            Text("Not Loaded")
                .font(.system(size: 13))
                .foregroundColor(.gray)
        }
    }

    private func buttonTitle(for model: OfflineModelOption) -> String {
        if loadedModel == model.id {
            return "Loaded"
        }
        if loadedModel != nil {
            return "Switch Model"
        }
        return "Download & Load"
    }
    
    private func loadModel(_ model: OfflineModelOption) {
        loadingModelId = model.id
        errorMessage = nil
        errorModelId = nil
        Task {
            do {
                try await MLXEngine.shared.loadFromHub(configuration: model.configuration)
                await MainActor.run {
                    self.loadedModel = model.id
                    self.loadingModelId = nil
                }
            } catch {
                await MainActor.run {
                    self.errorMessage = error.localizedDescription
                    self.errorModelId = model.id
                    self.loadingModelId = nil
                }
            }
        }
    }
}

private struct OfflineModelOption: Identifiable {
    let name: String
    let configuration: ModelConfiguration
    let downloadSizeMB: Int
    let ramWhenLoadedMB: Int
    let parameterSize: String
    let quantization: String
    let note: String

    var id: String { configuration.name }
}

private func formatSize(_ mb: Int) -> String {
    if mb >= 1024 {
        let gb = Double(mb) / 1024.0
        return String(format: "%.1f GB", gb)
    }
    return "\(mb) MB"
}

#Preview {
    ModelsScreen()
        .environmentObject(AppState())
        .preferredColorScheme(.dark)
}
