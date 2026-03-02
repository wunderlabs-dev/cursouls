import { describe, expect, it } from "vitest";
import type { AgentSnapshot, SceneFrame } from "../../src/shared/types";
import { TABLE_ANCHORS, buildCafeSceneModel } from "../../src/webview/features/cafe/scene/model";

function makeAgent(id: string, status: AgentSnapshot["status"]): AgentSnapshot {
  return {
    id,
    name: `Agent ${id}`,
    kind: "local",
    status,
    taskSummary: "Working",
    updatedAt: 1_700_000_000_000,
    source: "mock",
  };
}

function makeFrame(): SceneFrame {
  return {
    generatedAt: 1_700_000_001_000,
    seats: [
      { tableIndex: 4, agent: makeAgent("a-4", "error") },
      { tableIndex: 0, agent: makeAgent("a-0", "running") },
      { tableIndex: 2, agent: null },
      { tableIndex: 1, agent: makeAgent("a-1", "idle") },
    ],
    queue: [makeAgent("q-1", "completed")],
    health: {
      sourceConnected: true,
      sourceLabel: "mock",
      warnings: [],
    },
  };
}

describe("scene model mapping", () => {
  it("maps SceneFrame seats to a deterministic six-table view", () => {
    const view = buildCafeSceneModel(makeFrame());

    expect(view.seats).toHaveLength(6);
    expect(view.seats.map((seat) => seat.tableIndex)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(view.seats.map((seat) => seat.agent?.id ?? null)).toEqual(["a-0", "a-1", null, null, "a-4", null]);
  });

  it("preserves fixed table anchor geometry while assigning occupants", () => {
    const view = buildCafeSceneModel(makeFrame());

    expect(view.seats[0]).toMatchObject({ ...TABLE_ANCHORS[0], agent: expect.objectContaining({ id: "a-0" }) });
    expect(view.seats[1]).toMatchObject({ ...TABLE_ANCHORS[1], agent: expect.objectContaining({ id: "a-1" }) });
    expect(view.seats[2]).toMatchObject({ ...TABLE_ANCHORS[2], agent: null });
    expect(view.seats[3]).toMatchObject({ ...TABLE_ANCHORS[3], agent: null });
    expect(view.seats[4]).toMatchObject({ ...TABLE_ANCHORS[4], agent: expect.objectContaining({ id: "a-4" }) });
    expect(view.seats[5]).toMatchObject({ ...TABLE_ANCHORS[5], agent: null });
  });

  it("ignores out-of-range table indices and supports empty frame input", () => {
    const frame = makeFrame();
    frame.seats.push({ tableIndex: 99, agent: makeAgent("bad-index", "completed") });

    const mapped = buildCafeSceneModel(frame);
    const empty = buildCafeSceneModel();

    expect(mapped.seats.every((seat) => seat.agent?.id !== "bad-index")).toBe(true);
    expect(empty.seats).toHaveLength(6);
    expect(empty.seats.every((seat) => seat.agent === null)).toBe(true);
  });
});
