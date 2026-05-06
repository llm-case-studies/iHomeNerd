import { randomUUID } from "node:crypto";

const VALID_TYPES = new Set(["actor_state_update", "system_event"]);

function validate(entry) {
  if (!entry || typeof entry !== "object") {
    return "entry must be a non-null object";
  }
  if (!entry.type || typeof entry.type !== "string") {
    return "entry.type is required and must be a string";
  }
  if (!VALID_TYPES.has(entry.type)) {
    return `entry.type must be one of: ${[...VALID_TYPES].join(", ")}`;
  }
  if (entry.type === "actor_state_update") {
    if (!entry.actor || typeof entry.actor !== "string") {
      return "entry.actor is required for type actor_state_update";
    }
  }
  if (entry.data !== undefined && (typeof entry.data !== "object" || entry.data === null)) {
    return "entry.data must be an object when provided";
  }
  return null;
}

export function createStore() {
  const entries = [];

  function append(entry) {
    const err = validate(entry);
    if (err) {
      const error = new Error(err);
      error.code = "INVALID_ENTRY";
      throw error;
    }
    const stored = {
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      type: entry.type,
      actor: entry.actor || null,
      data: entry.data || {},
    };
    entries.push(stored);
    return stored;
  }

  function getState() {
    const actors = {};
    for (const entry of entries) {
      if (entry.type === "actor_state_update" && entry.actor) {
        actors[entry.actor] = {
          ...entry.data,
          updated_at: entry.timestamp,
        };
      }
    }
    return { actors };
  }

  function getSummary() {
    const { actors } = getState();
    const actorNames = Object.keys(actors);
    if (actorNames.length === 0) {
      return {
        summary: "",
        entry_count: entries.length,
        last_updated: entries.length > 0 ? entries[entries.length - 1].timestamp : null,
      };
    }
    const parts = actorNames.map((name) => {
      const a = actors[name];
      const state = a.state || "unknown";
      const task = a.task;
      return task
        ? `${name} is ${state} on ${task}`
        : `${name} is ${state}`;
    });
    const summary = parts.join(". ") + ".";
    return {
      summary,
      entry_count: entries.length,
      last_updated: entries[entries.length - 1].timestamp,
    };
  }

  function getEntries() {
    return [...entries];
  }

  return { append, getState, getSummary, getEntries };
}
