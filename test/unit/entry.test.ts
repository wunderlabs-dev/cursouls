import type { WatchController } from "@ext/services/watch";
import type { AgentEvent } from "@shared/types";
import { EVENT_KIND } from "@shared/types";
import { beforeEach, describe, expect, it, vi } from "vitest";

type Listener<T> = (value: T) => void;

type VscodeMock = {
  window: {
    createOutputChannel: ReturnType<typeof vi.fn>;
    registerWebviewViewProvider: ReturnType<typeof vi.fn>;
    showErrorMessage: ReturnType<typeof vi.fn>;
    showWarningMessage: ReturnType<typeof vi.fn>;
  };
  workspace: {
    getConfiguration: ReturnType<typeof vi.fn>;
    workspaceFolders: Array<{ uri: { fsPath: string } }>;
    onDidChangeWorkspaceFolders: ReturnType<typeof vi.fn>;
    onDidChangeConfiguration: ReturnType<typeof vi.fn>;
  };
  commands: {
    registerCommand: ReturnType<typeof vi.fn>;
  };
  Disposable: new (callback: () => void) => { dispose(): void };
};

class MockDisposable {
  private readonly callback: () => void;
  constructor(callback: () => void) {
    this.callback = callback;
  }
  dispose(): void {
    this.callback();
  }
}

function createEvent(): AgentEvent {
  return {
    kind: EVENT_KIND.joined,
    agent: { id: "a-1", status: "running", taskSummary: "Working" },
  };
}

function flushAsyncSchedule(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 50));
}

function buildVscodeMock(overrides: {
  showErrorMessage?: ReturnType<typeof vi.fn>;
  registerCommand?: ReturnType<typeof vi.fn>;
  outputChannel?: { appendLine: ReturnType<typeof vi.fn>; dispose: ReturnType<typeof vi.fn> };
}): VscodeMock {
  const outputChannel = overrides.outputChannel ?? {
    appendLine: vi.fn(),
    dispose: vi.fn(),
  };
  return {
    window: {
      createOutputChannel: vi.fn(() => outputChannel),
      registerWebviewViewProvider: vi.fn(() => ({ dispose: vi.fn() })),
      showErrorMessage: overrides.showErrorMessage ?? vi.fn().mockResolvedValue(undefined),
      showWarningMessage: vi.fn().mockResolvedValue(undefined),
    },
    workspace: {
      getConfiguration: vi.fn(() => ({})),
      workspaceFolders: [{ uri: { fsPath: "/tmp/project" } }],
      onDidChangeWorkspaceFolders: vi.fn(() => ({ dispose: vi.fn() })),
      onDidChangeConfiguration: vi.fn(() => ({ dispose: vi.fn() })),
    },
    commands: {
      registerCommand: overrides.registerCommand ?? vi.fn(() => ({ dispose: vi.fn() })),
    },
    Disposable: MockDisposable,
  };
}

function registerVscodeMock(mock: VscodeMock): void {
  vi.doMock("vscode", () => mock, { virtual: true });
}

function registerServiceMocks(overrides: {
  readCafeConfig?: ReturnType<typeof vi.fn>;
  createLogger?: ReturnType<typeof vi.fn>;
  createCafeViewProvider?: ReturnType<typeof vi.fn>;
  createWatchController?: ReturnType<typeof vi.fn>;
}): void {
  vi.doMock("@ext/config", () => ({
    readCafeConfig: overrides.readCafeConfig ?? vi.fn(() => ({ refreshMs: 1500 })),
  }));
  vi.doMock("@ext/logging", () => ({
    createLogger:
      overrides.createLogger ?? vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
  }));
  vi.doMock("@ext/providers/provider", () => ({
    CAFE_VIEW_TYPE: "cursorCafe.sidebar",
    createCafeViewProvider: overrides.createCafeViewProvider ?? vi.fn(),
  }));
  vi.doMock("@ext/services/watch", () => ({
    createWatchController: overrides.createWatchController ?? vi.fn(),
  }));
}

describe("extension entry wiring", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("wires watch events into provider and starts controller on activate", async () => {
    let eventListener: Listener<AgentEvent> | undefined;
    let errorListener: Listener<unknown> | undefined;
    let refreshCommand: (() => Promise<void>) | undefined;

    const event = createEvent();

    const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const viewProvider = {
      postEvent: vi.fn(),
      resolveWebviewView: vi.fn(),
    };
    const watchController: WatchController = {
      start: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn().mockResolvedValue(undefined),
      refreshNow: vi.fn().mockResolvedValue(undefined),
      onEvent: vi.fn((listener: Listener<AgentEvent>) => {
        eventListener = listener;
        return () => undefined;
      }),
      onError: vi.fn((listener: Listener<unknown>) => {
        errorListener = listener;
        return () => undefined;
      }),
    };

    registerVscodeMock(
      buildVscodeMock({
        registerCommand: vi.fn((_id: string, callback: () => Promise<void>) => {
          refreshCommand = callback;
          return { dispose: vi.fn() };
        }),
      }),
    );
    registerServiceMocks({
      readCafeConfig: vi.fn(() => ({ refreshMs: 1500 })),
      createLogger: vi.fn(() => logger),
      createCafeViewProvider: vi.fn(() => viewProvider),
      createWatchController: vi.fn(() => watchController),
    });

    const { activate } = await import("@ext/entry");
    activate({ extensionUri: {} as never, subscriptions: [] } as never);
    await flushAsyncSchedule();

    expect(watchController.start).toHaveBeenCalledTimes(1);
    expect(typeof refreshCommand).toBe("function");

    eventListener?.(event);
    errorListener?.(new Error("watch failed"));

    expect(viewProvider.postEvent).toHaveBeenCalledWith(event);
    expect(logger.error).toHaveBeenCalledWith("Watch refresh error: watch failed");
  });

  it("surfaces refresh command failures through logger and error message", async () => {
    let refreshCommand: (() => Promise<void>) | undefined;
    const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const viewProvider = {
      postEvent: vi.fn(),
      resolveWebviewView: vi.fn(),
    };
    const showErrorMessage = vi.fn().mockResolvedValue(undefined);
    const watchController: WatchController = {
      start: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn().mockResolvedValue(undefined),
      refreshNow: vi.fn().mockRejectedValue(new Error("boom")),
      onEvent: vi.fn(() => () => undefined),
      onError: vi.fn(() => () => undefined),
    };

    registerVscodeMock(
      buildVscodeMock({
        showErrorMessage,
        registerCommand: vi.fn((_id: string, callback: () => Promise<void>) => {
          refreshCommand = callback;
          return { dispose: vi.fn() };
        }),
      }),
    );
    registerServiceMocks({
      createLogger: vi.fn(() => logger),
      createCafeViewProvider: vi.fn(() => viewProvider),
      createWatchController: vi.fn(() => watchController),
    });

    const { activate } = await import("@ext/entry");
    activate({ extensionUri: {} as never, subscriptions: [] } as never);
    await flushAsyncSchedule();

    expect(refreshCommand).toBeDefined();
    await refreshCommand?.();

    expect(logger.error).toHaveBeenCalledWith("Cursor Cafe refresh failed: boom");
    expect(showErrorMessage).toHaveBeenCalledWith("Cursor Cafe refresh failed: boom");
  });

  it("stops active controller exactly once on deactivate", async () => {
    const viewProvider = {
      postEvent: vi.fn(),
      resolveWebviewView: vi.fn(),
    };
    const watchController: WatchController = {
      start: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn().mockResolvedValue(undefined),
      refreshNow: vi.fn().mockResolvedValue(undefined),
      onEvent: vi.fn(() => () => undefined),
      onError: vi.fn(() => () => undefined),
    };

    registerVscodeMock(buildVscodeMock({}));
    registerServiceMocks({
      createCafeViewProvider: vi.fn(() => viewProvider),
      createWatchController: vi.fn(() => watchController),
    });

    const { activate, deactivate } = await import("@ext/entry");
    activate({ extensionUri: {} as never, subscriptions: [] } as never);
    await flushAsyncSchedule();

    await deactivate();
    await deactivate();

    expect(watchController.stop).toHaveBeenCalledTimes(1);
  });
});
