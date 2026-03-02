import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SceneFrame } from "@shared/types";
import { useVsCodeBridge } from "@web/bridge/bridge";
import type { InboundMessage } from "@web/bridge/types";

type MessageHandler = (event: MessageEvent<unknown>) => void;

function buildFrame(): SceneFrame {
  return {
    generatedAt: 1_700_000_000_000,
    seats: [
      {
        tableIndex: 0,
        agent: {
          id: "a-1",
          name: "Ada",
          kind: "local",
          status: "running",
          taskSummary: "Reviewing bridge",
          startedAt: 1_700_000_000_000 - 180_000,
          updatedAt: 1_700_000_000_000 - 15_000,
          source: "mock",
        },
      },
    ],
    queue: [],
    health: {
      sourceConnected: true,
      sourceLabel: "test-source",
      warnings: [],
    },
  };
}

describe("useVsCodeBridge inbound parse guards", () => {
  const messageHandlers = new Set<MessageHandler>();

  beforeEach(() => {
    vi.stubGlobal("acquireVsCodeApi", () => ({
      postMessage: vi.fn(),
    }));
    vi.stubGlobal("window", {
      addEventListener: vi.fn((type: string, handler: MessageHandler) => {
        if (type === "message") {
          messageHandlers.add(handler);
        }
      }),
      removeEventListener: vi.fn((type: string, handler: MessageHandler) => {
        if (type === "message") {
          messageHandlers.delete(handler);
        }
      }),
    });
  });

  afterEach(() => {
    messageHandlers.clear();
    vi.unstubAllGlobals();
  });

  function emitInbound(data: unknown): void {
    messageHandlers.forEach((handler) => handler({ data } as MessageEvent<unknown>));
  }

  it("ignores malformed sceneFrame payloads and accepts valid sceneFrame", () => {
    const bridge = useVsCodeBridge();
    const seen: InboundMessage[] = [];
    bridge.subscribe((message) => seen.push(message));

    emitInbound({ type: "sceneFrame", frame: {} });
    emitInbound({
      type: "sceneFrame",
      frame: { generatedAt: Date.now(), seats: [], queue: [] },
    });
    expect(seen).toEqual([]);

    const frame = buildFrame();
    emitInbound({ type: "sceneFrame", frame });
    expect(seen).toEqual([{ type: "sceneFrame", frame }]);
  });

  it("ignores malformed tooltipData payloads and accepts valid tooltipData", () => {
    const bridge = useVsCodeBridge();
    const seen: InboundMessage[] = [];
    bridge.subscribe((message) => seen.push(message));

    emitInbound({ type: "tooltipData", tooltip: { id: "a-1" } });
    emitInbound({
      type: "tooltipData",
      tooltip: {
        id: "a-1",
        name: "Ada",
        status: "running",
        task: "Reviewing bridge",
        elapsed: "3m",
      },
    });
    expect(seen).toEqual([]);

    emitInbound({
      type: "tooltipData",
      tooltip: {
        id: "a-1",
        name: "Ada",
        status: "running",
        task: "Reviewing bridge",
        elapsed: "3m",
        updated: "just now",
      },
    });
    expect(seen).toEqual([
      {
        type: "tooltipData",
        tooltip: {
          id: "a-1",
          name: "Ada",
          status: "running",
          task: "Reviewing bridge",
          elapsed: "3m",
          updated: "just now",
        },
      },
    ]);
  });
});
