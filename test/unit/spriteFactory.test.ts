import { describe, expect, it, vi } from "vitest";
import type { AgentSnapshot } from "../../src/shared/types";
import type { SeatRenderModel } from "../../src/webview/features/cafe/scene/sceneModel";
import { updateSeatSprite } from "../../src/webview/features/cafe/scene/spriteFactory";

vi.mock("phaser", () => ({
  default: {},
}));

function makeAgent(status: AgentSnapshot["status"] = "running"): AgentSnapshot {
  return {
    id: "agent-1",
    name: "Ada Lovelace",
    kind: "local",
    status,
    taskSummary: "Working",
    updatedAt: 1_700_000_000_000,
    source: "mock",
  };
}

function makeSeat(agent: AgentSnapshot | null): SeatRenderModel {
  return {
    tableIndex: 0,
    label: "Table 1",
    x: 90,
    y: 76,
    width: 144,
    height: 86,
    agent,
  };
}

function makeSprite() {
  return {
    agentButton: {
      input: { enabled: true },
      setInteractive: vi.fn(),
      disableInteractive: vi.fn(),
      setVisible: vi.fn(),
      setData: vi.fn(),
    },
    agentBody: {
      width: 132,
      height: 28,
      setStrokeStyle: vi.fn(),
    },
    avatarText: {
      setText: vi.fn(),
    },
    nameText: {
      setText: vi.fn(),
    },
    bubbleText: {
      setText: vi.fn(),
      setColor: vi.fn(),
    },
  };
}

describe("updateSeatSprite", () => {
  it("reuses existing interactivity and toggles enabled state/data", () => {
    const sprite = makeSprite();

    updateSeatSprite(sprite as never, makeSeat(makeAgent("running")));

    expect(sprite.agentButton.setInteractive).not.toHaveBeenCalled();
    expect(sprite.agentButton.input.enabled).toBe(true);
    expect(sprite.agentButton.setVisible).toHaveBeenCalledWith(true);
    expect(sprite.agentButton.setData).toHaveBeenCalledWith("agentId", "agent-1");
  });

  it("disables button interaction and clears agent id when seat is empty", () => {
    const sprite = makeSprite();

    updateSeatSprite(sprite as never, makeSeat(null));

    expect(sprite.agentButton.setInteractive).not.toHaveBeenCalled();
    expect(sprite.agentButton.input.enabled).toBe(false);
    expect(sprite.agentButton.setVisible).toHaveBeenCalledWith(false);
    expect(sprite.agentButton.setData).toHaveBeenCalledWith("agentId", null);
  });
});
