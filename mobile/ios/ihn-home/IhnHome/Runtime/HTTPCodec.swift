import Foundation

// Tiny HTTP/1.1 parser + responder. Only what the iOS NodeRuntime stub needs:
// request line + headers, no body parsing yet. POST handling lands when the
// real /v1/* endpoints come over from Android.

struct HTTPRequest {
    let method: String
    let path: String
    let httpVersion: String
    let headers: [String: String]

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
        return HTTPRequest(
            method: String(parts[0]),
            path: String(parts[1]),
            httpVersion: String(parts[2]),
            headers: headers
        )
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

    private static func assemble(status: Int,
                                 contentType: String,
                                 body: Data) -> Data {
        let reason: String
        switch status {
        case 200: reason = "OK"
        case 404: reason = "Not Found"
        case 500: reason = "Internal Server Error"
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
