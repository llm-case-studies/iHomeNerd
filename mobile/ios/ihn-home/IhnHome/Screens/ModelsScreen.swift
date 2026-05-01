import SwiftUI
import MLXLLM

struct ModelsScreen: View {
    @EnvironmentObject private var state: AppState
    @State private var loading = false
    @State private var loadedModel: String? = nil
    @State private var errorMessage: String? = nil

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

                VStack(spacing: 0) {
                    VStack(alignment: .leading, spacing: 12) {
                        HStack {
                            Text("Qwen 2.5 1.5B (4-bit)")
                                .font(.system(size: 16, weight: .semibold))
                                .foregroundColor(.white)
                            Spacer()
                            if loadedModel != nil {
                                Text("Loaded")
                                    .font(.system(size: 13, weight: .medium))
                                    .foregroundColor(IhnColor.success)
                            } else {
                                Text("Not Loaded")
                                    .font(.system(size: 13))
                                    .foregroundColor(.gray)
                            }
                        }
                        
                        if let err = errorMessage {
                            Text(err)
                                .foregroundColor(IhnColor.destructive)
                                .font(.system(size: 13))
                        }
                        
                        if loading {
                            ProgressView()
                                .progressViewStyle(CircularProgressViewStyle(tint: .white))
                                .frame(maxWidth: .infinity, alignment: .leading)
                        } else {
                            IhnButton(title: loadedModel != nil ? "Loaded" : "Download & Load", variant: .primary) {
                                if loadedModel == nil {
                                    loadModel()
                                }
                            }
                            .disabled(loadedModel != nil)
                        }
                    }
                    .padding(16)
                }
                .background(
                    RoundedRectangle(cornerRadius: 14)
                        .fill(IhnColor.bgSurface)
                        .overlay(RoundedRectangle(cornerRadius: 14).strokeBorder(IhnColor.border, lineWidth: 1))
                )
                .padding(.horizontal, 16)
                
                Spacer(minLength: 40)
            }
        }
        .background(IhnColor.bgPrimary.ignoresSafeArea())
        .navigationBarHidden(true)
        .onAppear {
            loadedModel = MLXEngine.shared.getLoadedModelName()
        }
    }
    
    private func loadModel() {
        loading = true
        errorMessage = nil
        Task {
            do {
                // mlx-swift-examples provides a pre-configured Qwen 2.5 configuration we can pull
                try await MLXEngine.shared.loadFromHub(configuration: ModelRegistry.qwen2_5_1_5b_4bit)
                await MainActor.run {
                    self.loadedModel = ModelRegistry.qwen2_5_1_5b_4bit.name
                    self.loading = false
                }
            } catch {
                await MainActor.run {
                    self.errorMessage = error.localizedDescription
                    self.loading = false
                }
            }
        }
    }
}

#Preview {
    ModelsScreen()
        .environmentObject(AppState())
        .preferredColorScheme(.dark)
}
