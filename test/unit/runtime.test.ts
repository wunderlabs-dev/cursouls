import { createWatchRuntime } from "@agentprobe/core";
import { describe, expect, it, vi } from "vitest";

interface TestAgent {
  id: string;
  status: "running" | "idle";
}

function createAgent(): TestAgent {
  return { id: "a-1", status: "running" };
}

describe("shared watch runtime start cleanup", () => {
  it("resolves start gracefully when subscribeToChanges throws", async () => {
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
        throw new Error("watch subscribe failed");
      },
    });

    await expect(runtime.start()).resolves.toBeUndefined();
    expect(source.connect).toHaveBeenCalledTimes(1);
  });

  it("resolves start even when both subscribeToChanges and disconnect fail", async () => {
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
        throw new Error("subscribe blew up");
      },
    });

    await expect(runtime.start()).resolves.toBeUndefined();
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
