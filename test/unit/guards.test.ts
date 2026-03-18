import { EVENT_KIND } from "@shared/types";
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

  it("rejects incomplete events and accepts valid ones", () => {
    const bridge = createBridge();
    const seen: InboundMessage[] = [];
    bridge.subscribe((message) => seen.push(message));

    emitInbound({ kind: "joined" });
    emitInbound({ agent: { id: "a-1", status: "running", taskSummary: "x" } });
    emitInbound({});
    expect(seen).toEqual([]);

    const event = {
      kind: EVENT_KIND.joined,
      agent: { id: "a-1", status: "running", taskSummary: "Working" },
    };
    emitInbound(event);
    expect(seen).toEqual([event]);
  });
});
