import { BRIDGE_INBOUND_TYPE, BRIDGE_OUTBOUND_TYPE, type OutboundMessage } from "@shared/bridge";
import type { Actor } from "@shared/types";
import { AGENT_STATUS } from "@shared/types";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("vscode", () => ({}), { virtual: true });
vi.mock("@ext/providers/html", () => ({
  getWebviewHtml: () => "<html></html>",
}));

function buildActors(): Actor[] {
  return [{ id: "a-1", status: AGENT_STATUS.running, taskSummary: "Reviewing bridge" }];
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
    expect(outboundReady.type).toBe("ready");
    expect(AGENT_STATUS.running).toBe("running");
  });

  it("replays the latest actors when the webview sends ready", async () => {
    const { createCafeViewProvider } = await import("@ext/providers/provider");
    const provider = createCafeViewProvider({} as never);
    const harness = createWebviewViewMock();
    provider.resolveWebviewView(harness.view as never);

    const actors = buildActors();
    provider.updateActors(actors);
    harness.sendInboundMessage({ type: "ready" });

    expect(harness.postedMessages).toEqual([
      { type: BRIDGE_INBOUND_TYPE.agents, actors },
      { type: BRIDGE_INBOUND_TYPE.agents, actors },
    ]);
  });

  it("stops posting messages after the view is disposed", async () => {
    const { createCafeViewProvider } = await import("@ext/providers/provider");
    const provider = createCafeViewProvider({} as never);
    const harness = createWebviewViewMock();
    provider.resolveWebviewView(harness.view as never);
    harness.dispose();

    provider.updateActors(buildActors());

    expect(harness.postedMessages).toEqual([]);
  });

  it("ignores malformed inbound messages without crashing", async () => {
    const { createCafeViewProvider } = await import("@ext/providers/provider");
    const provider = createCafeViewProvider({} as never);
    const harness = createWebviewViewMock();
    provider.resolveWebviewView(harness.view as never);
    provider.updateActors(buildActors());

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    expect(() => harness.sendInboundMessage(undefined)).not.toThrow();
    expect(() => harness.sendInboundMessage(null)).not.toThrow();
    expect(() => harness.sendInboundMessage("ready")).not.toThrow();
    expect(() => harness.sendInboundMessage({})).not.toThrow();
    expect(() => harness.sendInboundMessage({ type: "unexpected" })).not.toThrow();

    expect(harness.postedMessages).toEqual([
      { type: BRIDGE_INBOUND_TYPE.agents, actors: buildActors() },
    ]);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
