import { afterEach, describe, expect, it, vi } from "vitest";
import { createWatchController } from "@ext/services/watch";
import type { AgentSourceReadResult, SceneFrame } from "@shared/types";

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function createReadResult(): AgentSourceReadResult {
  return {
    agents: [
      {
        id: "agent-1",
        name: "Ada",
        kind: "local",
        status: "running",
        taskSummary: "Watch update",
        updatedAt: 1_700_000_000_100,
        source: "cursor-transcripts",
      },
    ],
    connected: true,
    sourceLabel: "cursor-transcripts",
    warnings: [],
  };
}

function createFrame(): SceneFrame {
  return {
    generatedAt: 1234,
    seats: [{ tableIndex: 0, agent: createReadResult().agents[0] }],
    queue: [],
    health: { sourceConnected: true, sourceLabel: "cursor-transcripts", warnings: [] },
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("watch controller", () => {
  it("connects, emits frames, and disconnects", async () => {
    const source = {
      sourceKind: "cursor-transcripts" as const,
      connect: vi.fn(),
      disconnect: vi.fn(),
      readSnapshot: vi.fn().mockResolvedValue(createReadResult()),
      getWatchPaths: vi.fn().mockReturnValue(["/tmp/agent.jsonl"]),
    };
    const store = { update: vi.fn().mockReturnValue(createFrame()) };

    const controller = createWatchController({
      projectPath: "/tmp/project",
      store,
      now: () => 1234,
      sourceFactory: () => source,
      watchFactory: (_path, _onEvent) => ({
        close: vi.fn(),
        on: vi.fn(),
      }),
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

    expect(source.connect).toHaveBeenCalledTimes(1);
    expect(source.readSnapshot).toHaveBeenCalled();
    expect(onFrame).toHaveBeenCalled();
    expect(source.disconnect).toHaveBeenCalledTimes(1);
  });

  it("supports one-shot refresh used by the refresh command", async () => {
    const source = {
      sourceKind: "cursor-transcripts" as const,
      connect: vi.fn(),
      disconnect: vi.fn(),
      readSnapshot: vi.fn().mockResolvedValue(createReadResult()),
      getWatchPaths: vi.fn().mockReturnValue(["/tmp/agent.jsonl"]),
    };
    const expectedFrame = createFrame();
    const store = { update: vi.fn().mockReturnValue(expectedFrame) };

    const controller = createWatchController({
      projectPath: "/tmp/project",
      store,
      now: () => 1234,
      sourceFactory: () => source,
      watchFactory: (_path, _onEvent) => ({
        close: vi.fn(),
        on: vi.fn(),
      }),
    });

    await controller.start();
    const frame = await controller.refreshNow();
    await controller.stop();

    expect(source.readSnapshot).toHaveBeenCalled();
    expect(store.update).toHaveBeenCalled();
    expect(frame).toEqual(expectedFrame);
  });

  it("debounces file-change bursts into one refresh", async () => {
    vi.useFakeTimers();

    const source = {
      sourceKind: "cursor-transcripts" as const,
      connect: vi.fn(),
      disconnect: vi.fn(),
      readSnapshot: vi
        .fn()
        .mockResolvedValueOnce(createReadResult())
        .mockResolvedValueOnce(createReadResult()),
      getWatchPaths: vi.fn().mockReturnValue(["/tmp/agent.jsonl"]),
    };
    const store = { update: vi.fn().mockReturnValue(createFrame()) };
    const watchedCallbacks: Array<() => void> = [];
    const controller = createWatchController({
      projectPath: "/tmp/project",
      store,
      now: () => 1234,
      debounceMs: 150,
      sourceFactory: () => source,
      watchFactory: (_path, onEvent) => {
        watchedCallbacks.push(onEvent);
        return {
          close: vi.fn(),
          on: vi.fn(),
        };
      },
    });

    await controller.start();
    await Promise.resolve();
    await Promise.resolve();

    expect(watchedCallbacks).toHaveLength(1);
    expect(source.readSnapshot).toHaveBeenCalledTimes(1);

    watchedCallbacks[0]();
    watchedCallbacks[0]();
    watchedCallbacks[0]();
    expect(source.readSnapshot).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(149);
    await Promise.resolve();
    expect(source.readSnapshot).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(1);
    await Promise.resolve();
    await Promise.resolve();
    expect(source.readSnapshot).toHaveBeenCalledTimes(2);

    await controller.stop();
  });

  it("serializes refreshes so reads never overlap", async () => {
    const reads: Array<ReturnType<typeof createDeferred<AgentSourceReadResult>>> = [];
    let inFlight = 0;
    let maxInFlight = 0;

    const source = {
      sourceKind: "cursor-transcripts" as const,
      connect: vi.fn(),
      disconnect: vi.fn(),
      readSnapshot: vi.fn().mockImplementation(async () => {
        inFlight += 1;
        maxInFlight = Math.max(maxInFlight, inFlight);
        const deferred = createDeferred<AgentSourceReadResult>();
        reads.push(deferred);
        try {
          return await deferred.promise;
        } finally {
          inFlight -= 1;
        }
      }),
      getWatchPaths: vi.fn().mockReturnValue(["/tmp/agent.jsonl"]),
    };
    const store = { update: vi.fn().mockReturnValue(createFrame()) };

    const controller = createWatchController({
      projectPath: "/tmp/project",
      store,
      now: () => 1234,
      sourceFactory: () => source,
      watchFactory: (_path, _onEvent) => ({
        close: vi.fn(),
        on: vi.fn(),
      }),
    });

    await controller.start();
    await Promise.resolve();

    expect(source.readSnapshot).toHaveBeenCalledTimes(1);
    expect(maxInFlight).toBe(1);

    const firstWaiter = controller.refreshNow();
    const secondWaiter = controller.refreshNow();
    await Promise.resolve();
    expect(source.readSnapshot).toHaveBeenCalledTimes(1);

    reads[0].resolve(createReadResult());
    await vi.waitFor(() => {
      expect(source.readSnapshot).toHaveBeenCalledTimes(2);
    });
    expect(maxInFlight).toBe(1);

    reads[1].resolve(createReadResult());
    await Promise.all([firstWaiter, secondWaiter]);
    await controller.stop();
  });

  it("coalesces refreshNow waiters into the same refresh cycle", async () => {
    const reads: Array<ReturnType<typeof createDeferred<AgentSourceReadResult>>> = [];
    const source = {
      sourceKind: "cursor-transcripts" as const,
      connect: vi.fn(),
      disconnect: vi.fn(),
      readSnapshot: vi.fn().mockImplementation(() => {
        const deferred = createDeferred<AgentSourceReadResult>();
        reads.push(deferred);
        return deferred.promise;
      }),
      getWatchPaths: vi.fn().mockReturnValue(["/tmp/agent.jsonl"]),
    };
    const initialFrame = createFrame();
    const refreshedFrame = createFrame();
    const store = {
      update: vi.fn().mockReturnValueOnce(initialFrame).mockReturnValueOnce(refreshedFrame),
    };

    const controller = createWatchController({
      projectPath: "/tmp/project",
      store,
      now: () => 1234,
      sourceFactory: () => source,
      watchFactory: (_path, _onEvent) => ({
        close: vi.fn(),
        on: vi.fn(),
      }),
    });

    await controller.start();
    await Promise.resolve();
    expect(source.readSnapshot).toHaveBeenCalledTimes(1);

    const firstWaiter = controller.refreshNow();
    const secondWaiter = controller.refreshNow();
    await Promise.resolve();
    expect(source.readSnapshot).toHaveBeenCalledTimes(1);

    reads[0].resolve(createReadResult());
    await vi.waitFor(() => {
      expect(source.readSnapshot).toHaveBeenCalledTimes(2);
    });

    reads[1].resolve(createReadResult());

    const [first, second] = await Promise.all([firstWaiter, secondWaiter]);
    expect(source.readSnapshot).toHaveBeenCalledTimes(2);
    expect(first).toBe(refreshedFrame);
    expect(second).toBe(refreshedFrame);

    await controller.stop();
  });

  it("rejects queued refreshNow waiters when stopped", async () => {
    const firstRead = createDeferred<AgentSourceReadResult>();
    const source = {
      sourceKind: "cursor-transcripts" as const,
      connect: vi.fn(),
      disconnect: vi.fn(),
      readSnapshot: vi.fn().mockImplementation(() => firstRead.promise),
      getWatchPaths: vi.fn().mockReturnValue(["/tmp/agent.jsonl"]),
    };
    const store = { update: vi.fn().mockReturnValue(createFrame()) };

    const controller = createWatchController({
      projectPath: "/tmp/project",
      store,
      now: () => 1234,
      sourceFactory: () => source,
      watchFactory: (_path, _onEvent) => ({
        close: vi.fn(),
        on: vi.fn(),
      }),
    });

    await controller.start();
    await Promise.resolve();
    expect(source.readSnapshot).toHaveBeenCalledTimes(1);

    const waiter = controller.refreshNow();
    await controller.stop();

    await expect(waiter).rejects.toThrow("Watch controller stopped before refresh completed.");

    firstRead.resolve(createReadResult());
    await Promise.resolve();
  });
});
