import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SceneFrame } from "@shared/types";
import { extractMessageTypesFromSource } from "@test/unit/helpers/bridge";

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
          kind: "local",
          status: "running",
          taskSummary: "Reviewing bridge",
          startedAt: 1_700_000_000_000 - 180_000,
          updatedAt: 1_700_000_000_000 - 15_000,
          source: "mock",
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

  it("uses compatible inbound and outbound message type envelopes", () => {
    const projectRoot = resolve(__dirname, "../..");
    const webviewTypesSource = readFileSync(
      resolve(projectRoot, "src/webview/bridge/types.ts"),
      "utf8",
    );
    const providerSource = readFileSync(
      resolve(projectRoot, "src/extension/providers/provider.ts"),
      "utf8",
    );

    const outboundSection =
      webviewTypesSource
        .split("export type OutboundMessage =")[1]
        ?.split("export type InboundMessage =")[0] ?? "";
    const inboundSection =
      webviewTypesSource
        .split("export type InboundMessage =")[1]
        ?.split("export type InboundMessageType")[0] ?? "";

    const webviewOutboundTypes = extractMessageTypesFromSource(outboundSection, "type:");
    const webviewInboundTypes = extractMessageTypesFromSource(inboundSection, "type:");
    const providerInboundTypes = extractMessageTypesFromSource(providerSource, "message.type ===");
    const providerOutboundTypes = extractMessageTypesFromSource(
      providerSource,
      "postMessage({ type:",
    );

    expect(providerOutboundTypes).toEqual(webviewInboundTypes);
    expect(providerInboundTypes).toEqual(webviewOutboundTypes);
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
