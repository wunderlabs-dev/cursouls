import { describe, expect, it, vi } from "vitest";
import type { AgentSourceReadResult, SceneFrame } from "../../src/types";
import { PollingController, type Scheduler } from "../../src/state/PollingController";

interface ScheduledTask {
  callback: () => void;
  delayMs: number;
  cancelled: boolean;
}

class ManualScheduler implements Scheduler {
  public readonly tasks: ScheduledTask[] = [];

  public setTimeout(callback: () => void, delayMs: number): ScheduledTask {
    const task: ScheduledTask = { callback, delayMs, cancelled: false };
    this.tasks.push(task);
    return task;
  }

  public clearTimeout(handle: ScheduledTask): void {
    handle.cancelled = true;
  }

  public async runNext(): Promise<void> {
    const task = this.tasks.shift();
    if (!task || task.cancelled) {
      return;
    }
    task.callback();
    await Promise.resolve();
    await Promise.resolve();
  }
}

function createReadResult(): AgentSourceReadResult {
  return {
    agents: [
      {
        id: "agent-1",
        name: "Ada",
        kind: "local",
        status: "running",
        taskSummary: "Poll",
        updatedAt: 1_700_000_000_100,
        source: "mock",
      },
    ],
    connected: true,
    sourceLabel: "mock",
    warnings: [],
  };
}

describe("PollingController", () => {
  it("connects, polls, emits frame, and disconnects on stop", async () => {
    const scheduler = new ManualScheduler();
    const source = {
      sourceKind: "mock" as const,
      connect: vi.fn(),
      disconnect: vi.fn(),
      readSnapshot: vi.fn().mockReturnValue(createReadResult()),
    };
    const frame: SceneFrame = {
      generatedAt: 1234,
      seats: [{ tableIndex: 0, agent: createReadResult().agents[0] }],
      queue: [],
      health: { sourceConnected: true, sourceLabel: "mock", warnings: [] },
    };
    const store = {
      update: vi.fn().mockReturnValue(frame),
    };
    const now = vi.fn().mockReturnValue(1234);

    const controller = new PollingController(source, store as never, {
      refreshMs: 1000,
      scheduler,
      now,
    });
    const onFrame = vi.fn();
    controller.onFrame(onFrame);

    await controller.start();
    expect(source.connect).toHaveBeenCalledTimes(1);
    expect([0, 1000]).toContain(scheduler.tasks[0]?.delayMs ?? 0);
    if (source.readSnapshot.mock.calls.length === 0) {
      await scheduler.runNext();
    }

    expect(source.readSnapshot).toHaveBeenCalledWith(1234);
    expect(store.update).toHaveBeenCalledWith(
      {
        agents: createReadResult().agents,
        health: { sourceConnected: true, sourceLabel: "mock", warnings: [] },
      },
      1234,
    );
    expect(onFrame).toHaveBeenCalledWith(frame);
    expect(scheduler.tasks.some((task) => task.delayMs === 1000)).toBe(true);

    await controller.stop();
    expect(source.disconnect).toHaveBeenCalledTimes(1);
  });

  it("backs off after errors and emits onError callbacks", async () => {
    const scheduler = new ManualScheduler();
    const boom = new Error("boom");
    const source = {
      sourceKind: "mock" as const,
      connect: vi.fn(),
      disconnect: vi.fn(),
      readSnapshot: vi.fn().mockRejectedValue(boom),
    };
    const store = {
      update: vi.fn(),
    };

    const controller = new PollingController(source, store as never, {
      refreshMs: 1000,
      backoffMultiplier: 2,
      maxBackoffMs: 4000,
      scheduler,
    });
    const onError = vi.fn();
    controller.onError(onError);

    await controller.start();
    await scheduler.runNext();

    expect(onError).toHaveBeenCalledWith(boom);
    expect(scheduler.tasks.map((task) => task.delayMs)).toEqual([2000]);

    await scheduler.runNext();
    expect(scheduler.tasks.map((task) => task.delayMs)).toEqual([4000]);
  });
});
