import { afterEach, describe, expect, it, vi } from "vitest";
import { createWatchController } from "@ext/services/watch";
import type { AgentSourceReadResult, SceneFrame } from "@shared/types";

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
    };
    const store = { update: vi.fn().mockReturnValue(createFrame()) };

    const controller = createWatchController({
      source,
      store,
      now: () => 1234,
      watchPaths: ["/tmp/agent.jsonl"],
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
    };
    const expectedFrame = createFrame();
    const store = { update: vi.fn().mockReturnValue(expectedFrame) };

    const controller = createWatchController({
      source,
      store,
      now: () => 1234,
      watchPaths: ["/tmp/agent.jsonl"],
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
    };
    const store = { update: vi.fn().mockReturnValue(createFrame()) };
    const watchedCallbacks: Array<() => void> = [];
    const controller = createWatchController({
      source,
      store,
      now: () => 1234,
      debounceMs: 150,
      watchPaths: ["/tmp/agent.jsonl"],
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
});
