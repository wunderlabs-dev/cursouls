import { afterEach, describe, expect, it, vi } from "vitest";
import { createWatchController } from "@ext/services/watch";
import type { SceneFrame } from "@shared/types";
import type { CanonicalAgentSnapshot, TranscriptProvider } from "@agentprobe/core";

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function createAgents(): CanonicalAgentSnapshot[] {
  return [
    {
      id: "agent-1",
      name: "Ada",
      kind: "local",
      isSubagent: false,
      status: "running",
      taskSummary: "Watch update",
      updatedAt: 1_700_000_000_100,
      source: "cursor-transcripts",
    },
  ];
}

function createFrame(): SceneFrame {
  return {
    generatedAt: 1234,
    seats: [{ tableIndex: 0, agent: createAgents()[0] }],
    queue: [],
    health: { sourceConnected: true, sourceLabel: "cursor-transcripts", warnings: [] },
  };
}

function createMockProvider(
  normalizeFn: () =>
    | Promise<{ agents: CanonicalAgentSnapshot[] }>
    | { agents: CanonicalAgentSnapshot[] },
): TranscriptProvider {
  return {
    id: "mock",
    discover: () => ({ inputs: [], watchPaths: [], warnings: [] }),
    connect: vi.fn(),
    disconnect: vi.fn(),
    read: () => ({
      records: [],
      health: { connected: true, sourceLabel: "cursor-transcripts", warnings: [] },
    }),
    normalize: async () => {
      const result = await normalizeFn();
      return {
        agents: result.agents,
        health: { connected: true, sourceLabel: "cursor-transcripts", warnings: [] },
      };
    },
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("watch controller", () => {
  it("connects, emits frames, and disconnects", async () => {
    const provider = createMockProvider(() => ({ agents: createAgents() }));
    const store = { update: vi.fn().mockReturnValue(createFrame()) };

    const controller = createWatchController({
      workspacePaths: ["/tmp/project"],
      store,
      now: () => 1234,
      provider,
    });

    expect(typeof controller.start).toBe("function");
    expect(typeof controller.stop).toBe("function");
    expect(typeof controller.onFrame).toBe("function");
    expect(typeof controller.onError).toBe("function");

    const onFrame = vi.fn();
    const dispose = controller.onFrame(onFrame);

    await controller.start();
    await Promise.resolve();
    await Promise.resolve();
    dispose();
    await controller.stop();

    expect(provider.connect).toHaveBeenCalledTimes(1);
    expect(onFrame).toHaveBeenCalled();
    expect(provider.disconnect).toHaveBeenCalledTimes(1);
  });

  it("supports one-shot refresh used by the refresh command", async () => {
    const provider = createMockProvider(() => ({ agents: createAgents() }));
    const expectedFrame = createFrame();
    const store = { update: vi.fn().mockReturnValue(expectedFrame) };

    const controller = createWatchController({
      workspacePaths: ["/tmp/project"],
      store,
      now: () => 1234,
      provider,
    });

    await controller.start();
    const frame = await controller.refreshNow();
    await controller.stop();

    expect(store.update).toHaveBeenCalled();
    expect(frame).toEqual(expectedFrame);
  });

  it("emits frame updates even when snapshot has no agent lifecycle changes", async () => {
    let callCount = 0;
    const provider: TranscriptProvider = {
      id: "mock",
      discover: () => ({ inputs: [], watchPaths: [], warnings: [] }),
      connect: vi.fn(),
      disconnect: vi.fn(),
      read: () => ({
        records: [],
        health: { connected: callCount > 0 ? false : true, sourceLabel: "cursor-transcripts", warnings: callCount > 0 ? ["source unavailable"] : [] },
      }),
      normalize: async (_readResult) => {
        callCount += 1;
        return {
          agents: [],
          health: {
            connected: callCount > 1 ? false : true,
            sourceLabel: "cursor-transcripts",
            warnings: callCount > 1 ? ["source unavailable"] : [],
          },
        };
      },
    };

    const controller = createWatchController({
      workspacePaths: ["/tmp/project"],
      now: () => 1234,
      provider,
    });
    const onFrame = vi.fn();
    const onLifecycle = vi.fn();
    controller.onFrame(onFrame);
    controller.onLifecycleEvents(onLifecycle);

    await controller.start();
    await vi.waitFor(() => {
      expect(onFrame).toHaveBeenCalled();
    });

    const refreshed = await controller.refreshNow();

    expect(refreshed.health.sourceConnected).toBe(false);
    expect(refreshed.health.warnings).toContain("source unavailable");
    expect(onLifecycle).not.toHaveBeenCalled();
    await controller.stop();
  });

  it("forwards lifecycle updates through onLifecycleEvents", async () => {
    const provider = createMockProvider(() => ({ agents: createAgents() }));
    const store = { update: vi.fn().mockReturnValue(createFrame()) };
    const onLifecycle = vi.fn();

    const controller = createWatchController({
      workspacePaths: ["/tmp/project"],
      store,
      now: () => 1234,
      provider,
    });

    controller.onLifecycleEvents(onLifecycle);
    await controller.start();
    await Promise.resolve();
    await Promise.resolve();
    await controller.stop();

    expect(onLifecycle).toHaveBeenCalled();
    expect(onLifecycle.mock.calls[0]?.[0]?.[0]?.kind).toBe("joined");
  });

  it("forwards source errors through onError", async () => {
    const provider: TranscriptProvider = {
      id: "mock",
      discover: () => ({ inputs: [], watchPaths: [], warnings: [] }),
      connect: vi.fn(),
      disconnect: vi.fn(),
      read: () => { throw new Error("boom"); },
      normalize: () => ({ agents: [], health: { connected: false, sourceLabel: "mock", warnings: [] } }),
    };
    const onError = vi.fn();

    const controller = createWatchController({
      workspacePaths: ["/tmp/project"],
      now: () => 1234,
      provider,
    });

    controller.onError(onError);
    await controller.start();
    await Promise.resolve();
    await Promise.resolve();
    await controller.stop();

    expect(onError).toHaveBeenCalled();
    expect(onError.mock.calls[0]?.[0]).toBeInstanceOf(Error);
  });

  it("rejects queued refreshNow waiters when stopped", async () => {
    const firstRead = createDeferred<{ agents: CanonicalAgentSnapshot[] }>();
    const provider: TranscriptProvider = {
      id: "mock",
      discover: () => ({ inputs: [], watchPaths: [], warnings: [] }),
      connect: vi.fn(),
      disconnect: vi.fn(),
      read: () => ({
        records: [],
        health: { connected: true, sourceLabel: "cursor-transcripts", warnings: [] },
      }),
      normalize: async () => {
        const result = await firstRead.promise;
        return {
          agents: result.agents,
          health: { connected: true, sourceLabel: "cursor-transcripts", warnings: [] },
        };
      },
    };
    const store = { update: vi.fn().mockReturnValue(createFrame()) };

    const controller = createWatchController({
      workspacePaths: ["/tmp/project"],
      store,
      now: () => 1234,
      provider,
    });

    await controller.start();
    await Promise.resolve();

    const waiter = controller.refreshNow();
    await controller.stop();

    await expect(waiter).rejects.toThrow("Watch controller stopped before refresh completed.");

    firstRead.resolve({ agents: createAgents() });
    await Promise.resolve();
  });
});
