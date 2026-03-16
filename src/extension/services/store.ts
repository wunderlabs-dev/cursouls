import { DEFAULT_SEAT_COUNT } from "@shared/constants";
import {
  AGENT_STATUS,
  type AgentSnapshot,
  type SceneFrame,
  type SourceHealth,
} from "@shared/types";
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

const CONNECTING_LABEL = "connecting…";

export function createCafeStore(seatCount: number = DEFAULT_SEAT_COUNT): CafeStore {
  const normalizedSeatCount = normalizeSeatCount(seatCount);
  const allocator: SeatAllocator = createSeatAllocator(normalizedSeatCount);
  let frame: SceneFrame = createEmptyFrame(normalizedSeatCount);

  return {
    update(input: CafeStoreUpdateInput, at: number = Date.now()): SceneFrame {
      const activeAgents = input.agents.filter(isSeatEligibleAgent);
      const allocation = allocator.allocate(activeAgents);
      frame = {
        generatedAt: at,
        seats: allocation.seats,
        queue: allocation.queue,
        health: input.health,
      };
      return frame;
    },
    getFrame(): SceneFrame {
      return frame;
    },
    reset(): void {
      allocator.reset();
      frame = createEmptyFrame(frame.seats.length);
    },
  };
}

function createEmptyFrame(seatCount: number): SceneFrame {
  return {
    generatedAt: 0,
    seats: Array.from({ length: seatCount }, (_, index) => ({ tableIndex: index, agent: null })),
    queue: [],
    health: { sourceConnected: false, sourceLabel: CONNECTING_LABEL, warnings: [] },
  };
}

function isSeatEligibleAgent(agent: AgentSnapshot): boolean {
  if (agent.status === AGENT_STATUS.running) return true;
  if (agent.status !== AGENT_STATUS.idle) return false;
  return !agent.isSubagent;
}
