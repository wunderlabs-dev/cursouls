import { DEFAULT_SEAT_COUNT } from "../constants";
import type { AgentSnapshot, SeatFrame } from "../types";

export interface SeatAllocationResult {
  seats: SeatFrame[];
  queue: AgentSnapshot[];
}

export class SeatAllocator {
  private readonly seatCount: number;
  private readonly seatByAgentId = new Map<string, number>();
  private readonly agentIdBySeat: Array<string | null>;

  public constructor(seatCount: number | { maxTables?: number } = DEFAULT_SEAT_COUNT) {
    const resolvedSeatCount =
      typeof seatCount === "number" ? seatCount : seatCount.maxTables ?? DEFAULT_SEAT_COUNT;
    this.seatCount = Math.max(1, Math.floor(resolvedSeatCount));
    this.agentIdBySeat = new Array(this.seatCount).fill(null);
  }

  public allocate(activeAgents: AgentSnapshot[]): SeatAllocationResult {
    const activeById = new Map<string, AgentSnapshot>();
    for (const agent of activeAgents) {
      activeById.set(agent.id, agent);
    }

    // Free seats for agents that have departed.
    for (const [agentId, seatIndex] of this.seatByAgentId.entries()) {
      if (!activeById.has(agentId)) {
        this.seatByAgentId.delete(agentId);
        this.agentIdBySeat[seatIndex] = null;
      }
    }

    const queue: AgentSnapshot[] = [];

    // Keep current seat if already assigned, otherwise allocate earliest empty seat.
    for (const agent of activeAgents) {
      if (this.seatByAgentId.has(agent.id)) {
        continue;
      }

      const emptySeatIndex = this.findEmptySeat();
      if (emptySeatIndex === -1) {
        queue.push(agent);
        continue;
      }

      this.seatByAgentId.set(agent.id, emptySeatIndex);
      this.agentIdBySeat[emptySeatIndex] = agent.id;
    }

    const seats: SeatFrame[] = [];
    for (let tableIndex = 0; tableIndex < this.seatCount; tableIndex += 1) {
      const agentId = this.agentIdBySeat[tableIndex];
      seats.push({
        tableIndex,
        agent: agentId ? (activeById.get(agentId) ?? null) : null,
      });
    }

    return { seats, queue };
  }

  public reset(): void {
    this.seatByAgentId.clear();
    this.agentIdBySeat.fill(null);
  }

  private findEmptySeat(): number {
    for (let i = 0; i < this.agentIdBySeat.length; i += 1) {
      if (this.agentIdBySeat[i] === null) {
        return i;
      }
    }
    return -1;
  }
}
