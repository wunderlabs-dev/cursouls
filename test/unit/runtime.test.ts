import { describe, expect, it, vi } from "vitest";
import { createWatchRuntime } from "@shared/watch/runtime";

interface TestAgent {
  id: string;
  status: "running" | "idle";
}

function createAgent(): TestAgent {
  return { id: "a-1", status: "running" };
}

describe("shared watch runtime start cleanup", () => {
  it("disconnects source when start fails after connect", async () => {
    const startError = new Error("watch subscribe failed");
    const source = {
      connect: vi.fn(),
      disconnect: vi.fn(),
      readSnapshot: vi.fn().mockResolvedValue({
        agents: [createAgent()],
        health: { connected: true, sourceLabel: "test", warnings: [] },
      }),
    };

    const runtime = createWatchRuntime<TestAgent, TestAgent["status"]>({
      source,
      lifecycle: {
        getId: (agent) => agent.id,
        getStatus: (agent) => agent.status,
      },
      watchPaths: ["/tmp/agent.jsonl"],
      subscribeToChanges: () => {
        throw startError;
      },
    });

    await expect(runtime.start()).rejects.toBe(startError);
    expect(source.connect).toHaveBeenCalledTimes(1);
    expect(source.disconnect).toHaveBeenCalledTimes(1);
  });

  it("preserves original start error when disconnect also fails", async () => {
    const startError = new Error("subscribe blew up");
    const source = {
      connect: vi.fn(),
      disconnect: vi.fn().mockRejectedValue(new Error("disconnect failure")),
      readSnapshot: vi.fn().mockResolvedValue({
        agents: [createAgent()],
        health: { connected: true, sourceLabel: "test", warnings: [] },
      }),
    };

    const runtime = createWatchRuntime<TestAgent, TestAgent["status"]>({
      source,
      lifecycle: {
        getId: (agent) => agent.id,
        getStatus: (agent) => agent.status,
      },
      watchPaths: ["/tmp/agent.jsonl"],
      subscribeToChanges: () => {
        throw startError;
      },
    });

    await expect(runtime.start()).rejects.toBe(startError);
    expect(source.disconnect).toHaveBeenCalledTimes(1);
  });

  it("continues notifying other listeners when one listener throws", async () => {
    const source = {
      connect: vi.fn(),
      disconnect: vi.fn(),
      readSnapshot: vi.fn().mockResolvedValue({
        agents: [createAgent()],
        health: { connected: true, sourceLabel: "test", warnings: [] },
      }),
    };

    const runtime = createWatchRuntime<TestAgent, TestAgent["status"]>({
      source,
      lifecycle: {
        getId: (agent) => agent.id,
        getStatus: (agent) => agent.status,
      },
    });

    runtime.subscribe((event) => {
      if (event.type === "snapshot") {
        throw new Error("listener blew up");
      }
    });
    const healthyListener = vi.fn();
    runtime.subscribe(healthyListener);

    await runtime.start();
    await runtime.refreshNow();
    await runtime.stop();

    expect(healthyListener).toHaveBeenCalled();
  });

  it("rejects refresh when runtime is not started", async () => {
    const source = {
      connect: vi.fn(),
      disconnect: vi.fn(),
      readSnapshot: vi.fn().mockResolvedValue({
        agents: [createAgent()],
        health: { connected: true, sourceLabel: "test", warnings: [] },
      }),
    };

    const runtime = createWatchRuntime<TestAgent, TestAgent["status"]>({
      source,
      lifecycle: {
        getId: (agent) => agent.id,
        getStatus: (agent) => agent.status,
      },
    });

    await expect(runtime.refreshNow()).rejects.toMatchObject({
      name: "WatchRuntimeError",
      code: "NOT_RUNNING",
    });
  });
});
