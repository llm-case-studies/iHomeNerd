import SwiftUI

private struct ChatMessage: Identifiable, Equatable {
    enum Role { case user, assistant }
    let id = UUID()
    let role: Role
    var text: String
    var tokensPerSecond: Double? = nil
    var processingTime: TimeInterval? = nil
}

struct ChatScreen: View {
    @State private var messages: [ChatMessage] = []
    @State private var draft: String = ""
    @State private var isGenerating: Bool = false
    @State private var errorMessage: String? = nil
    @State private var loadedModel: String? = nil
    @FocusState private var draftFocused: Bool

    var body: some View {
        VStack(spacing: 0) {
            header
            Divider().background(IhnColor.border)
            messageList
            inputBar
        }
        .background(IhnColor.bgPrimary.ignoresSafeArea())
        .navigationBarHidden(true)
        .onAppear { refreshLoadedModel() }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Chat").ihnH1()
            if let m = loadedModel {
                Text("Model: \(m)")
                    .font(.system(size: 12))
                    .foregroundColor(IhnColor.textTertiary)
                    .lineLimit(1)
                    .truncationMode(.middle)
            } else {
                Text("No model loaded — open the Models tab and load Qwen or Gemma first.")
                    .ihnSecondary()
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 20)
        .padding(.top, 10)
        .padding(.bottom, 8)
    }

    private var messageList: some View {
        ScrollViewReader { proxy in
            ScrollView {
                VStack(spacing: 10) {
                    if messages.isEmpty {
                        Text("Send a prompt to your on-device MLX model. Conversation is not persisted.")
                            .font(.system(size: 13))
                            .foregroundColor(IhnColor.textTertiary)
                            .multilineTextAlignment(.center)
                            .padding(.top, 24)
                            .padding(.horizontal, 24)
                    }
                    ForEach(messages) { msg in
                        bubble(for: msg).id(msg.id)
                    }
                    if let err = errorMessage {
                        Text(err)
                            .font(.system(size: 13))
                            .foregroundColor(IhnColor.error)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(.horizontal, 16)
                    }
                }
                .padding(.vertical, 12)
            }
            .onChange(of: messages) { _, _ in
                if let last = messages.last {
                    withAnimation { proxy.scrollTo(last.id, anchor: .bottom) }
                }
            }
        }
    }

    private func bubble(for msg: ChatMessage) -> some View {
        let isUser = msg.role == .user
        return VStack(alignment: isUser ? .trailing : .leading, spacing: 4) {
            Text(msg.text.isEmpty ? "…" : msg.text)
                .font(.system(size: 15))
                .foregroundColor(isUser ? .white : IhnColor.textPrimary)
                .padding(.vertical, 10)
                .padding(.horizontal, 14)
                .background(
                    RoundedRectangle(cornerRadius: 14)
                        .fill(isUser ? IhnColor.accent : IhnColor.bgSurface)
                        .overlay(
                            RoundedRectangle(cornerRadius: 14)
                                .strokeBorder(isUser ? Color.clear : IhnColor.border, lineWidth: 1)
                        )
                )
            if msg.role == .assistant, let tps = msg.tokensPerSecond, let pt = msg.processingTime {
                Text(String(format: "%.1f tok/s · %.2fs", tps, pt))
                    .font(.system(size: 11))
                    .foregroundColor(IhnColor.textTertiary)
            }
        }
        .frame(maxWidth: .infinity, alignment: isUser ? .trailing : .leading)
        .padding(.horizontal, 16)
    }

    private var inputBar: some View {
        HStack(spacing: 8) {
            TextField("Ask anything…", text: $draft, axis: .vertical)
                .lineLimit(1...4)
                .focused($draftFocused)
                .padding(.vertical, 10)
                .padding(.horizontal, 12)
                .background(
                    RoundedRectangle(cornerRadius: 12)
                        .fill(IhnColor.bgSurface)
                        .overlay(RoundedRectangle(cornerRadius: 12).strokeBorder(IhnColor.border, lineWidth: 1))
                )
                .foregroundColor(IhnColor.textPrimary)
                .disabled(isGenerating)

            Button(action: send) {
                Image(systemName: isGenerating ? "hourglass" : "arrow.up.circle.fill")
                    .font(.system(size: 28))
                    .foregroundColor(canSend ? IhnColor.accent : IhnColor.textTertiary)
            }
            .disabled(!canSend)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .background(IhnColor.bgPrimary)
    }

    private var canSend: Bool {
        !isGenerating && !draft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    private func refreshLoadedModel() {
        Task {
            let name = await MLXEngine.shared.loadedModelName()
            await MainActor.run { self.loadedModel = name }
        }
    }

    private func send() {
        let prompt = draft.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !prompt.isEmpty, !isGenerating else { return }
        draft = ""
        errorMessage = nil
        messages.append(ChatMessage(role: .user, text: prompt))
        let placeholder = ChatMessage(role: .assistant, text: "")
        messages.append(placeholder)
        let placeholderId = placeholder.id
        isGenerating = true

        Task {
            do {
                let result = try await MLXEngine.shared.generate(prompt: prompt)
                await MainActor.run {
                    if let idx = messages.firstIndex(where: { $0.id == placeholderId }) {
                        messages[idx].text = result.text
                        messages[idx].tokensPerSecond = result.tokensPerSecond
                        messages[idx].processingTime = result.processingTime
                    }
                    isGenerating = false
                    refreshLoadedModel()
                }
            } catch {
                await MainActor.run {
                    if let idx = messages.firstIndex(where: { $0.id == placeholderId }) {
                        messages.remove(at: idx)
                    }
                    errorMessage = error.localizedDescription
                    isGenerating = false
                }
            }
        }
    }
}

#Preview {
    ChatScreen()
        .environmentObject(AppState())
        .preferredColorScheme(.dark)
}
