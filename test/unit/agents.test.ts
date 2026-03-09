import { describe, expect, it, vi } from "vitest";
import { AGENT_LIFECYCLE_EVENT_KIND } from "@shared/types";
import {
  createObserver,
  WATCH_LIFECYCLE_KIND,
  type CanonicalAgentSnapshot,
  type ObserverChangeEvent,
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

describe("observer facade", () => {
  it("emits lifecycle changes with agent and snapshot context", async () => {
    const provider = createMockProvider(() => ({
      agents: [toSnapshot({ id: "a-1", status: "running" })],
    }));

    const observer = createObserver({
      workspacePaths: ["/tmp/project"],
      now: () => 1234,
      provider,
    });

    const seen: ObserverChangeEvent[] = [];
    observer.subscribe((event) => {
      seen.push(event);
    });

    await observer.start();
    await vi.waitFor(() => {
      expect(seen.length).toBeGreaterThan(0);
    });
    await observer.stop();

    const joined = seen.find((e) => e.change.kind === AGENT_LIFECYCLE_EVENT_KIND.joined);
    expect(joined).toBeDefined();
    expect(joined!.agent.id).toBe("a-1");
    expect(joined!.snapshot.agents[0]?.id).toBe("a-1");
  });

  it("delivers lifecycle kind through subscribe", async () => {
    const provider = createMockProvider(() => ({
      agents: [toSnapshot({ id: "a-1", status: "running" })],
    }));

    const observer = createObserver({
      workspacePaths: ["/tmp/project"],
      now: () => 1234,
      provider,
    });

    const kinds: string[] = [];
    observer.subscribe((event) => {
      kinds.push(event.change.kind);
      expect(event.agent.id).toBe("a-1");
    });

    await observer.start();
    await vi.waitFor(() => {
      expect(kinds).toContain(WATCH_LIFECYCLE_KIND.joined);
    });
    await observer.stop();
  });

  it("returns snapshot via refreshNow", async () => {
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
    await vi.waitFor(async () => {
      const refreshed = await observer.refreshNow();
      expect(refreshed.agents[0]?.status).toBe("idle");
    });

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

    const seen: Array<{ kind: string; agent: string }> = [];
    observer.subscribe((event) => {
      seen.push({
        kind: event.change.kind,
        agent: event.agent.id,
      });
    });

    await observer.start();
    await vi.waitFor(() => {
      expect(seen.length).toBeGreaterThan(0);
    });
    await observer.refreshNow();
    await observer.stop();

    const left = seen.find((entry) => entry.kind === "left");
    expect(left?.agent).toBe("a-1");
  });
});
