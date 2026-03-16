import { findAgentInFrame } from "@shared/frame";
import type { AgentSnapshot, SceneFrame } from "@shared/types";
import { describe, expect, it } from "vitest";

function makeAgent(id: string, name = `Agent ${id}`): AgentSnapshot {
  return {
    id,
    name,
    kind: "local",
    isSubagent: false,
    status: "running",
    taskSummary: "working",
    updatedAt: 1000,
    source: "cursor-transcripts",
  };
}

function makeFrame(overrides: Partial<SceneFrame> = {}): SceneFrame {
  return {
    generatedAt: 1000,
    seats: [],
    queue: [],
    health: { sourceConnected: true, sourceLabel: "test", warnings: [] },
    ...overrides,
  };
}

describe("findAgentInFrame", () => {
  it("returns undefined when frame is undefined", () => {
    expect(findAgentInFrame(undefined, "a-1")).toBeUndefined();
  });

  it("returns undefined when agent is not in seats or queue", () => {
    const frame = makeFrame({
      seats: [{ tableIndex: 0, agent: makeAgent("a-1") }],
    });
    expect(findAgentInFrame(frame, "missing")).toBeUndefined();
  });

  it("finds agent seated at a table", () => {
    const agent = makeAgent("a-1");
    const frame = makeFrame({
      seats: [
        { tableIndex: 0, agent: null },
        { tableIndex: 1, agent },
      ],
    });
    expect(findAgentInFrame(frame, "a-1")).toBe(agent);
  });

  it("finds agent in the queue", () => {
    const agent = makeAgent("q-1");
    const frame = makeFrame({ queue: [agent] });
    expect(findAgentInFrame(frame, "q-1")).toBe(agent);
  });

  it("prefers seated agent over queued agent with same id", () => {
    const seated = makeAgent("a-1");
    const queued = { ...makeAgent("a-1"), name: "queued" };
    const frame = makeFrame({
      seats: [{ tableIndex: 0, agent: seated }],
      queue: [queued],
    });
    expect(findAgentInFrame(frame, "a-1")).toBe(seated);
  });

  it("skips seats with null agents", () => {
    const frame = makeFrame({
      seats: [
        { tableIndex: 0, agent: null },
        { tableIndex: 1, agent: null },
      ],
    });
    expect(findAgentInFrame(frame, "a-1")).toBeUndefined();
  });
});
