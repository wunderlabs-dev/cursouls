import { createCafeStore } from "@ext/services/store";
import type { AgentSnapshot, SourceHealth } from "@shared/types";
import { describe, expect, it } from "vitest";

function makeAgent(id: string, overrides: Partial<AgentSnapshot> = {}): AgentSnapshot {
  return {
    id,
    name: `Agent ${id}`,
    kind: "local",
    isSubagent: false,
    status: "running",
    taskSummary: "working",
    updatedAt: 1000,
    source: "cursor-transcripts",
    ...overrides,
  };
}

const HEALTHY: SourceHealth = {
  sourceConnected: true,
  sourceLabel: "test-source",
  warnings: [],
};

describe("createCafeStore", () => {
  it("creates an initial empty frame with correct seat count", () => {
    const store = createCafeStore(3);
    const frame = store.getFrame();

    expect(frame.seats).toHaveLength(3);
    expect(frame.seats.every((s) => s.agent === null)).toBe(true);
    expect(frame.queue).toHaveLength(0);
    expect(frame.health.sourceConnected).toBe(false);
  });

  it("assigns running agents to seats", () => {
    const store = createCafeStore(3);
    const agents = [makeAgent("a-1"), makeAgent("a-2")];

    const frame = store.update({ agents, health: HEALTHY }, 5000);

    expect(frame.generatedAt).toBe(5000);
    const seated = frame.seats.filter((s) => s.agent !== null);
    expect(seated).toHaveLength(2);
    expect(frame.queue).toHaveLength(0);
  });

  it("filters out completed agents from seating", () => {
    const store = createCafeStore(3);
    const agents = [
      makeAgent("a-1", { status: "running" }),
      makeAgent("a-2", { status: "completed" }),
    ];

    const frame = store.update({ agents, health: HEALTHY });

    const seated = frame.seats.filter((s) => s.agent !== null);
    expect(seated).toHaveLength(1);
    expect(seated[0].agent?.id).toBe("a-1");
  });

  it("filters out error agents from seating", () => {
    const store = createCafeStore(3);
    const agents = [makeAgent("a-1", { status: "error" })];

    const frame = store.update({ agents, health: HEALTHY });

    const seated = frame.seats.filter((s) => s.agent !== null);
    expect(seated).toHaveLength(0);
  });

  it("includes idle non-subagents in seating", () => {
    const store = createCafeStore(3);
    const agents = [makeAgent("a-1", { status: "idle", isSubagent: false })];

    const frame = store.update({ agents, health: HEALTHY });

    const seated = frame.seats.filter((s) => s.agent !== null);
    expect(seated).toHaveLength(1);
  });

  it("excludes idle subagents from seating", () => {
    const store = createCafeStore(3);
    const agents = [makeAgent("a-1", { status: "idle", isSubagent: true })];

    const frame = store.update({ agents, health: HEALTHY });

    const seated = frame.seats.filter((s) => s.agent !== null);
    expect(seated).toHaveLength(0);
  });

  it("queues overflow agents when seats are full", () => {
    const store = createCafeStore(2);
    const agents = [makeAgent("a-1"), makeAgent("a-2"), makeAgent("a-3")];

    const frame = store.update({ agents, health: HEALTHY });

    const seated = frame.seats.filter((s) => s.agent !== null);
    expect(seated).toHaveLength(2);
    expect(frame.queue).toHaveLength(1);
  });

  it("preserves health from input", () => {
    const store = createCafeStore(2);
    const health: SourceHealth = {
      sourceConnected: false,
      sourceLabel: "disconnected",
      warnings: ["cannot reach source"],
    };

    const frame = store.update({ agents: [], health });

    expect(frame.health).toEqual(health);
  });

  it("returns latest frame from getFrame", () => {
    const store = createCafeStore(3);
    const agents = [makeAgent("a-1")];

    store.update({ agents, health: HEALTHY }, 9000);
    const frame = store.getFrame();

    expect(frame.generatedAt).toBe(9000);
  });

  it("resets to empty frame preserving seat count", () => {
    const store = createCafeStore(4);
    store.update({ agents: [makeAgent("a-1")], health: HEALTHY });

    store.reset();
    const frame = store.getFrame();

    expect(frame.seats).toHaveLength(4);
    expect(frame.seats.every((s) => s.agent === null)).toBe(true);
    expect(frame.queue).toHaveLength(0);
    expect(frame.generatedAt).toBe(0);
  });

  it("defaults to DEFAULT_SEAT_COUNT when called without arguments", () => {
    const store = createCafeStore();
    const frame = store.getFrame();
    expect(frame.seats).toHaveLength(20);
  });
});
