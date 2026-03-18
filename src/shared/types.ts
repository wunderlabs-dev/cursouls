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
