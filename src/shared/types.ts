import type {
  CanonicalAgentKind,
  CanonicalAgentSnapshot,
  CanonicalAgentStatus,
  WatchLifecycleEvent,
  WatchLifecycleKind,
} from "@agentprobe/core";

export const AGENT_STATUS = {
  running: "running",
  idle: "idle",
  completed: "completed",
  error: "error",
} as const;
export type AgentStatus = CanonicalAgentStatus;

export const AGENT_KIND = {
  local: "local",
  remote: "remote",
} as const;
export type AgentKind = CanonicalAgentKind;

export const AGENT_LIFECYCLE_EVENT_KIND = {
  joined: "joined",
  left: "left",
  statusChanged: "statusChanged",
  heartbeat: "heartbeat",
} as const;
export type AgentLifecycleEventType = WatchLifecycleKind;
export type AgentLifecycleEvent = WatchLifecycleEvent<AgentStatus>;

export type AgentSnapshot = CanonicalAgentSnapshot;

export const AGENT_SOURCE_KIND = {
  cursorTranscripts: "cursor-transcripts",
  mock: "mock",
} as const;
export type AgentSourceKind = (typeof AGENT_SOURCE_KIND)[keyof typeof AGENT_SOURCE_KIND];

export interface Actor {
  id: string;
  status: AgentStatus;
  taskSummary: string;
  tableIndex: number;
}

export interface SeatFrame {
  tableIndex: number;
  agent: AgentSnapshot | null;
}

export interface SourceHealth {
  sourceConnected: boolean;
  sourceLabel: string;
  warnings: readonly string[];
}

export interface SceneFrame {
  generatedAt: number;
  seats: readonly SeatFrame[];
  queue: readonly AgentSnapshot[];
  health: SourceHealth;
}
