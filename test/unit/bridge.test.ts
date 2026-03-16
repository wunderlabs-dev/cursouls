import {
  BRIDGE_AGENT_ANCHOR,
  BRIDGE_INBOUND_TYPE,
  BRIDGE_OUTBOUND_TYPE,
  type InboundMessage,
  type OutboundMessage,
} from "@shared/bridge";
import type { AgentLifecycleEvent, SceneFrame } from "@shared/types";
import {
  AGENT_KIND,
  AGENT_LIFECYCLE_EVENT_KIND,
  AGENT_SOURCE_KIND,
  AGENT_STATUS,
} from "@shared/types";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("vscode", () => ({}), { virtual: true });
vi.mock("@ext/providers/html", () => ({
  getWebviewHtml: () => "<html></html>",
}));

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
  ];
}

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

describe("webview bridge compatibility", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(1_700_000_000_000);
  });

  it("uses shared bridge contracts for message envelopes", () => {
    const outboundReady: OutboundMessage = { type: BRIDGE_OUTBOUND_TYPE.ready };
    const outboundClick: OutboundMessage = {
      type: BRIDGE_OUTBOUND_TYPE.agentClick,
      agentId: "a-1",
      anchor: BRIDGE_AGENT_ANCHOR.seat,
    };
    const inboundFrame: InboundMessage = {
      type: BRIDGE_INBOUND_TYPE.sceneFrame,
      frame: buildFrame(),
    };

    expect(outboundReady.type).toBe("ready");
    expect(outboundClick.type).toBe("agentClick");
    expect(inboundFrame.type).toBe("sceneFrame");
    expect(AGENT_STATUS.running).toBe("running");
    expect(AGENT_KIND.local).toBe("local");
    expect(AGENT_SOURCE_KIND.mock).toBe("mock");
    expect(AGENT_LIFECYCLE_EVENT_KIND.joined).toBe("joined");
  });

  it("replays the latest scene frame when the webview sends ready", async () => {
    const { createCafeViewProvider } = await import("@ext/providers/provider");
    const provider = createCafeViewProvider({} as never);
    const harness = createWebviewViewMock();
    provider.resolveWebviewView(harness.view as never);

    const frame = buildFrame();
    provider.updateFrame(frame);
    harness.sendInboundMessage({ type: "ready" });

    expect(harness.postedMessages).toEqual([
      { type: "sceneFrame", frame },
      { type: "sceneFrame", frame },
    ]);
  });

  it("replays the latest lifecycle events when the webview sends ready", async () => {
    const { createCafeViewProvider } = await import("@ext/providers/provider");
    const provider = createCafeViewProvider({} as never);
    const harness = createWebviewViewMock();
    provider.resolveWebviewView(harness.view as never);

    const events = buildLifecycleEvents();
    provider.updateLifecycleEvents(events);
    harness.sendInboundMessage({ type: "ready" });

    expect(harness.postedMessages).toEqual([
      { type: "lifecycleEvents", events },
      { type: "lifecycleEvents", events },
    ]);
  });

  it("sends tooltipData for known agents and hideTooltip for unknown agents", async () => {
    const { createCafeViewProvider } = await import("@ext/providers/provider");
    const provider = createCafeViewProvider({} as never);
    const harness = createWebviewViewMock();
    provider.resolveWebviewView(harness.view as never);
    provider.updateFrame(buildFrame());

    harness.sendInboundMessage({ type: "agentClick", agentId: "a-1", anchor: "seat" });
    harness.sendInboundMessage({ type: "agentClick", agentId: "missing", anchor: "queue" });

    const tooltipEnvelope = harness.postedMessages[1] as {
      type: string;
      tooltip: { id: string; task: string };
    };
    expect(tooltipEnvelope.type).toBe("tooltipData");
    expect(tooltipEnvelope.tooltip.id).toBe("a-1");
    expect(tooltipEnvelope.tooltip.task).toBe("Reviewing bridge");
    expect(harness.postedMessages[2]).toEqual({ type: "hideTooltip" });
  });

  it("stops posting messages after the view is disposed", async () => {
    const { createCafeViewProvider } = await import("@ext/providers/provider");
    const provider = createCafeViewProvider({} as never);
    const harness = createWebviewViewMock();
    provider.resolveWebviewView(harness.view as never);
    harness.dispose();

    provider.updateFrame(buildFrame());

    expect(harness.postedMessages).toEqual([]);
  });

  it("ignores malformed inbound messages without crashing", async () => {
    const { createCafeViewProvider } = await import("@ext/providers/provider");
    const provider = createCafeViewProvider({} as never);
    const harness = createWebviewViewMock();
    provider.resolveWebviewView(harness.view as never);
    provider.updateFrame(buildFrame());

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    expect(() => harness.sendInboundMessage(undefined)).not.toThrow();
    expect(() => harness.sendInboundMessage(null)).not.toThrow();
    expect(() => harness.sendInboundMessage("ready")).not.toThrow();
    expect(() => harness.sendInboundMessage({})).not.toThrow();
    expect(() => harness.sendInboundMessage({ type: "agentClick" })).not.toThrow();
    expect(() =>
      harness.sendInboundMessage({ type: "agentClick", agentId: 123, anchor: "seat" }),
    ).not.toThrow();
    expect(() => harness.sendInboundMessage({ type: "unexpected" })).not.toThrow();

    expect(harness.postedMessages).toEqual([{ type: "sceneFrame", frame: buildFrame() }]);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
