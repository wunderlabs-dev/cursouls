import { BRIDGE_INBOUND_TYPE } from "@shared/bridge";
import { AGENT_STATUS } from "@shared/types";
import { createBridge } from "@web/bridge/bridge";
import type { InboundMessage } from "@web/bridge/types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type MessageHandler = (event: MessageEvent<unknown>) => void;

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

    emitInbound({ type: BRIDGE_INBOUND_TYPE.agents, actors: {} });
    emitInbound({ type: BRIDGE_INBOUND_TYPE.agents });
    expect(seen).toEqual([]);

    const actors = [{ id: "a-1", status: AGENT_STATUS.running, taskSummary: "Working" }];
    emitInbound({ type: BRIDGE_INBOUND_TYPE.agents, actors });
    expect(seen).toEqual([{ type: BRIDGE_INBOUND_TYPE.agents, actors }]);
  });
});
