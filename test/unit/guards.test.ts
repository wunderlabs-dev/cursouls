import { BRIDGE_INBOUND_TYPE } from "@shared/bridge";
import type { AgentLifecycleEvent, SceneFrame } from "@shared/types";
import {
  AGENT_KIND,
  AGENT_LIFECYCLE_EVENT_KIND,
  AGENT_SOURCE_KIND,
  AGENT_STATUS,
} from "@shared/types";
import { createBridge } from "@web/bridge/bridge";
import type { InboundMessage } from "@web/bridge/types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
          kind: AGENT_KIND.local,
          isSubagent: false,
          status: AGENT_STATUS.running,
          taskSummary: "Reviewing bridge",
          startedAt: 1_700_000_000_000 - 180_000,
          updatedAt: 1_700_000_000_000 - 15_000,
          source: AGENT_SOURCE_KIND.mock,
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

function buildLifecycleEvents(): AgentLifecycleEvent[] {
  return [
    {
      kind: AGENT_LIFECYCLE_EVENT_KIND.joined,
      agentId: "a-1",
      at: 1_700_000_000_000,
      fromStatus: null,
      toStatus: AGENT_STATUS.running,
    },
    {
      kind: AGENT_LIFECYCLE_EVENT_KIND.left,
      agentId: "a-2",
      at: 1_700_000_001_000,
      fromStatus: AGENT_STATUS.idle,
      toStatus: null,
    },
  ];
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
    messageHandlers.forEach((handler) => {
      handler({ data } as MessageEvent<unknown>);
    });
  }

  it("ignores malformed sceneFrame payloads and accepts valid sceneFrame", () => {
    const bridge = createBridge();
    const seen: InboundMessage[] = [];
    bridge.subscribe((message) => seen.push(message));

    emitInbound({ type: BRIDGE_INBOUND_TYPE.sceneFrame, frame: {} });
    emitInbound({
      type: BRIDGE_INBOUND_TYPE.sceneFrame,
      frame: { generatedAt: Date.now(), seats: [], queue: [] },
    });
    expect(seen).toEqual([]);

    const frame = buildFrame();
    emitInbound({ type: BRIDGE_INBOUND_TYPE.sceneFrame, frame });
    expect(seen).toEqual([{ type: BRIDGE_INBOUND_TYPE.sceneFrame, frame }]);
  });

  it("ignores malformed tooltipData payloads and accepts valid tooltipData", () => {
    const bridge = createBridge();
    const seen: InboundMessage[] = [];
    bridge.subscribe((message) => seen.push(message));

    emitInbound({ type: BRIDGE_INBOUND_TYPE.tooltipData, tooltip: { id: "a-1" } });
    emitInbound({
      type: BRIDGE_INBOUND_TYPE.tooltipData,
      tooltip: {
        id: "a-1",
        name: "Ada",
        status: AGENT_STATUS.running,
        task: "Reviewing bridge",
        elapsed: "3m",
      },
    });
    expect(seen).toEqual([]);

    emitInbound({
      type: BRIDGE_INBOUND_TYPE.tooltipData,
      tooltip: {
        id: "a-1",
        name: "Ada",
        status: AGENT_STATUS.running,
        task: "Reviewing bridge",
        elapsed: "3m",
        updated: "just now",
      },
    });
    expect(seen).toEqual([
      {
        type: BRIDGE_INBOUND_TYPE.tooltipData,
        tooltip: {
          id: "a-1",
          name: "Ada",
          status: AGENT_STATUS.running,
          task: "Reviewing bridge",
          elapsed: "3m",
          updated: "just now",
        },
      },
    ]);
  });

  it("ignores malformed lifecycleEvents payloads and accepts valid lifecycleEvents", () => {
    const bridge = createBridge();
    const seen: InboundMessage[] = [];
    bridge.subscribe((message) => seen.push(message));

    emitInbound({ type: BRIDGE_INBOUND_TYPE.lifecycleEvents });
    emitInbound({ type: BRIDGE_INBOUND_TYPE.lifecycleEvents, events: {} });
    emitInbound({
      type: BRIDGE_INBOUND_TYPE.lifecycleEvents,
      events: [{ kind: AGENT_LIFECYCLE_EVENT_KIND.joined, agentId: "a-1", at: "bad" }],
    });
    expect(seen).toEqual([]);

    const events = buildLifecycleEvents();
    emitInbound({ type: BRIDGE_INBOUND_TYPE.lifecycleEvents, events });
    expect(seen).toEqual([{ type: BRIDGE_INBOUND_TYPE.lifecycleEvents, events }]);
  });
});
