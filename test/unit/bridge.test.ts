import type { OutboundMessage } from "@shared/bridge";
import type { AgentEvent } from "@shared/types";
import { AGENT_STATUS, EVENT_KIND } from "@shared/types";
import { createBridge } from "@web/bridge/bridge";
import type { InboundMessage } from "@web/bridge/types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("vscode", () => ({}), { virtual: true });
vi.mock("@ext/providers/html", () => ({
  getWebviewHtml: vi.fn(() => "<html></html>"),
}));

type MessageHandler = (event: MessageEvent<unknown>) => void;

function createEvent(overrides?: Partial<AgentEvent>): AgentEvent {
  return {
    kind: EVENT_KIND.joined,
    agent: { id: "agent-1", status: AGENT_STATUS.running, taskSummary: "Working" },
    ...overrides,
  };
}

describe("bridge contracts", () => {
  it("uses shared bridge contracts for message envelopes", () => {
    const outboundReady: OutboundMessage = { ready: true };
    expect(outboundReady.ready).toBe(true);
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

  it("ignores malformed payloads and accepts valid events", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const bridge = createBridge();
    const seen: InboundMessage[] = [];
    bridge.subscribe((message) => seen.push(message));

    emitInbound({ kind: "joined" });
    emitInbound({});
    expect(seen).toEqual([]);

    const event = createEvent();
    emitInbound(event);
    expect(seen).toEqual([event]);
    warnSpy.mockRestore();
  });

  it("buffers multiple events before subscriber connects", () => {
    const bridge = createBridge();
    const event1 = createEvent();
    const event2 = createEvent({
      kind: EVENT_KIND.statusChanged,
      agent: { id: "agent-1", status: AGENT_STATUS.idle, taskSummary: "Working" },
    });

    emitInbound(event1);
    emitInbound(event2);

    const seen: InboundMessage[] = [];
    bridge.subscribe((message) => seen.push(message));

    expect(seen).toEqual([event1, event2]);
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

  it("replays buffered events when the webview sends ready", async () => {
    const { createCafeViewProvider } = await import("@ext/providers/provider");
    const provider = createCafeViewProvider({} as never);
    const harness = createWebviewViewMock();
    provider.resolveWebviewView(harness.view as never);

    const event = createEvent();
    provider.postEvent(event);
    harness.sendInboundMessage({ ready: true });

    expect(harness.postedMessages).toEqual([event, event]);
  });

  it("stops posting messages after the view is disposed", async () => {
    const { createCafeViewProvider } = await import("@ext/providers/provider");
    const provider = createCafeViewProvider({} as never);
    const harness = createWebviewViewMock();
    provider.resolveWebviewView(harness.view as never);
    harness.dispose();

    provider.postEvent(createEvent());
    expect(harness.postedMessages).toEqual([]);
  });

  it("ignores malformed inbound messages without crashing", async () => {
    const { createCafeViewProvider } = await import("@ext/providers/provider");
    const provider = createCafeViewProvider({} as never);
    const harness = createWebviewViewMock();
    provider.resolveWebviewView(harness.view as never);

    const event = createEvent();
    provider.postEvent(event);

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    expect(() => harness.sendInboundMessage(undefined)).not.toThrow();
    expect(() => harness.sendInboundMessage(null)).not.toThrow();
    expect(() => harness.sendInboundMessage("ready")).not.toThrow();
    expect(() => harness.sendInboundMessage({})).not.toThrow();

    expect(harness.postedMessages).toEqual([event]);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
