import type { AgentSnapshot, SceneFrame } from "@shared/types";
import { SCENE_HEIGHT, SCENE_WIDTH } from "@web/scene/constants";
import {
  applyAgentsToAnchors,
  buildCafeSceneModel,
  buildSceneTableAnchors,
} from "@web/scene/model";
import { describe, expect, it } from "vitest";

function makeAgent(id: string, status: AgentSnapshot["status"]): AgentSnapshot {
  return {
    id,
    name: `Agent ${id}`,
    kind: "local",
    isSubagent: false,
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
  it("maps SceneFrame seats to a deterministic table view matching seat count", () => {
    const frame = makeFrame();
    const view = buildCafeSceneModel(frame);

    expect(view.seats).toHaveLength(frame.seats.length);
    expect(view.seats.map((seat) => seat.tableIndex)).toEqual([0, 1, 2, 3]);
    expect(view.seats.map((seat) => seat.agent?.id ?? null)).toEqual(["a-0", "a-1", null, null]);
  });

  it("preserves table anchor geometry while assigning occupants", () => {
    const frame = makeFrame();
    const bounds = { width: SCENE_WIDTH, height: SCENE_HEIGHT };
    const anchors = buildSceneTableAnchors(frame.seats.length, bounds);
    const view = applyAgentsToAnchors(anchors, frame);

    expect(view.seats[0]).toMatchObject({
      ...anchors[0],
      agent: expect.objectContaining({ id: "a-0" }),
    });
    expect(view.seats[1]).toMatchObject({
      ...anchors[1],
      agent: expect.objectContaining({ id: "a-1" }),
    });
    expect(view.seats[2]).toMatchObject({ ...anchors[2], agent: null });
    expect(view.seats[3]).toMatchObject({ ...anchors[3], agent: null });
  });

  it("ignores out-of-range table indices", () => {
    const frame = makeFrame();
    frame.seats.push({ tableIndex: 99, agent: makeAgent("bad-index", "completed") });

    const view = buildCafeSceneModel(frame);

    expect(view.seats.every((seat) => seat.agent?.id !== "bad-index")).toBe(true);
  });

  it("returns default seat count when no frame is provided", () => {
    const view = buildCafeSceneModel();

    expect(view.seats.length).toBeGreaterThanOrEqual(1);
    expect(view.seats.every((seat) => seat.agent === null)).toBe(true);
  });

  it("keeps every table anchor fully inside the scene bounds", () => {
    const bounds = { width: SCENE_WIDTH, height: SCENE_HEIGHT };
    const anchors = buildSceneTableAnchors(6, bounds);

    for (const anchor of anchors) {
      expect(anchor.x).toBeGreaterThanOrEqual(0);
      expect(anchor.y).toBeGreaterThanOrEqual(0);
      expect(anchor.x + anchor.width).toBeLessThanOrEqual(SCENE_WIDTH);
      expect(anchor.y + anchor.height).toBeLessThanOrEqual(SCENE_HEIGHT);
    }
  });
});
