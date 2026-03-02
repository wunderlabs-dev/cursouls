import { DEFAULT_SEAT_COUNT } from "../constants";
import type {
  AgentLifecycleEvent,
  AgentSnapshot,
  SceneFrame,
  SourceHealth,
} from "../types";
import { EventMapper } from "./EventMapper";
import { SeatAllocator } from "./SeatAllocator";

export interface CafeStoreUpdateInput {
  agents: AgentSnapshot[];
  health?: Partial<SourceHealth>;
}

export class CafeStore {
  private readonly allocator: SeatAllocator;
  private readonly eventMapper: EventMapper;
  private lastEvents: AgentLifecycleEvent[] = [];
  private frame: SceneFrame;

  public constructor(seatCount: number = DEFAULT_SEAT_COUNT) {
    this.allocator = new SeatAllocator(seatCount);
    this.eventMapper = new EventMapper();
    this.frame = {
      generatedAt: 0,
      seats: new Array(Math.max(1, Math.floor(seatCount))).fill(null).map((_, index) => ({
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
  }

  public update(input: CafeStoreUpdateInput, at: number = Date.now()): SceneFrame {
    const allocation = this.allocator.allocate(input.agents);
    this.lastEvents = this.eventMapper.map(input.agents, at);

    this.frame = {
      generatedAt: at,
      seats: allocation.seats,
      queue: allocation.queue,
      health: {
        sourceConnected: input.health?.sourceConnected ?? true,
        sourceLabel:
          input.health?.sourceLabel ??
          input.agents[0]?.source ??
          this.frame.health.sourceLabel,
        warnings: input.health?.warnings ?? [],
      },
    };

    return this.frame;
  }

  public getFrame(): SceneFrame {
    return this.frame;
  }

  public getLastEvents(): AgentLifecycleEvent[] {
    return this.lastEvents;
  }

  public reset(): void {
    this.allocator.reset();
    this.eventMapper.reset();
    this.lastEvents = [];
    this.frame = {
      generatedAt: 0,
      seats: this.frame.seats.map((seat) => ({ tableIndex: seat.tableIndex, agent: null })),
      queue: [],
      health: {
        sourceConnected: false,
        sourceLabel: "uninitialized",
        warnings: [],
      },
    };
  }
}
