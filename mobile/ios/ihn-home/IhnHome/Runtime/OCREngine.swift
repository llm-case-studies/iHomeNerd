import Foundation
import Vision
import CoreGraphics
import ImageIO

enum OCREngine {
    struct Result: Sendable {
        let text: String
        let language: String?
        let lineCount: Int
    }

    enum OCRError: Error, LocalizedError {
        case decodeFailed(String)
        case recognitionFailed(String)

        var errorDescription: String? {
            switch self {
            case .decodeFailed(let m): return "OCR decode failed: \(m)"
            case .recognitionFailed(let m): return "OCR recognition failed: \(m)"
            }
        }
    }

    static var supportedRecognitionLanguages: [String] {
        return (try? VNRecognizeTextRequest.supportedRecognitionLanguages(for: .accurate, revision: VNRecognizeTextRequestRevision3)) ?? []
    }

    static func recognize(imageData: Data, languageHint: String? = nil) async throws -> Result {
        guard let source = CGImageSourceCreateWithData(imageData as CFData, nil),
              let cgImage = CGImageSourceCreateImageAtIndex(source, 0, nil) else {
            throw OCRError.decodeFailed("could not decode image bytes")
        }

        return try await withCheckedThrowingContinuation { continuation in
            let request = VNRecognizeTextRequest { request, error in
                if let error = error {
                    continuation.resume(throwing: OCRError.recognitionFailed(error.localizedDescription))
                    return
                }

                guard let observations = request.results as? [VNRecognizedTextObservation] else {
                    continuation.resume(throwing: OCRError.recognitionFailed("unexpected result type"))
                    return
                }

                let lines = observations.compactMap { $0.topCandidates(1).first?.string }
                
                let result = Result(
                    text: lines.joined(separator: "\n"),
                    language: languageHint,
                    lineCount: lines.count
                )
                continuation.resume(returning: result)
            }

            request.recognitionLevel = .accurate
            request.usesLanguageCorrection = true
            
            if let hint = languageHint {
                request.recognitionLanguages = [hint]
            } else {
                if #available(iOS 16.0, *) {
                    request.automaticallyDetectsLanguage = true
                }
            }

            let handler = VNImageRequestHandler(cgImage: cgImage, orientation: .up, options: [:])
            do {
                try handler.perform([request])
            } catch {
                continuation.resume(throwing: OCRError.recognitionFailed(error.localizedDescription))
            }
        }
    }
}
