import { DEFAULT_SEAT_COUNT } from "@shared/constants";
import type { AgentSnapshot, SeatFrame } from "@shared/types";

export interface SeatAllocationResult {
  seats: SeatFrame[];
  queue: AgentSnapshot[];
}

export interface SeatAllocator {
  allocate(activeAgents: AgentSnapshot[]): SeatAllocationResult;
  reset(): void;
}

export function createSeatAllocator(
  seatCount: number | { maxTables?: number } = DEFAULT_SEAT_COUNT,
): SeatAllocator {
  const resolvedSeatCount =
    typeof seatCount === "number" ? seatCount : (seatCount.maxTables ?? DEFAULT_SEAT_COUNT);
  const normalizedSeatCount = Math.max(1, Math.floor(resolvedSeatCount));
  const seatByAgentId = new Map<string, number>();
  const agentIdBySeat: Array<string | null> = new Array(normalizedSeatCount).fill(null);

  function allocate(activeAgents: AgentSnapshot[]): SeatAllocationResult {
    const activeById = new Map<string, AgentSnapshot>();
    for (const agent of activeAgents) {
      activeById.set(agent.id, agent);
    }

    // Free seats for agents that have departed.
    for (const [agentId, seatIndex] of seatByAgentId.entries()) {
      if (!activeById.has(agentId)) {
        seatByAgentId.delete(agentId);
        agentIdBySeat[seatIndex] = null;
      }
    }

    const queue: AgentSnapshot[] = [];

    // Keep current seat if already assigned, otherwise allocate earliest empty seat.
    for (const agent of activeAgents) {
      if (seatByAgentId.has(agent.id)) {
        continue;
      }

      const emptySeatIndex = findEmptySeat();
      if (emptySeatIndex === -1) {
        queue.push(agent);
        continue;
      }

      seatByAgentId.set(agent.id, emptySeatIndex);
      agentIdBySeat[emptySeatIndex] = agent.id;
    }

    const seats: SeatFrame[] = [];
    for (let tableIndex = 0; tableIndex < normalizedSeatCount; tableIndex += 1) {
      const agentId = agentIdBySeat[tableIndex];
      seats.push({
        tableIndex,
        agent: agentId ? (activeById.get(agentId) ?? null) : null,
      });
    }

    return { seats, queue };
  }

  function reset(): void {
    seatByAgentId.clear();
    agentIdBySeat.fill(null);
  }

  function findEmptySeat(): number {
    for (let i = 0; i < agentIdBySeat.length; i += 1) {
      if (agentIdBySeat[i] === null) {
        return i;
      }
    }
    return -1;
  }

  return {
    allocate,
    reset,
  };
}
