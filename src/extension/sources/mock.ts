import { DEFAULT_MOCK_AGENT_COUNT, STATUS_CYCLE } from "../../shared/constants";
import type { AgentSnapshot, AgentStatus, AgentSourceReadResult } from "../../shared/types";
import type { AgentSource } from "./source";

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

export interface MockAgentSource extends AgentSource {
  readonly sourceKind: "mock";
}

export function createMockAgentSource(options: MockAgentSourceOptions = {}): MockAgentSource {
  const agentCount = Math.max(1, options.agentCount ?? DEFAULT_MOCK_AGENT_COUNT);
  const sourceLabel = options.sourceLabel ?? "Mock Source";
  let tick = Math.max(0, options.seedTick ?? 0);
  let connected = false;

  function connect(): void {
    connected = true;
  }

  function disconnect(): void {
    connected = false;
  }

  function readSnapshot(now: number = Date.now()): AgentSourceReadResult {
    if (!connected) {
      return {
        agents: [],
        connected: false,
        sourceLabel,
        warnings: ["Mock source is disconnected."],
      };
    }

    const agents: AgentSnapshot[] = [];
    for (let i = 0; i < agentCount; i += 1) {
      const status = resolveStatus(i);
      const id = `mock-agent-${i + 1}`;
      agents.push({
        id,
        name: MOCK_NAMES[i % MOCK_NAMES.length] ?? `Agent ${i + 1}`,
        kind: "local",
        status,
        taskSummary: MOCK_TASKS[(tick + i) % MOCK_TASKS.length] ?? "Idle",
        startedAt: now - (i + 1) * 60_000,
        updatedAt: now - ((tick + i) % 3) * 1_000,
        source: "mock",
      });
    }

    tick += 1;
    return {
      agents,
      connected: true,
      sourceLabel,
      warnings: [],
    };
  }

  function resolveStatus(index: number): AgentStatus {
    const cycleIndex = (tick + index) % STATUS_CYCLE.length;
    return STATUS_CYCLE[cycleIndex] ?? "idle";
  }

  return {
    sourceKind: "mock",
    connect,
    disconnect,
    readSnapshot,
  };
}
