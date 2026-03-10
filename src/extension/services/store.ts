import { DEFAULT_SEAT_COUNT } from "@shared/constants";
import { AGENT_STATUS, type AgentSnapshot, type SceneFrame, type SourceHealth } from "@shared/types";
import { createSeatAllocator, normalizeSeatCount, type SeatAllocator } from "./seats";

export interface CafeStoreUpdateInput {
  agents: readonly AgentSnapshot[];
  health: SourceHealth;
}

export interface CafeStore {
  update(input: CafeStoreUpdateInput, at?: number): SceneFrame;
  getFrame(): SceneFrame;
  reset(): void;
}

export function createCafeStore(seatCount: number = DEFAULT_SEAT_COUNT): CafeStore {
  const normalizedSeatCount = normalizeSeatCount(seatCount);
  const allocator: SeatAllocator = createSeatAllocator(normalizedSeatCount);
  let frame: SceneFrame = {
    generatedAt: 0,
    seats: new Array(normalizedSeatCount).fill(null).map((_, index) => ({
      tableIndex: index,
      agent: null,
    })),
    queue: [],
    health: {
      sourceConnected: false,
      sourceLabel: "uninitialized",
      warnings: [],
    },
  };

  function update(input: CafeStoreUpdateInput, at: number = Date.now()): SceneFrame {
    const activeAgents = input.agents.filter(isSeatEligibleAgent);
    const allocation = allocator.allocate(activeAgents);

    frame = {
      generatedAt: at,
      seats: allocation.seats,
      queue: allocation.queue,
      health: input.health,
    };

    return frame;
  }

  function getFrame(): SceneFrame {
    return frame;
  }

  function reset(): void {
    allocator.reset();
    frame = {
      generatedAt: 0,
      seats: frame.seats.map((seat) => ({ tableIndex: seat.tableIndex, agent: null })),
      queue: [],
      health: {
        sourceConnected: false,
        sourceLabel: "uninitialized",
        warnings: [],
      },
    };
  }

  return {
    update,
    getFrame,
    reset,
  };
}

function isSeatEligibleAgent(agent: AgentSnapshot): boolean {
  if (agent.status === AGENT_STATUS.running) {
    return true;
  }
  if (agent.status !== AGENT_STATUS.idle) {
    return false;
  }
  return !agent.isSubagent;
}
