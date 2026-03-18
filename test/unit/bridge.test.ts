import { BRIDGE_INBOUND_TYPE, BRIDGE_OUTBOUND_TYPE, type OutboundMessage } from "@shared/bridge";
import type { AgentSnapshot } from "@shared/types";
import { AGENT_STATUS } from "@shared/types";
import { createBridge } from "@web/bridge/bridge";
import type { InboundMessage } from "@web/bridge/types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("vscode", () => ({}), { virtual: true });
vi.mock("@ext/providers/html", () => ({
  getWebviewHtml: vi.fn(() => "<html></html>"),
}));

type MessageHandler = (event: MessageEvent<unknown>) => void;

function createSnapshot(overrides?: Partial<AgentSnapshot>): AgentSnapshot {
  return {
    id: "agent-1",
    status: "running",
    taskSummary: "Reviewing bridge",
    ...overrides,
  };
}

describe("bridge contracts", () => {
  it("uses shared bridge contracts for message envelopes", () => {
    const outboundReady: OutboundMessage = { type: BRIDGE_OUTBOUND_TYPE.ready };
    expect(outboundReady.type).toBe("ready");
    expect(AGENT_STATUS.running).toBe("running");
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
});

function createWebviewViewMock() {
  const postedMessages: unknown[] = [];
  let onMessage: ((message: unknown) => void) | undefined;
  let onDispose: (() => void) | undefined;

  const view = {
    webview: {
      options: undefined as unknown,
      html: "",
      cspSource: "test-csp",
      asWebviewUri: vi.fn((value: unknown) => value),
      postMessage: vi.fn(async (message: unknown) => {
        postedMessages.push(message);
        return true;
      }),
      onDidReceiveMessage: vi.fn((handler: (message: unknown) => void) => {
        onMessage = handler;
        return { dispose: vi.fn() };
      }),
    },
    onDidDispose: vi.fn((handler: () => void) => {
      onDispose = handler;
      return { dispose: vi.fn() };
    }),
  };

  return {
    view,
    postedMessages,
    sendInboundMessage(message: unknown) {
      if (!onMessage) {
        throw new Error("Message handler is not registered");
      }
      onMessage(message);
    },
    dispose() {
      onDispose?.();
    },
  };
}

describe("provider webview integration", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(1_700_000_000_000);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("replays the latest agents when the webview sends ready", async () => {
    const { createCafeViewProvider } = await import("@ext/providers/provider");
    const provider = createCafeViewProvider({} as never);
    const harness = createWebviewViewMock();
    provider.resolveWebviewView(harness.view as never);

    const agents = [createSnapshot()];
    provider.updateAgents(agents);
    harness.sendInboundMessage({ type: "ready" });

    expect(harness.postedMessages).toEqual([
      { type: BRIDGE_INBOUND_TYPE.agents, agents },
      { type: BRIDGE_INBOUND_TYPE.agents, agents },
    ]);
  });

  it("stops posting messages after the view is disposed", async () => {
    const { createCafeViewProvider } = await import("@ext/providers/provider");
    const provider = createCafeViewProvider({} as never);
    const harness = createWebviewViewMock();
    provider.resolveWebviewView(harness.view as never);
    harness.dispose();

    provider.updateAgents([createSnapshot()]);
    expect(harness.postedMessages).toEqual([]);
  });

  it("ignores malformed inbound messages without crashing", async () => {
    const { createCafeViewProvider } = await import("@ext/providers/provider");
    const provider = createCafeViewProvider({} as never);
    const harness = createWebviewViewMock();
    provider.resolveWebviewView(harness.view as never);
    provider.updateAgents([createSnapshot()]);

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    expect(() => harness.sendInboundMessage(undefined)).not.toThrow();
    expect(() => harness.sendInboundMessage(null)).not.toThrow();
    expect(() => harness.sendInboundMessage("ready")).not.toThrow();
    expect(() => harness.sendInboundMessage({})).not.toThrow();
    expect(() => harness.sendInboundMessage({ type: "unexpected" })).not.toThrow();

    expect(harness.postedMessages).toEqual([
      { type: BRIDGE_INBOUND_TYPE.agents, agents: [createSnapshot()] },
    ]);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
