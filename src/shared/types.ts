export type AgentStatus = "running" | "idle" | "completed" | "error";

export type AgentKind = "local" | "remote";

export type AgentSourceKind = "cursor-transcripts" | "mock";

export interface AgentSnapshot {
  id: string;
  name: string;
  kind: AgentKind;
  status: AgentStatus;
  taskSummary: string;
  startedAt?: number;
  updatedAt: number;
  source: AgentSourceKind;
}

export interface SeatFrame {
  tableIndex: number;
  agent: AgentSnapshot | null;
}

export interface SourceHealth {
  sourceConnected: boolean;
  sourceLabel: string;
  warnings: string[];
}

export interface SceneFrame {
  generatedAt: number;
  seats: SeatFrame[];
  queue: AgentSnapshot[];
  health: SourceHealth;
}

export interface AgentSourceReadResult {
  agents: AgentSnapshot[];
  connected: boolean;
  sourceLabel: string;
  warnings: string[];
}

export type AgentLifecycleEventType = "joined" | "left" | "status-changed" | "heartbeat";

export interface AgentLifecycleEvent {
  type: AgentLifecycleEventType;
  agentId: string;
  at: number;
  previousStatus?: AgentStatus;
  nextStatus?: AgentStatus;
}
