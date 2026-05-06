import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { createStore } from "./store.js";

const PORT = parseInt(process.env.PORT || "17790", 10);

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      if (!raw.trim()) {
        resolve(null);
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(Object.assign(new Error("invalid JSON body"), { statusCode: 400 }));
      }
    });
    req.on("error", reject);
  });
}

function json(res, statusCode, data) {
  const body = JSON.stringify(data);
  res.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

function buildChatResponse(summaryText) {
  return {
    id: `chatcmpl-${randomUUID()}`,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: "clerk-v1",
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: summaryText || "No activity recorded yet.",
        },
        finish_reason: "stop",
      },
    ],
  };
}

export function createApp(store) {
  store = store || createStore();

  const server = createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    const method = req.method;
    const path = url.pathname;

    try {
      if (method === "POST" && path === "/v1/log") {
        const body = await readBody(req);
        if (body === null) {
          json(res, 400, { error: "request body is required" });
          return;
        }
        try {
          const entry = store.append(body);
          json(res, 201, entry);
        } catch (e) {
          if (e.code === "INVALID_ENTRY") {
            json(res, 400, { error: e.message });
          } else {
            throw e;
          }
        }
        return;
      }

      if (method === "GET" && path === "/v1/state") {
        json(res, 200, store.getState());
        return;
      }

      if (method === "GET" && path === "/v1/summary") {
        json(res, 200, store.getSummary());
        return;
      }

      if (method === "POST" && path === "/v1/chat/completions") {
        const body = await readBody(req);
        if (body === null) {
          json(res, 400, { error: "request body is required" });
          return;
        }
        const { summary } = store.getSummary();
        json(res, 200, buildChatResponse(summary));
        return;
      }

      if (method === "GET" && path === "/health") {
        json(res, 200, { status: "ok" });
        return;
      }

      json(res, 404, { error: "not found" });
    } catch (e) {
      json(res, e.statusCode || 500, { error: e.message || "internal server error" });
    }
  });

  return server;
}

export function start(port) {
  port = port || PORT;
  const store = createStore();
  const server = createApp(store);
  return new Promise((resolve) => {
    server.listen(port, () => resolve(server));
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const srv = await start();
  console.log(`office-clerk listening on http://127.0.0.1:${srv.address().port}`);
}
