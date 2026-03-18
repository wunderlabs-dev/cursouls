import { CANONICAL_AGENT_STATUS, type CanonicalAgentSnapshot } from "@agentprobe/core";
import { BRIDGE_INBOUND_TYPE, BRIDGE_OUTBOUND_TYPE, type OutboundMessage } from "@shared/bridge";
import { createBridge } from "@web/bridge/bridge";
import type { InboundMessage } from "@web/bridge/types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type MessageHandler = (event: MessageEvent<unknown>) => void;

function createSnapshot(overrides?: Partial<CanonicalAgentSnapshot>): CanonicalAgentSnapshot {
  return {
    id: "agent-1",
    name: "Ada",
    kind: "local",
    isSubagent: false,
    status: "running",
    taskSummary: "Reviewing bridge",
    updatedAt: 1_700_000_000_100,
    source: "cursor-transcripts",
    ...overrides,
  };
}

describe("bridge contracts", () => {
  it("uses shared bridge contracts for message envelopes", () => {
    const outboundReady: OutboundMessage = { type: BRIDGE_OUTBOUND_TYPE.ready };
    expect(outboundReady.type).toBe("ready");
    expect(CANONICAL_AGENT_STATUS.running).toBe("running");
  });
});

describe("webview bridge inbound parse guards", () => {
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

  it("ignores malformed agents payloads and accepts valid snapshots", () => {
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

  it("passes through extra fields on agent snapshots", () => {
    const bridge = createBridge();
    const seen: InboundMessage[] = [];
    bridge.subscribe((message) => seen.push(message));

    const agents = [createSnapshot({ metadata: { custom: true } })];
    emitInbound({ type: BRIDGE_INBOUND_TYPE.agents, agents });
    expect(seen).toHaveLength(1);
    expect(seen[0]).toEqual({ type: BRIDGE_INBOUND_TYPE.agents, agents });
  });
});
