import { describe, expect, it } from "vitest";
import type { SceneFrame } from "../../src/types";
import { SceneRenderer } from "../../src/webview/renderer/scene";

function frameWithStatuses(): SceneFrame {
  return {
    generatedAt: 1_700_000_010_000,
    seats: [
      {
        tableIndex: 0,
        agent: {
          id: "agent-running",
          name: "Ada Lovelace",
          kind: "local",
          status: "running",
          taskSummary: "Task",
          updatedAt: 1_700_000_000_000,
          source: "mock",
        },
      },
      {
        tableIndex: 1,
        agent: {
          id: "agent-idle",
          name: "Grace Hopper",
          kind: "local",
          status: "idle",
          taskSummary: "Task",
          updatedAt: 1_700_000_000_000,
          source: "mock",
        },
      },
      {
        tableIndex: 2,
        agent: {
          id: "agent-completed",
          name: "Linus Torvalds",
          kind: "remote",
          status: "completed",
          taskSummary: "Task",
          updatedAt: 1_700_000_000_000,
          source: "mock",
        },
      },
      {
        tableIndex: 3,
        agent: {
          id: "agent-error",
          name: "Ken Thompson",
          kind: "remote",
          status: "error",
          taskSummary: "Task",
          updatedAt: 1_700_000_000_000,
          source: "mock",
        },
      },
      { tableIndex: 4, agent: null },
      { tableIndex: 5, agent: null },
    ],
    queue: [],
    health: { sourceConnected: true, sourceLabel: "mock", warnings: [] },
  };
}

describe("SceneRenderer", () => {
  it("renders deterministic status classes and glyph bubbles for seated agents", () => {
    const root = { innerHTML: "" } as HTMLElement;
    const renderer = new SceneRenderer(root);

    renderer.render(frameWithStatuses());

    expect(root.innerHTML).toContain("status-running");
    expect(root.innerHTML).toContain("status-idle");
    expect(root.innerHTML).toContain("status-completed");
    expect(root.innerHTML).toContain("status-error");
    expect(root.innerHTML).toContain("…");
    expect(root.innerHTML).toContain("•");
    expect(root.innerHTML).toContain("✓");
    expect(root.innerHTML).toContain("!");
  });

  it("escapes id and name fields before injecting HTML", () => {
    const root = { innerHTML: "" } as HTMLElement;
    const renderer = new SceneRenderer(root);
    const frame = frameWithStatuses();
    frame.seats[0] = {
      tableIndex: 0,
      agent: {
        id: `id"<script>alert(1)</script>`,
        name: `A & B <img src=x onerror=alert(1)>`,
        kind: "local",
        status: "running",
        taskSummary: "Task",
        updatedAt: 1_700_000_000_000,
        source: "mock",
      },
    };

    renderer.render(frame);

    expect(root.innerHTML).not.toContain("<script>");
    expect(root.innerHTML).not.toContain("<img");
    expect(root.innerHTML).toContain("&lt;script&gt;");
    expect(root.innerHTML).toContain("&amp;");
  });
});
