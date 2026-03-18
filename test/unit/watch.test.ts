import type { CanonicalAgentSnapshot, TranscriptProvider } from "@agentprobe/core";
import { createWatchController } from "@ext/services/watch";
import type { AgentEvent } from "@shared/types";
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
  it("emits joined events for new agents", async () => {
    const agents = [createSnapshot()];
    const provider = createMockProvider(() => ({ agents }));

    const controller = createWatchController({
      workspacePaths: ["/tmp/project"],
      now: () => 1234,
      providers: [provider],
    });

    const events: AgentEvent[] = [];
    controller.onEvent((event) => events.push(event));

    await controller.start();
    await controller.refreshNow();
    await vi.waitFor(() => {
      expect(events.length).toBeGreaterThan(0);
    });
    await controller.stop();

    const joined = events.find((e) => e.kind === "joined");
    expect(joined).toBeDefined();
    expect(joined?.agent.id).toBe("agent-1");
    expect(joined?.agent.status).toBe("running");
    expect(joined?.agent.taskSummary).toBe("Watch update");
  });

  it("emits left events when agents disappear", async () => {
    let callCount = 0;
    const provider = createMockProvider(() => {
      callCount += 1;
      if (callCount <= 1) {
        return { agents: [createSnapshot()] };
      }
      return { agents: [] };
    });

    const controller = createWatchController({
      workspacePaths: ["/tmp/project"],
      now: () => 1234,
      providers: [provider],
    });

    const events: AgentEvent[] = [];
    controller.onEvent((event) => events.push(event));

    await controller.start();
    await controller.refreshNow();
    await vi.waitFor(() => {
      expect(events.some((e) => e.kind === "joined")).toBe(true);
    });

    await controller.refreshNow();
    await vi.waitFor(() => {
      expect(events.some((e) => e.kind === "left")).toBe(true);
    });

    await controller.stop();

    const left = events.find((e) => e.kind === "left");
    expect(left?.agent.id).toBe("agent-1");
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
