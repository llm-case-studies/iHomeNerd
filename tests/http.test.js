import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { createApp } from "../service/server.js";
import { createStore } from "../service/store.js";

function fetchFrom(port, method, path, body) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "127.0.0.1",
      port,
      method,
      path,
      headers: {},
    };
    if (body !== undefined && body !== null) {
      const payload = typeof body === "string" ? body : JSON.stringify(body);
      options.headers["Content-Type"] = "application/json";
      options.headers["Content-Length"] = Buffer.byteLength(payload);
      options._body = payload;
    }
    const req = http.request(options, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => {
        const raw = Buffer.concat(chunks).toString("utf8");
        let data;
        try {
          data = raw ? JSON.parse(raw) : null;
        } catch {
          data = raw;
        }
        resolve({ status: res.statusCode, headers: res.headers, data });
      });
    });
    req.on("error", reject);
    if (options._body) {
      req.write(options._body);
    }
    req.end();
  });
}

describe("HTTP endpoints", () => {
  let store;
  let server;
  let port;

  before(() => {
    store = createStore();
    server = createApp(store);
    return new Promise((resolve) => {
      server.listen(0, () => {
        port = server.address().port;
        resolve();
      });
    });
  });

  after(() => {
    return new Promise((resolve) => server.close(resolve));
  });

  function req(method, path, body) {
    return fetchFrom(port, method, path, body);
  }

  describe("GET /health", () => {
    it("returns ok", async () => {
      const res = await req("GET", "/health");
      assert.equal(res.status, 200);
      assert.equal(res.data.status, "ok");
    });
  });

  describe("POST /v1/log", () => {
    it("stores an actor_state_update and returns 201", async () => {
      const res = await req("POST", "/v1/log", {
        type: "actor_state_update",
        actor: "alex",
        data: { state: "working", task: "bootstrap" },
      });
      assert.equal(res.status, 201);
      assert.equal(res.data.type, "actor_state_update");
      assert.equal(res.data.actor, "alex");
      assert.ok(res.data.id);
      assert.ok(res.data.timestamp);
    });

    it("stores a system_event and returns 201", async () => {
      const res = await req("POST", "/v1/log", {
        type: "system_event",
        data: { message: "server started" },
      });
      assert.equal(res.status, 201);
      assert.equal(res.data.type, "system_event");
    });

    it("returns 400 for empty body", async () => {
      const res = await req("POST", "/v1/log");
      assert.equal(res.status, 400);
    });

    it("returns 400 for invalid entry type", async () => {
      const res = await req("POST", "/v1/log", {
        type: "bogus_type",
      });
      assert.equal(res.status, 400);
      assert.ok(res.data.error);
    });

    it("returns 400 for non-JSON body", async () => {
      const res = await fetchFrom(port, "POST", "/v1/log", "not json");
      assert.equal(res.status, 400);
    });
  });

  describe("GET /v1/state", () => {
    it("returns current actor state after log entries", async () => {
      await req("POST", "/v1/log", {
        type: "actor_state_update",
        actor: "alex",
        data: { state: "testing" },
      });
      const res = await req("GET", "/v1/state");
      assert.equal(res.status, 200);
      assert.ok(res.data.actors);
      assert.equal(res.data.actors.alex.state, "testing");
    });
  });

  describe("GET /v1/summary", () => {
    it("returns narrative summary", async () => {
      const res = await req("GET", "/v1/summary");
      assert.equal(res.status, 200);
      assert.ok(typeof res.data.summary === "string");
      assert.ok(res.data.entry_count > 0);
      assert.ok(res.data.last_updated);
    });
  });

  describe("POST /v1/chat/completions", () => {
    it("returns compatibility response with summary text", async () => {
      const res = await req("POST", "/v1/chat/completions", {
        model: "clerk-v1",
        messages: [{ role: "user", content: "What is happening?" }],
      });
      assert.equal(res.status, 200);
      assert.equal(res.data.object, "chat.completion");
      assert.equal(res.data.model, "clerk-v1");
      assert.ok(Array.isArray(res.data.choices));
      assert.equal(res.data.choices.length, 1);
      assert.equal(res.data.choices[0].message.role, "assistant");
      assert.equal(res.data.choices[0].finish_reason, "stop");
      assert.ok(res.data.choices[0].message.content.length > 0);
    });

    it("returns helpful message when no activity", async () => {
      const emptyStore = createStore();
      const emptyServer = createApp(emptyStore);
      const emptyPort = await new Promise((resolve) => {
        emptyServer.listen(0, () => resolve(emptyServer.address().port));
      });
      const res = await fetchFrom(emptyPort, "POST", "/v1/chat/completions", {
        model: "clerk-v1",
        messages: [],
      });
      await new Promise((resolve) => emptyServer.close(resolve));
      assert.equal(res.status, 200);
      assert.equal(
        res.data.choices[0].message.content,
        "No activity recorded yet.",
      );
    });
  });

  describe("not found", () => {
    it("returns 404 for unknown routes", async () => {
      const res = await req("GET", "/nope");
      assert.equal(res.status, 404);
    });
  });
});
