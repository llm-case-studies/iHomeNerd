import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createStore } from "../service/store.js";

describe("store", () => {
  describe("append", () => {
    it("stores a valid actor_state_update entry", () => {
      const store = createStore();
      const entry = store.append({
        type: "actor_state_update",
        actor: "alex",
        data: { state: "working", task: "bootstrap" },
      });
      assert.equal(entry.type, "actor_state_update");
      assert.equal(entry.actor, "alex");
      assert.equal(entry.data.state, "working");
      assert.ok(entry.id);
      assert.ok(entry.timestamp);
    });

    it("stores a valid system_event entry", () => {
      const store = createStore();
      const entry = store.append({
        type: "system_event",
        data: { message: "service started" },
      });
      assert.equal(entry.type, "system_event");
      assert.equal(entry.actor, null);
      assert.equal(entry.data.message, "service started");
    });

    it("rejects null entry", () => {
      const store = createStore();
      assert.throws(() => store.append(null), { code: "INVALID_ENTRY" });
    });

    it("rejects entry without type", () => {
      const store = createStore();
      assert.throws(() => store.append({ data: {} }), { code: "INVALID_ENTRY" });
    });

    it("rejects entry with invalid type", () => {
      const store = createStore();
      assert.throws(() => store.append({ type: "bogus" }), { code: "INVALID_ENTRY" });
    });

    it("rejects actor_state_update without actor", () => {
      const store = createStore();
      assert.throws(
        () => store.append({ type: "actor_state_update" }),
        { code: "INVALID_ENTRY" },
      );
    });

    it("rejects entry with non-object data", () => {
      const store = createStore();
      assert.throws(
        () => store.append({ type: "system_event", data: "not-an-object" }),
        { code: "INVALID_ENTRY" },
      );
    });
  });

  describe("getState", () => {
    it("returns empty actors when no entries", () => {
      const store = createStore();
      assert.deepEqual(store.getState(), { actors: {} });
    });

    it("returns latest state per actor", () => {
      const store = createStore();
      store.append({
        type: "actor_state_update",
        actor: "alex",
        data: { state: "idle" },
      });
      store.append({
        type: "actor_state_update",
        actor: "alex",
        data: { state: "working", task: "bootstrap" },
      });
      store.append({
        type: "actor_state_update",
        actor: "sam",
        data: { state: "reviewing" },
      });
      const state = store.getState();
      assert.equal(state.actors.alex.state, "working");
      assert.equal(state.actors.alex.task, "bootstrap");
      assert.ok(state.actors.alex.updated_at);
      assert.equal(state.actors.sam.state, "reviewing");
    });

    it("ignores non-actor entries", () => {
      const store = createStore();
      store.append({ type: "system_event", data: { message: "boot" } });
      assert.deepEqual(store.getState(), { actors: {} });
    });
  });

  describe("getSummary", () => {
    it("returns empty summary when no entries", () => {
      const store = createStore();
      const s = store.getSummary();
      assert.equal(s.summary, "");
      assert.equal(s.entry_count, 0);
      assert.equal(s.last_updated, null);
    });

    it("builds narrative from actor states", () => {
      const store = createStore();
      store.append({
        type: "actor_state_update",
        actor: "alex",
        data: { state: "working", task: "office-clerk bootstrap" },
      });
      const s = store.getSummary();
      assert.equal(s.summary, "alex is working on office-clerk bootstrap.");
      assert.equal(s.entry_count, 1);
      assert.ok(s.last_updated);
    });

    it("handles actor without task", () => {
      const store = createStore();
      store.append({
        type: "actor_state_update",
        actor: "alex",
        data: { state: "idle" },
      });
      const s = store.getSummary();
      assert.equal(s.summary, "alex is idle.");
    });

    it("handles actor without state", () => {
      const store = createStore();
      store.append({
        type: "actor_state_update",
        actor: "alex",
        data: { task: "bootstrap" },
      });
      const s = store.getSummary();
      assert.equal(s.summary, "alex is unknown on bootstrap.");
    });

    it("joins multiple actors", () => {
      const store = createStore();
      store.append({
        type: "actor_state_update",
        actor: "alex",
        data: { state: "working", task: "bootstrap" },
      });
      store.append({
        type: "actor_state_update",
        actor: "sam",
        data: { state: "reviewing", task: "PR #3" },
      });
      const s = store.getSummary();
      assert.ok(s.summary.includes("alex is working on bootstrap"));
      assert.ok(s.summary.includes("sam is reviewing on PR #3"));
    });
  });

  describe("getEntries", () => {
    it("returns all entries in order", () => {
      const store = createStore();
      const e1 = store.append({ type: "system_event" });
      const e2 = store.append({ type: "system_event" });
      const all = store.getEntries();
      assert.equal(all.length, 2);
      assert.equal(all[0].id, e1.id);
      assert.equal(all[1].id, e2.id);
    });
  });
});
