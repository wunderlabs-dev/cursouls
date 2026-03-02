import { DEFAULT_MOCK_AGENT_COUNT, STATUS_CYCLE } from "../constants";
import type { AgentSnapshot, AgentStatus, AgentSourceReadResult } from "../types";
import type { AgentSource } from "./AgentSource";

const MOCK_NAMES = [
  "Atlas",
  "Byte",
  "Comet",
  "Delta",
  "Echo",
  "Flux",
  "Glyph",
  "Halo",
  "Ion",
  "Juno",
];

const MOCK_TASKS = [
  "Analyzing task",
  "Writing implementation",
  "Running verification",
  "Waiting for input",
  "Reviewing changes",
];

export interface MockAgentSourceOptions {
  agentCount?: number;
  seedTick?: number;
  sourceLabel?: string;
}

export class MockAgentSource implements AgentSource {
  public readonly sourceKind = "mock" as const;

  private readonly agentCount: number;
  private readonly sourceLabel: string;
  private tick: number;
  private connected = false;

  public constructor(options: MockAgentSourceOptions = {}) {
    this.agentCount = Math.max(1, options.agentCount ?? DEFAULT_MOCK_AGENT_COUNT);
    this.tick = Math.max(0, options.seedTick ?? 0);
    this.sourceLabel = options.sourceLabel ?? "Mock Source";
  }

  public connect(): void {
    this.connected = true;
  }

  public disconnect(): void {
    this.connected = false;
  }

  public readSnapshot(now: number = Date.now()): AgentSourceReadResult {
    if (!this.connected) {
      return {
        agents: [],
        connected: false,
        sourceLabel: this.sourceLabel,
        warnings: ["Mock source is disconnected."],
      };
    }

    const agents: AgentSnapshot[] = [];
    for (let i = 0; i < this.agentCount; i += 1) {
      const status = this.resolveStatus(i);
      const id = `mock-agent-${i + 1}`;
      agents.push({
        id,
        name: MOCK_NAMES[i % MOCK_NAMES.length] ?? `Agent ${i + 1}`,
        kind: "local",
        status,
        taskSummary: MOCK_TASKS[(this.tick + i) % MOCK_TASKS.length] ?? "Idle",
        startedAt: now - (i + 1) * 60_000,
        updatedAt: now - ((this.tick + i) % 3) * 1_000,
        source: "mock",
      });
    }

    this.tick += 1;
    return {
      agents,
      connected: true,
      sourceLabel: this.sourceLabel,
      warnings: [],
    };
  }

  private resolveStatus(index: number): AgentStatus {
    const cycleIndex = (this.tick + index) % STATUS_CYCLE.length;
    return STATUS_CYCLE[cycleIndex] ?? "idle";
  }
}
