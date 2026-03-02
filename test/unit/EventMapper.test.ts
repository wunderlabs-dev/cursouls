import { describe, expect, it } from "vitest";
import type { AgentSnapshot } from "../../src/types";
import { EventMapper } from "../../src/state/EventMapper";

function agent(id: string, status: AgentSnapshot["status"]): AgentSnapshot {
  return {
    id,
    name: `Agent ${id}`,
    kind: "local",
    status,
    taskSummary: `Task ${id}`,
    updatedAt: 1_700_000_000_000,
    source: "mock",
  };
}

describe("EventMapper", () => {
  it("emits joined events for first-seen agents in input order", () => {
    const mapper = new EventMapper();
    const at = 1_700_000_001_000;

    const events = mapper.map([agent("a", "running"), agent("b", "idle")], at);

    expect(events).toEqual([
      { type: "joined", agentId: "a", at, nextStatus: "running" },
      { type: "joined", agentId: "b", at, nextStatus: "idle" },
    ]);
  });

  it("emits heartbeat/status-changed/left transitions between snapshots", () => {
    const mapper = new EventMapper();
    mapper.map([agent("a", "running"), agent("b", "idle"), agent("c", "running")], 1000);

    const events = mapper.map([agent("a", "running"), agent("b", "completed"), agent("d", "error")], 2000);

    expect(events).toEqual([
      {
        type: "heartbeat",
        agentId: "a",
        at: 2000,
        previousStatus: "running",
        nextStatus: "running",
      },
      {
        type: "status-changed",
        agentId: "b",
        at: 2000,
        previousStatus: "idle",
        nextStatus: "completed",
      },
      {
        type: "joined",
        agentId: "d",
        at: 2000,
        nextStatus: "error",
      },
      {
        type: "left",
        agentId: "c",
        at: 2000,
        previousStatus: "running",
      },
    ]);
  });

  it("forgets history after reset", () => {
    const mapper = new EventMapper();
    mapper.map([agent("a", "running")], 1000);
    mapper.reset();

    const events = mapper.map([agent("a", "running")], 2000);

    expect(events).toEqual([{ type: "joined", agentId: "a", at: 2000, nextStatus: "running" }]);
  });
});
