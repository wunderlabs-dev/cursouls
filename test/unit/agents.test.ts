import { describe, expect, it, vi } from "vitest";
import { AGENT_LIFECYCLE_EVENT_KIND } from "@shared/types";
import {
  createObserver,
  WATCH_LIFECYCLE_KIND,
  type CanonicalAgentSnapshot,
  type TranscriptProvider,
} from "@agentprobe/core";

interface TestAgent {
  id: string;
  status: "running" | "idle";
}

function createMockProvider(
  readSnapshotFn: () => Promise<{ agents: CanonicalAgentSnapshot[] }> | { agents: CanonicalAgentSnapshot[] },
): TranscriptProvider {
  return {
    id: "mock",
    discover: () => ({ inputs: [], watchPaths: [], warnings: [] }),
    connect: vi.fn(),
    disconnect: vi.fn(),
    read: () => ({
      records: [],
      health: { connected: true, sourceLabel: "test-source", warnings: [] },
    }),
    normalize: async (_readResult, now) => {
      const result = await readSnapshotFn();
      return {
        agents: result.agents,
        health: { connected: true, sourceLabel: "test-source", warnings: [] },
      };
    },
  };
}

function toSnapshot(agent: TestAgent): CanonicalAgentSnapshot {
  return {
    id: agent.id,
    name: `Agent ${agent.id}`,
    kind: "local",
    isSubagent: false,
    status: agent.status,
    taskSummary: "Working",
    updatedAt: Date.now(),
    source: "mock",
  };
}

describe("observer facade (migrated from agent subscription)", () => {
  it("emits changes from lifecycle with the latest snapshot", async () => {
    const provider = createMockProvider(() => ({
      agents: [toSnapshot({ id: "a-1", status: "running" })],
    }));

    const observer = createObserver({
      workspacePaths: ["/tmp/project"],
      now: () => 1234,
      provider,
    });

    const seen: Array<{ type: string }> = [];
    observer.subscribe((event) => {
      seen.push({ type: event.type });
      if (event.type === "updated") {
        expect(event.snapshot.agents[0]?.id).toBe("a-1");
        expect(event.change.kind).toBe(AGENT_LIFECYCLE_EVENT_KIND.joined);
        expect(event.agent.id).toBe("a-1");
      }
    });

    await observer.start();
    await vi.waitFor(() => {
      expect(seen.some((event) => event.type === "updated")).toBe(true);
    });
    await observer.stop();

    expect(seen.some((event) => event.type === "started")).toBe(true);
  });

  it("exposes an updated-only subscription helper", async () => {
    const provider = createMockProvider(() => ({
      agents: [toSnapshot({ id: "a-1", status: "running" })],
    }));

    const observer = createObserver({
      workspacePaths: ["/tmp/project"],
      now: () => 1234,
      provider,
    });

    const kinds: string[] = [];
    observer.subscribeToAgentChanges((event) => {
      kinds.push(event.change.kind);
      expect(event.agent.id).toBe("a-1");
    });

    await observer.start();
    await vi.waitFor(() => {
      expect(kinds).toContain(WATCH_LIFECYCLE_KIND.joined);
    });
    await observer.stop();
  });

  it("emits snapshot events even with empty agent lists", async () => {
    const provider = createMockProvider(() => ({ agents: [] }));

    const observer = createObserver({
      workspacePaths: ["/tmp/project"],
      now: () => 1234,
      provider,
    });
    const onSnapshot = vi.fn();
    observer.subscribeToSnapshots(onSnapshot);

    await observer.start();
    await vi.waitFor(() => {
      expect(onSnapshot).toHaveBeenCalled();
    });
    await observer.stop();
  });

  it("tracks latest snapshot across refreshNow", async () => {
    let callCount = 0;
    const provider = createMockProvider(() => {
      callCount += 1;
      return {
        agents: [
          toSnapshot({ id: "a-1", status: callCount <= 1 ? "running" : "idle" }),
        ],
      };
    });

    const observer = createObserver({
      workspacePaths: ["/tmp/project"],
      now: () => 1234,
      provider,
    });

    await observer.start();
    await Promise.resolve();
    await Promise.resolve();

    const refreshed = await observer.refreshNow();
    expect(refreshed.agents[0]?.status).toBe("idle");
    expect(observer.getLatestSnapshot()?.agents[0]?.status).toBe("idle");

    await observer.stop();
  });

  it("includes agent metadata for left events", async () => {
    let callCount = 0;
    const provider = createMockProvider(() => {
      callCount += 1;
      if (callCount <= 1) {
        return { agents: [toSnapshot({ id: "a-1", status: "running" })] };
      }
      return { agents: [] };
    });

    const observer = createObserver({
      workspacePaths: ["/tmp/project"],
      now: () => 1234,
      provider,
    });

    const seen: Array<{ agent?: string; type?: string }> = [];
    observer.subscribe((event) => {
      if (event.type === "updated") {
        seen.push({
          type: event.change.kind,
          agent: event.agent.id,
        });
      }
    });

    await observer.start();
    await Promise.resolve();
    await Promise.resolve();
    await observer.refreshNow();
    await observer.stop();

    const left = seen.find((entry) => entry.type === "left");
    expect(left?.agent).toBe("a-1");
  });
});
