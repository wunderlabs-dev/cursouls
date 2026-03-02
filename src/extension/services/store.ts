import { DEFAULT_SEAT_COUNT } from "../../shared/constants";
import type {
  AgentLifecycleEvent,
  AgentSnapshot,
  SceneFrame,
  SourceHealth,
} from "../../shared/types";
import { createEventMapper, type EventMapper } from "./events";
import { createSeatAllocator, type SeatAllocator } from "./seats";

export interface CafeStoreUpdateInput {
  agents: AgentSnapshot[];
  health?: Partial<SourceHealth>;
}

export interface CafeStore {
  update(input: CafeStoreUpdateInput, at?: number): SceneFrame;
  getFrame(): SceneFrame;
  getLastEvents(): AgentLifecycleEvent[];
  reset(): void;
}

export function createCafeStore(seatCount: number = DEFAULT_SEAT_COUNT): CafeStore {
  const normalizedSeatCount = Math.max(1, Math.floor(seatCount));
  const allocator: SeatAllocator = createSeatAllocator(seatCount);
  const eventMapper: EventMapper = createEventMapper();
  let lastEvents: AgentLifecycleEvent[] = [];
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
    const allocation = allocator.allocate(input.agents);
    lastEvents = eventMapper.map(input.agents, at);

    frame = {
      generatedAt: at,
      seats: allocation.seats,
      queue: allocation.queue,
      health: {
        sourceConnected: input.health?.sourceConnected ?? true,
        sourceLabel:
          input.health?.sourceLabel ??
          input.agents[0]?.source ??
          frame.health.sourceLabel,
        warnings: input.health?.warnings ?? [],
      },
    };

    return frame;
  }

  function getFrame(): SceneFrame {
    return frame;
  }

  function getLastEvents(): AgentLifecycleEvent[] {
    return lastEvents;
  }

  function reset(): void {
    allocator.reset();
    eventMapper.reset();
    lastEvents = [];
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
    getLastEvents,
    reset,
  };
}
