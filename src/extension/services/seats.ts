import { DEFAULT_SEAT_COUNT } from "@shared/constants";
import type { AgentSnapshot, SeatFrame } from "@shared/types";

export interface SeatAllocationResult {
  seats: readonly SeatFrame[];
  queue: readonly AgentSnapshot[];
}

export interface SeatAllocator {
  allocate(activeAgents: AgentSnapshot[]): SeatAllocationResult;
  reset(): void;
}

export function normalizeSeatCount(seatCount: number = DEFAULT_SEAT_COUNT): number {
  return Math.max(1, Math.floor(seatCount));
}

export function createSeatAllocator(seatCount: number = DEFAULT_SEAT_COUNT): SeatAllocator {
  const normalizedSeatCount = normalizeSeatCount(seatCount);
  const seatByAgentId = new Map<string, number>();
  const agentIdBySeat: (string | null)[] = Array.from<string | null>({
    length: normalizedSeatCount,
  }).fill(null);

  function findEmptySeat(): number {
    return agentIdBySeat.indexOf(null);
  }

  function allocate(activeAgents: AgentSnapshot[]): SeatAllocationResult {
    const activeById = indexAgentsById(activeAgents);
    freeDepartedSeats(seatByAgentId, agentIdBySeat, activeById);
    const queue = assignUnseatedAgents(activeAgents, seatByAgentId, agentIdBySeat, findEmptySeat);
    const seats = buildSeatFrames(normalizedSeatCount, agentIdBySeat, activeById);
    return { seats, queue };
  }

  return {
    allocate,
    reset(): void {
      seatByAgentId.clear();
      agentIdBySeat.fill(null);
    },
  };
}

function indexAgentsById(agents: AgentSnapshot[]): Map<string, AgentSnapshot> {
  const map = new Map<string, AgentSnapshot>();
  for (const agent of agents) {
    map.set(agent.id, agent);
  }
  return map;
}

function freeDepartedSeats(
  seatByAgentId: Map<string, number>,
  agentIdBySeat: (string | null)[],
  activeById: Map<string, AgentSnapshot>,
): void {
  for (const [agentId, seatIndex] of seatByAgentId.entries()) {
    if (!activeById.has(agentId)) {
      seatByAgentId.delete(agentId);
      agentIdBySeat[seatIndex] = null;
    }
  }
}

function assignUnseatedAgents(
  agents: AgentSnapshot[],
  seatByAgentId: Map<string, number>,
  agentIdBySeat: (string | null)[],
  findEmpty: () => number,
): AgentSnapshot[] {
  const queue: AgentSnapshot[] = [];
  for (const agent of agents) {
    if (seatByAgentId.has(agent.id)) continue;
    const emptySeatIndex = findEmpty();
    if (emptySeatIndex === -1) {
      queue.push(agent);
      continue;
    }
    seatByAgentId.set(agent.id, emptySeatIndex);
    agentIdBySeat[emptySeatIndex] = agent.id;
  }
  return queue;
}

function buildSeatFrames(
  count: number,
  agentIdBySeat: (string | null)[],
  activeById: Map<string, AgentSnapshot>,
): SeatFrame[] {
  const seats: SeatFrame[] = [];
  for (let tableIndex = 0; tableIndex < count; tableIndex += 1) {
    const agentId = agentIdBySeat[tableIndex];
    seats.push({
      tableIndex,
      agent: agentId ? (activeById.get(agentId) ?? null) : null,
    });
  }
  return seats;
}
