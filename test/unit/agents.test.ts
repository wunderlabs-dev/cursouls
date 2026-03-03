import { describe, expect, it, vi } from "vitest";
import { createAgentSubscription } from "@shared/watch/agents";

interface TestAgent {
  id: string;
  status: "running" | "idle";
}

function createReadResult(agent: TestAgent) {
  return {
    agents: [agent],
    connected: true,
    sourceLabel: "test-source",
    warnings: [],
  };
}

describe("agent subscription facade", () => {
  it("emits changes from lifecycle with the latest snapshot", async () => {
    const source = {
      connect: vi.fn(),
      disconnect: vi.fn(),
      readSnapshot: vi.fn().mockResolvedValue(createReadResult({ id: "a-1", status: "running" })),
      getWatchPaths: vi.fn().mockReturnValue([]),
    };

    const subscription = createAgentSubscription({
      projectPath: "/tmp/project",
      now: () => 1234,
      sourceFactory: () => source as never,
      watchFactory: () => ({ close: vi.fn(), on: vi.fn() }),
    });

    const seen: Array<{ type: string }> = [];
    subscription.subscribe((event) => {
      seen.push({ type: event.type });
      if (event.type === "updated") {
        expect(event.snapshot.agents[0]?.id).toBe("a-1");
        expect(event.change.kind).toBe("joined");
        expect(event.agent.id).toBe("a-1");
      }
    });

    await subscription.start();
    await Promise.resolve();
    await Promise.resolve();
    await subscription.stop();

    expect(seen.some((event) => event.type === "started")).toBe(true);
    expect(seen.some((event) => event.type === "updated")).toBe(true);
  });

  it("exposes an updated-only subscription helper", async () => {
    const source = {
      connect: vi.fn(),
      disconnect: vi.fn(),
      readSnapshot: vi.fn().mockResolvedValue(createReadResult({ id: "a-1", status: "running" })),
      getWatchPaths: vi.fn().mockReturnValue([]),
    };

    const subscription = createAgentSubscription({
      projectPath: "/tmp/project",
      now: () => 1234,
      sourceFactory: () => source as never,
      watchFactory: () => ({ close: vi.fn(), on: vi.fn() }),
    });

    const kinds: string[] = [];
    subscription.subscribeToAgentChanges((event) => {
      kinds.push(event.change.kind);
      expect(event.agent.id).toBe("a-1");
    });

    await subscription.start();
    await Promise.resolve();
    await Promise.resolve();
    await subscription.stop();

    expect(kinds).toContain("joined");
  });

  it("tracks latest snapshot across refreshNow", async () => {
    const source = {
      connect: vi.fn(),
      disconnect: vi.fn(),
      readSnapshot: vi
        .fn()
        .mockResolvedValueOnce(createReadResult({ id: "a-1", status: "running" }))
        .mockResolvedValueOnce(createReadResult({ id: "a-1", status: "idle" })),
      getWatchPaths: vi.fn().mockReturnValue([]),
    };

    const subscription = createAgentSubscription({
      projectPath: "/tmp/project",
      now: () => 1234,
      sourceFactory: () => source as never,
      watchFactory: () => ({ close: vi.fn(), on: vi.fn() }),
    });

    await subscription.start();
    await Promise.resolve();
    await Promise.resolve();

    const refreshed = await subscription.refreshNow();
    expect(refreshed.agents[0]?.status).toBe("idle");
    expect(subscription.getLatestSnapshot()?.agents[0]?.status).toBe("idle");

    await subscription.stop();
  });

  it("includes agent metadata for left events", async () => {
    const source = {
      connect: vi.fn(),
      disconnect: vi.fn(),
      readSnapshot: vi
        .fn()
        .mockResolvedValueOnce(createReadResult({ id: "a-1", status: "running" }))
        .mockResolvedValueOnce({
          agents: [],
          connected: true,
          sourceLabel: "test-source",
          warnings: [],
        }),
      getWatchPaths: vi.fn().mockReturnValue([]),
    };

    const subscription = createAgentSubscription({
      projectPath: "/tmp/project",
      now: () => 1234,
      sourceFactory: () => source as never,
      watchFactory: () => ({ close: vi.fn(), on: vi.fn() }),
    });

    const seen: Array<{ agent?: string; type?: string }> = [];
    subscription.subscribe((event) => {
      if (event.type === "updated") {
        seen.push({
          type: event.change.kind,
          agent: event.agent.id,
        });
      }
    });

    await subscription.start();
    await Promise.resolve();
    await Promise.resolve();
    await subscription.refreshNow();
    await subscription.stop();

    const left = seen.find((entry) => entry.type === "left");
    expect(left?.agent).toBe("a-1");
  });
});
