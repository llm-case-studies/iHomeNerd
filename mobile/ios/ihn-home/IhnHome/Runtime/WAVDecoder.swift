import Foundation
import AVFoundation

// Decodes audio bytes (WAV, MP3, AAC — anything AVAudioFile reads) into the
// 16kHz mono Float32 buffer that WhisperKit expects. Used by the
// /v1/transcribe-audio endpoint to feed remote uploads through the same
// engine the Listen tab does.
//
// AVAudioFile only reads from URLs, so we round-trip through a temp file.
// The temp file is deleted immediately after read; we do not retain audio
// bytes on disk.

enum WAVDecoder {

    enum DecodeError: Error, LocalizedError {
        case writeFailed(String)
        case openFailed(String)
        case readFailed(String)
        case convertFailed(String)
        case empty

        var errorDescription: String? {
            switch self {
            case .writeFailed(let m): return "Failed to write temp audio file: \(m)"
            case .openFailed(let m):  return "Failed to open audio file: \(m)"
            case .readFailed(let m):  return "Failed to read audio file: \(m)"
            case .convertFailed(let m): return "Failed to convert audio: \(m)"
            case .empty: return "Decoded audio is empty."
            }
        }
    }

    /// Returns 16kHz mono Float32 samples plus the source duration in seconds.
    static func toMono16kFloat(_ data: Data, suggestedExtension: String? = nil) throws -> (samples: [Float], duration: Double) {
        let ext = suggestedExtension?.lowercased() ?? "wav"
        let tmp = FileManager.default.temporaryDirectory
            .appendingPathComponent("ihn-asr-\(UUID().uuidString).\(ext)")
        do {
            try data.write(to: tmp)
        } catch {
            throw DecodeError.writeFailed(error.localizedDescription)
        }
        defer { try? FileManager.default.removeItem(at: tmp) }

        let file: AVAudioFile
        do {
            file = try AVAudioFile(forReading: tmp)
        } catch {
            throw DecodeError.openFailed(error.localizedDescription)
        }

        let inFormat = file.processingFormat
        let frameCount = AVAudioFrameCount(file.length)
        guard frameCount > 0 else { throw DecodeError.empty }

        guard let inBuffer = AVAudioPCMBuffer(pcmFormat: inFormat, frameCapacity: frameCount) else {
            throw DecodeError.readFailed("could not allocate input buffer")
        }
        do {
            try file.read(into: inBuffer)
        } catch {
            throw DecodeError.readFailed(error.localizedDescription)
        }

        let sourceDuration = Double(frameCount) / inFormat.sampleRate

        guard let target = AVAudioFormat(
            commonFormat: .pcmFormatFloat32,
            sampleRate: 16_000,
            channels: 1,
            interleaved: false
        ) else {
            throw DecodeError.convertFailed("could not create target format")
        }

        // Fast path: already 16kHz mono Float32 — just copy out.
        if inFormat.sampleRate == 16_000,
           inFormat.channelCount == 1,
           inFormat.commonFormat == .pcmFormatFloat32,
           let chans = inBuffer.floatChannelData {
            let count = Int(inBuffer.frameLength)
            return (Array(UnsafeBufferPointer(start: chans[0], count: count)), sourceDuration)
        }

        guard let converter = AVAudioConverter(from: inFormat, to: target) else {
            throw DecodeError.convertFailed("could not create converter")
        }

        let outCapacity = AVAudioFrameCount(
            ceil(Double(frameCount) * 16_000.0 / inFormat.sampleRate)
        ) + 1024
        guard let outBuffer = AVAudioPCMBuffer(pcmFormat: target, frameCapacity: outCapacity) else {
            throw DecodeError.convertFailed("could not allocate output buffer")
        }

        var producedInput = false
        var convertError: NSError?
        let status = converter.convert(to: outBuffer, error: &convertError) { _, inputStatus in
            if producedInput {
                inputStatus.pointee = .endOfStream
                return nil
            }
            producedInput = true
            inputStatus.pointee = .haveData
            return inBuffer
        }
        if status == .error {
            throw DecodeError.convertFailed(convertError?.localizedDescription ?? "unknown")
        }

        guard let chans = outBuffer.floatChannelData else {
            throw DecodeError.convertFailed("missing float channel data")
        }
        let count = Int(outBuffer.frameLength)
        guard count > 0 else { throw DecodeError.empty }
        return (Array(UnsafeBufferPointer(start: chans[0], count: count)), sourceDuration)
    }
}
