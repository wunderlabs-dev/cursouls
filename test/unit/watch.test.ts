import type { CanonicalAgentSnapshot, TranscriptProvider } from "@agentprobe/core";
import { createWatchController } from "@ext/services/watch";
import { afterEach, describe, expect, it, vi } from "vitest";

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
  it("connects, emits actors, and disconnects", async () => {
    const provider = createMockProvider(() => ({ agents: createAgents() }));

    const controller = createWatchController({
      workspacePaths: ["/tmp/project"],
      now: () => 1234,
      providers: [provider],
    });

    expect(typeof controller.start).toBe("function");
    expect(typeof controller.stop).toBe("function");
    expect(typeof controller.onActors).toBe("function");
    expect(typeof controller.onError).toBe("function");

    const onActors = vi.fn();
    const dispose = controller.onActors(onActors);

    await controller.start();
    await controller.refreshNow();
    await vi.waitFor(() => {
      expect(onActors).toHaveBeenCalled();
    });
    dispose();
    await controller.stop();

    expect(provider.connect).toHaveBeenCalledTimes(1);
    expect(provider.disconnect).toHaveBeenCalledTimes(1);
  });

  it("filters out initial agents and only returns new ones", async () => {
    let includeNew = false;
    const provider = createMockProvider(() => {
      const agents = [...createAgents()];
      if (includeNew) {
        agents.push({ ...createAgents()[0], id: "agent-2", name: "New", taskSummary: "New task" });
      }
      return { agents };
    });

    const controller = createWatchController({
      workspacePaths: ["/tmp/project"],
      now: () => 1234,
      providers: [provider],
    });

    await controller.start();
    const initial = await controller.refreshNow();
    expect(initial.length).toBe(0);

    includeNew = true;
    const afterNew = await controller.refreshNow();
    expect(afterNew.length).toBe(1);
    expect(afterNew[0].id).toBe("agent-2");

    await controller.stop();
  });

  it("surfaces source errors through refreshNow", async () => {
    const provider: TranscriptProvider = {
      id: "mock",
      discover: () => ({ inputs: [], watchPaths: [], warnings: [] }),
      connect: vi.fn(),
      disconnect: vi.fn(),
      read: () => {
        throw new Error("boom");
      },
      normalize: () => ({
        agents: [],
        health: { connected: false, sourceLabel: "mock", warnings: [] },
      }),
    };

    const controller = createWatchController({
      workspacePaths: ["/tmp/project"],
      now: () => 1234,
      providers: [provider],
    });

    await controller.start();
    await expect(controller.refreshNow()).rejects.toThrow();
    await controller.stop();
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

    const controller = createWatchController({
      workspacePaths: ["/tmp/project"],
      now: () => 1234,
      providers: [provider],
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
