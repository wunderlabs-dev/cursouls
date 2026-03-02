import { describe, expect, it } from "vitest";
import { createSeatAllocator } from "@ext/services/seats";

type AgentStatus = "running" | "idle" | "completed" | "error";

interface AgentSnapshot {
  id: string;
  name: string;
  kind: "local" | "remote";
  status: AgentStatus;
  taskSummary: string;
  startedAt?: number;
  updatedAt: number;
  source: "cursor-transcripts" | "mock";
}

function agent(id: string, updatedAt: number): AgentSnapshot {
  return {
    id,
    name: `Agent ${id}`,
    kind: "local",
    status: "running",
    taskSummary: `Task ${id}`,
    updatedAt,
    source: "mock",
  };
}

describe("SeatAllocator", () => {
  it("assigns first six agents to seats and overflows remainder to queue", () => {
    const allocator = createSeatAllocator(6);
    const input = Array.from({ length: 8 }, (_, idx) =>
      agent(String(idx + 1), 1_700_000_000_000 + idx),
    );

    const result = allocator.allocate(input);

    expect(result.seats).toHaveLength(6);
    expect(result.seats.map((seat) => seat.agent?.id)).toEqual(["1", "2", "3", "4", "5", "6"]);
    expect(result.queue.map((entry) => entry.id)).toEqual(["7", "8"]);
  });

  it("keeps sticky seat assignments when agent order changes across polls", () => {
    const allocator = createSeatAllocator(6);

    allocator.allocate([agent("a", 1000), agent("b", 1001), agent("c", 1002)]);
    const second = allocator.allocate([agent("c", 2002), agent("a", 2000), agent("b", 2001)]);

    expect(second.seats.map((seat) => seat.agent?.id).slice(0, 3)).toEqual(["a", "b", "c"]);
  });

  it("frees departed seat and promotes the earliest queued agent", () => {
    const allocator = createSeatAllocator(2);

    allocator.allocate([agent("a", 1000), agent("b", 1001), agent("c", 1002)]);
    const next = allocator.allocate([agent("a", 2000), agent("c", 2002)]);

    expect(next.seats.map((seat) => seat.agent?.id)).toEqual(["a", "c"]);
    expect(next.queue).toHaveLength(0);
  });

  it("restores empty seats after reset", () => {
    const allocator = createSeatAllocator(2);
    allocator.allocate([agent("a", 1000), agent("b", 1001)]);

    allocator.reset();
    const result = allocator.allocate([agent("b", 2001)]);

    expect(result.seats.map((seat) => seat.agent?.id ?? null)).toEqual(["b", null]);
    expect(result.queue).toEqual([]);
  });
});
