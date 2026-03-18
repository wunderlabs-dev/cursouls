import { BRIDGE_INBOUND_TYPE } from "@shared/bridge";
import type { AgentSnapshot } from "@shared/types";
import { createBridge } from "@web/bridge/bridge";
import type { InboundMessage } from "@web/bridge/types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type MessageHandler = (event: MessageEvent<unknown>) => void;

function createSnapshot(overrides?: Partial<AgentSnapshot>): AgentSnapshot {
  return {
    id: "a-1",
    status: "running",
    taskSummary: "Working",
    ...overrides,
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
    messageHandlers.forEach((handler) => {
      handler({ data } as MessageEvent<unknown>);
    });
  }

  it("ignores malformed agents payloads and accepts valid agents", () => {
    const bridge = createBridge();
    const seen: InboundMessage[] = [];
    bridge.subscribe((message) => seen.push(message));

    emitInbound({ type: BRIDGE_INBOUND_TYPE.agents, agents: {} });
    emitInbound({ type: BRIDGE_INBOUND_TYPE.agents });
    expect(seen).toEqual([]);

    const agents = [createSnapshot()];
    emitInbound({ type: BRIDGE_INBOUND_TYPE.agents, agents });
    expect(seen).toEqual([{ type: BRIDGE_INBOUND_TYPE.agents, agents }]);
  });
});
