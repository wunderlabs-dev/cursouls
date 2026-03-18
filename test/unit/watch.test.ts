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

function createSnapshot(overrides?: Partial<CanonicalAgentSnapshot>): CanonicalAgentSnapshot {
  return {
    id: "agent-1",
    name: "Ada",
    kind: "local",
    isSubagent: false,
    status: "running",
    taskSummary: "Watch update",
    updatedAt: 1_700_000_000_100,
    source: "cursor-transcripts",
    ...overrides,
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
  it("connects, emits agents, and disconnects", async () => {
    const agents = [createSnapshot()];
    const provider = createMockProvider(() => ({ agents }));

    const controller = createWatchController({
      workspacePaths: ["/tmp/project"],
      now: () => 1234,
      providers: [provider],
    });

    const onAgents = vi.fn();
    const dispose = controller.onAgents(onAgents);

    await controller.start();
    await controller.refreshNow();
    await vi.waitFor(() => {
      expect(onAgents).toHaveBeenCalled();
    });
    dispose();
    await controller.stop();

    expect(provider.connect).toHaveBeenCalledTimes(1);
    expect(provider.disconnect).toHaveBeenCalledTimes(1);
  });

  it("passes through all agents without filtering", async () => {
    const agents = [
      createSnapshot({ id: "agent-1" }),
      createSnapshot({ id: "agent-2", isSubagent: true, status: "idle" }),
    ];
    const provider = createMockProvider(() => ({ agents }));

    const controller = createWatchController({
      workspacePaths: ["/tmp/project"],
      now: () => 1234,
      providers: [provider],
    });

    const result = await startAndRefresh(controller);
    expect(result).toHaveLength(2);
    expect(result.map((a) => a.id)).toEqual(["agent-1", "agent-2"]);

    await controller.stop();
  });

  it("does not filter out agents that existed at startup", async () => {
    const agents = [createSnapshot({ id: "agent-1" })];
    const provider = createMockProvider(() => ({ agents }));

    const controller = createWatchController({
      workspacePaths: ["/tmp/project"],
      now: () => 1234,
      providers: [provider],
    });

    const first = await startAndRefresh(controller);
    expect(first).toHaveLength(1);

    const second = await controller.refreshNow();
    expect(second).toHaveLength(1);

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

    firstRead.resolve({ agents: [createSnapshot()] });
    await Promise.resolve();
  });
});

async function startAndRefresh(
  controller: ReturnType<typeof createWatchController>,
): Promise<CanonicalAgentSnapshot[]> {
  await controller.start();
  return controller.refreshNow();
}
