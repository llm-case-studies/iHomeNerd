import Foundation

// Tiny HTTP/1.1 parser + responder. Handles request line, headers, and a
// length-delimited body so POST endpoints (e.g. /v1/transcribe-audio) can
// read multipart uploads. No chunked transfer-encoding yet — the harness
// always sends Content-Length.

struct HTTPRequest {
    let method: String
    let path: String
    let httpVersion: String
    let headers: [String: String]
    let body: Data

    /// Returns nil if either headers haven't fully arrived yet, or
    /// Content-Length bytes haven't all been received. Caller keeps
    /// accumulating from the wire and re-parsing.
    static func parse(_ data: Data) -> HTTPRequest? {
        // Find end-of-headers (\r\n\r\n).
        guard let separatorRange = data.range(of: Data([0x0d, 0x0a, 0x0d, 0x0a])) else {
            return nil
        }
        let headerBytes = data.subdata(in: 0..<separatorRange.lowerBound)
        guard let raw = String(data: headerBytes, encoding: .utf8) else { return nil }
        let lines = raw.split(separator: "\r\n", omittingEmptySubsequences: false).map(String.init)
        guard let requestLine = lines.first else { return nil }
        let parts = requestLine.split(separator: " ", maxSplits: 2, omittingEmptySubsequences: true)
        guard parts.count == 3 else { return nil }
        var headers: [String: String] = [:]
        for line in lines.dropFirst() where !line.isEmpty {
            if let colon = line.firstIndex(of: ":") {
                let name = String(line[..<colon]).lowercased()
                let value = line[line.index(after: colon)...].trimmingCharacters(in: .whitespaces)
                headers[name] = value
            }
        }

        let bodyStart = separatorRange.upperBound
        let availableBodyBytes = data.count - bodyStart

        let contentLength: Int = {
            if let raw = headers["content-length"], let n = Int(raw) { return max(0, n) }
            return 0
        }()

        if availableBodyBytes < contentLength {
            return nil   // wait for more data
        }

        let body = contentLength > 0
            ? data.subdata(in: bodyStart..<(bodyStart + contentLength))
            : Data()

        return HTTPRequest(
            method: String(parts[0]),
            path: String(parts[1]),
            httpVersion: String(parts[2]),
            headers: headers,
            body: body
        )
    }

    /// Parse `Content-Type: application/x-www-form-urlencoded` body or query
    /// string into a dictionary. Last value wins on duplicate keys.
    func formFields() -> [String: String] {
        guard let raw = String(data: body, encoding: .utf8) else { return [:] }
        var out: [String: String] = [:]
        for pair in raw.split(separator: "&") {
            let parts = pair.split(separator: "=", maxSplits: 1, omittingEmptySubsequences: false)
            let key = parts.first.map(String.init)?.removingPercentEncoding ?? ""
            let value = parts.count > 1
                ? (String(parts[1]).removingPercentEncoding ?? "")
                : ""
            if !key.isEmpty { out[key] = value }
        }
        return out
    }
}

// Minimal multipart/form-data parser. Handles the shape that `curl -F` and
// `requests`/`httpx` emit: CRLF-delimited parts with Content-Disposition
// headers naming each field. Good enough for /v1/transcribe-audio's `file`
// + `language` + `task` form fields. Not a general-purpose codec.
struct MultipartPart {
    let name: String
    let filename: String?
    let contentType: String?
    let data: Data
}

enum Multipart {
    static func boundary(from contentType: String?) -> String? {
        guard let ct = contentType, ct.lowercased().contains("multipart/") else { return nil }
        // Parameter *names* are case-insensitive, but the boundary *value* is
        // case-sensitive — curl emits mixed-case boundaries. Match the name
        // against a lowercased copy but slice the value out of the original.
        let parts = ct.split(separator: ";").map { $0.trimmingCharacters(in: .whitespaces) }
        for part in parts where part.lowercased().hasPrefix("boundary=") {
            var b = String(part.dropFirst("boundary=".count))
            if b.hasPrefix("\""), b.hasSuffix("\""), b.count >= 2 {
                b.removeFirst(); b.removeLast()
            }
            return b
        }
        return nil
    }

    /// Returns nil if the body cannot be parsed against this boundary.
    static func parse(body: Data, boundary: String) -> [MultipartPart]? {
        let dashBoundary = Data(("--" + boundary).utf8)
        let crlf = Data([0x0d, 0x0a])

        // Split by `--<boundary>`. The first chunk before the first delimiter
        // is preamble (ignored). The last chunk after `--<boundary>--` is
        // epilogue (ignored).
        var ranges: [Range<Data.Index>] = []
        var search = body.startIndex
        while let r = body.range(of: dashBoundary, in: search..<body.endIndex) {
            ranges.append(r)
            search = r.upperBound
        }
        if ranges.count < 2 { return nil }

        var parts: [MultipartPart] = []
        for i in 0..<(ranges.count - 1) {
            // chunk lives between this delimiter's end and next delimiter's start.
            var chunkStart = ranges[i].upperBound
            // After the boundary marker, expect either "\r\n" (more parts) or
            // "--\r\n" / "--" (final boundary). Skip the CRLF if present.
            if chunkStart + 2 <= body.endIndex,
               body[chunkStart..<(chunkStart + 2)] == crlf {
                chunkStart += 2
            } else if chunkStart + 2 <= body.endIndex,
                      body.subdata(in: chunkStart..<(chunkStart + 2)) == Data("--".utf8) {
                continue   // closing boundary; no part here.
            }
            let chunkEnd = ranges[i + 1].lowerBound
            // Strip trailing CRLF that precedes the next boundary marker.
            var sliceEnd = chunkEnd
            if sliceEnd - 2 >= chunkStart,
               body[(sliceEnd - 2)..<sliceEnd] == crlf {
                sliceEnd -= 2
            }
            guard chunkStart <= sliceEnd else { continue }
            let chunk = body.subdata(in: chunkStart..<sliceEnd)
            if let part = parsePart(chunk) { parts.append(part) }
        }
        return parts
    }

    private static func parsePart(_ chunk: Data) -> MultipartPart? {
        // Headers end at \r\n\r\n inside the chunk.
        let sep = Data([0x0d, 0x0a, 0x0d, 0x0a])
        guard let r = chunk.range(of: sep) else { return nil }
        let headerBytes = chunk.subdata(in: 0..<r.lowerBound)
        let bodyBytes = chunk.subdata(in: r.upperBound..<chunk.endIndex)
        guard let raw = String(data: headerBytes, encoding: .utf8) else { return nil }
        var name: String?
        var filename: String?
        var contentType: String?
        for line in raw.split(separator: "\r\n", omittingEmptySubsequences: true) {
            let lower = line.lowercased()
            if lower.hasPrefix("content-disposition:") {
                // name="file"; filename="x.wav"
                for piece in line.split(separator: ";").dropFirst() {
                    let kv = piece.trimmingCharacters(in: .whitespaces)
                    if kv.hasPrefix("name=") {
                        name = unquote(String(kv.dropFirst("name=".count)))
                    } else if kv.hasPrefix("filename=") {
                        filename = unquote(String(kv.dropFirst("filename=".count)))
                    }
                }
            } else if lower.hasPrefix("content-type:") {
                contentType = String(line.dropFirst("content-type:".count)).trimmingCharacters(in: .whitespaces)
            }
        }
        guard let n = name else { return nil }
        return MultipartPart(name: n, filename: filename, contentType: contentType, data: bodyBytes)
    }

    private static func unquote(_ s: String) -> String {
        var x = s
        if x.hasPrefix("\""), x.hasSuffix("\""), x.count >= 2 {
            x.removeFirst(); x.removeLast()
        }
        return x
    }
}

enum HTTPResponse {
    static func json(_ payload: [String: Any], status: Int = 200) -> Data {
        let body: Data
        if JSONSerialization.isValidJSONObject(payload),
           let encoded = try? JSONSerialization.data(withJSONObject: payload, options: [.prettyPrinted, .sortedKeys]) {
            body = encoded
        } else {
            body = Data("{}".utf8)
        }
        return assemble(status: status,
                        contentType: "application/json; charset=utf-8",
                        body: body)
    }

    static func html(_ html: String, status: Int = 200) -> Data {
        return assemble(status: status,
                        contentType: "text/html; charset=utf-8",
                        body: Data(html.utf8))
    }

    static func text(_ status: Int, _ body: String) -> Data {
        return assemble(status: status,
                        contentType: "text/plain; charset=utf-8",
                        body: Data(body.utf8))
    }

    static func pem(_ pem: String, status: Int = 200) -> Data {
        return assemble(status: status,
                        contentType: "application/x-pem-file",
                        body: Data(pem.utf8))
    }

    static func mobileconfig(_ data: Data, status: Int = 200) -> Data {
        return assemble(status: status,
                        contentType: "application/x-apple-aspen-config",
                        body: data)
    }

    private static func assemble(status: Int,
                                 contentType: String,
                                 body: Data) -> Data {
        let reason: String
        switch status {
        case 200: reason = "OK"
        case 400: reason = "Bad Request"
        case 404: reason = "Not Found"
        case 500: reason = "Internal Server Error"
        case 502: reason = "Bad Gateway"
        case 503: reason = "Service Unavailable"
        default:  reason = "Status"
        }
        var head = ""
        head += "HTTP/1.1 \(status) \(reason)\r\n"
        head += "Content-Type: \(contentType)\r\n"
        head += "Content-Length: \(body.count)\r\n"
        head += "Connection: close\r\n"
        head += "Server: iHomeNerd-iOS/0.1\r\n"
        head += "\r\n"
        var out = Data(head.utf8)
        out.append(body)
        return out
    }
}
