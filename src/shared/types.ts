export const AGENT_STATUS = {
  running: "running",
  idle: "idle",
  completed: "completed",
  error: "error",
} as const;

export type AgentStatus = (typeof AGENT_STATUS)[keyof typeof AGENT_STATUS];

export interface AgentSnapshot {
  id: string;
  status: AgentStatus;
  taskSummary: string;
}

export const EVENT_KIND = {
  joined: "joined",
  statusChanged: "statusChanged",
  left: "left",
} as const;

export type EventKind = (typeof EVENT_KIND)[keyof typeof EVENT_KIND];

export interface AgentEvent {
  kind: EventKind;
  agent: AgentSnapshot;
}
