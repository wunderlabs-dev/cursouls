import { type CanonicalAgentSnapshot, createLifecycleMapper } from "@agentprobe/core";
import { describe, expect, it } from "vitest";

function agent(id: string, status: CanonicalAgentSnapshot["status"]): CanonicalAgentSnapshot {
  return {
    id,
    name: `Agent ${id}`,
    kind: "local",
    isSubagent: false,
    status,
    taskSummary: `Task ${id}`,
    updatedAt: 1_700_000_000_000,
    source: "mock",
  };
}

describe("LifecycleMapper", () => {
  it("emits joined events for first-seen agents in input order", () => {
    const mapper = createLifecycleMapper<CanonicalAgentSnapshot, CanonicalAgentSnapshot["status"]>({
      getId: (value) => value.id,
      getStatus: (value) => value.status,
    });
    const at = 1_700_000_001_000;

    const events = mapper.map([agent("a", "running"), agent("b", "idle")], at);

    expect(events).toEqual([
      { kind: "joined", agentId: "a", at, fromStatus: null, toStatus: "running" },
      { kind: "joined", agentId: "b", at, fromStatus: null, toStatus: "idle" },
    ]);
  });

  it("emits heartbeat/status-changed/left transitions between snapshots", () => {
    const mapper = createLifecycleMapper<CanonicalAgentSnapshot, CanonicalAgentSnapshot["status"]>({
      getId: (value) => value.id,
      getStatus: (value) => value.status,
    });
    mapper.map([agent("a", "running"), agent("b", "idle"), agent("c", "running")], 1000);

    const events = mapper.map(
      [agent("a", "running"), agent("b", "completed"), agent("d", "error")],
      2000,
    );

    expect(events).toEqual([
      {
        kind: "heartbeat",
        agentId: "a",
        at: 2000,
        fromStatus: "running",
        toStatus: "running",
      },
      {
        kind: "statusChanged",
        agentId: "b",
        at: 2000,
        fromStatus: "idle",
        toStatus: "completed",
      },
      {
        kind: "joined",
        agentId: "d",
        at: 2000,
        fromStatus: null,
        toStatus: "error",
      },
      {
        kind: "left",
        agentId: "c",
        at: 2000,
        fromStatus: "running",
        toStatus: null,
      },
    ]);
  });

  it("forgets history after reset", () => {
    const mapper = createLifecycleMapper<CanonicalAgentSnapshot, CanonicalAgentSnapshot["status"]>({
      getId: (value) => value.id,
      getStatus: (value) => value.status,
    });
    mapper.map([agent("a", "running")], 1000);
    mapper.reset();

    const events = mapper.map([agent("a", "running")], 2000);

    expect(events).toEqual([
      { kind: "joined", agentId: "a", at: 2000, fromStatus: null, toStatus: "running" },
    ]);
  });
});
