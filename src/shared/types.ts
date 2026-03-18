import type { CanonicalAgentStatus } from "@agentprobe/core";

export const AGENT_STATUS = {
  running: "running",
  idle: "idle",
  completed: "completed",
  error: "error",
} as const;
export type AgentStatus = CanonicalAgentStatus;

export interface Actor {
  id: string;
  status: AgentStatus;
  taskSummary: string;
}
