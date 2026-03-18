import type { CanonicalAgentSnapshot } from "@agentprobe/core";
import { BRIDGE_INBOUND_TYPE } from "@shared/bridge";
import { createBridge } from "@web/bridge/bridge";
import type { InboundMessage } from "@web/bridge/types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type MessageHandler = (event: MessageEvent<unknown>) => void;

function createSnapshot(overrides?: Partial<CanonicalAgentSnapshot>): CanonicalAgentSnapshot {
  return {
    id: "a-1",
    name: "Guard Agent",
    kind: "local",
    isSubagent: false,
    status: "running",
    taskSummary: "Working",
    updatedAt: 1_700_000_000_000,
    source: "cursor-transcripts",
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
